import { get, run } from './db'
import { getSetting } from './ai'
import { emitAgentEvent } from './events'
import { productSpec, PRODUCT_TYPES, type ProductSpec } from './product-specs'
import { designPng, isDarkDesign, renderPrintFile, savePrintFile, signedFileUrl } from './print-files'
import {
  isPrintfulConnected, getCatalogProduct, getPrintfiles, addFile, getFile, createMockupTask, getMockupTask,
} from '@/integrations/printful/client'
import {
  isEtsyConnected, createDraftListing, setListingState, uploadListingImage, updateListingInventory,
  getTaxonomyNodes, getShippingProfiles, getReadinessStates, createReadinessState, getProductionPartners,
  type TaxonomyNode,
} from '@/integrations/etsy/client'

// After a design is approved: print files to Printful, mockups, then a listing on Etsy.
// Every finished step is saved in products.fulfillment, so a retry continues where it stopped.

interface ProductRow {
  id: string
  shop_id: string
  title: string
  description: string | null
  design_url: string | null
  category: string | null
  tags: string | null
  price: number
  fulfillment: string | null
}

export interface Fulfillment {
  printfulProductId: number
  placement: string
  color: string | null
  // Print file per Printful print area; fileId once Printful has it in its file library
  printfiles: Record<string, { width: number; height: number; file: string; fileId?: number }>
  // sku on Etsy is "PF-<variantId>", which is how an Etsy order maps back to a Printful variant
  variants: { variantId: number; size: string; label: string; cost: number; price: number; printfileId: number }[]
  mockups?: string[]
  readinessStateId?: number
  listingId?: number
  imagesUploaded?: number
  inventoryDone?: boolean
}

const MAX_IMAGES = 6
// Custom variation property; Etsy names it after property_name and wants empty value_ids for new values
const SIZE_PROPERTY = 513

const running = (globalThis as unknown as { __fynnPublishing?: Set<string> }).__fynnPublishing ??= new Set()

export const isPublishing = (productId: string) => running.has(productId)

// Starts in the background; false when this product is already being published
export function startPublish(productId: string, origin: string): boolean {
  if (running.has(productId)) return false
  const product = get<ProductRow>('SELECT * FROM products WHERE id = ?', productId)
  if (!product) return false

  running.add(productId)
  run("UPDATE products SET publish_status = 'publishing', publish_error = NULL, updated_at = datetime('now') WHERE id = ?", productId)
  publish(product, origin)
    .catch(err => {
      const message = err instanceof Error ? err.message : String(err)
      run("UPDATE products SET publish_status = 'failed', publish_step = NULL, publish_error = ?, updated_at = datetime('now') WHERE id = ?", message, productId)
      log(product.shop_id, `Kon "${product.title}" niet op Etsy zetten: ${message}`, 'error')
    })
    .finally(() => running.delete(productId))
  return true
}

async function publish(product: ProductRow, origin: string) {
  const spec = productSpec(product.category)
  if (!spec) throw new Error(`Producttype "${product.category}" wordt nog niet automatisch gemaakt. Dat kan wel voor: ${PRODUCT_TYPES.join(', ')}.`)
  if (!isPrintfulConnected()) throw new Error('Printful is niet gekoppeld. Vul je Printful-sleutel in bij Instellingen en probeer opnieuw.')
  if (!isEtsyConnected()) throw new Error('Etsy is niet gekoppeld. Koppel je Etsy-shop bij Instellingen en probeer opnieuw.')
  if (/\/\/(localhost|127\.0\.0\.1|\[::1\])(:|$)/.test(origin)) {
    throw new Error(`Printful kan de printbestanden niet ophalen van ${origin}. Keur goed in de online app.`)
  }
  const designFile = product.design_url?.split('/').pop()
  if (!designFile) throw new Error('Het ontwerpbestand ontbreekt')

  log(product.shop_id, `Zet "${product.title}" op Printful en Etsy...`, 'thinking')
  let state: Fulfillment | null = product.fulfillment ? JSON.parse(product.fulfillment) : null
  const save = () => run('UPDATE products SET fulfillment = ? WHERE id = ?', JSON.stringify(state), product.id)
  const step = (name: string) => run('UPDATE products SET publish_step = ? WHERE id = ?', name, product.id)

  if (!state) {
    step('Printbestanden maken')
    state = await preparePrintFiles(product, spec, designFile)
    save()
    const prices = state.variants.map(v => v.price)
    run('UPDATE products SET base_cost = ?, price = ? WHERE id = ?',
      Math.min(...state.variants.map(v => v.cost)), Math.min(...prices), product.id)
  }

  step('Printbestanden naar Printful sturen')
  for (const [id, pf] of Object.entries(state.printfiles)) {
    if (pf.fileId) continue
    pf.fileId = await sendToPrintful(signedFileUrl(origin, pf.file), `${product.title.slice(0, 60)} (${id}).png`)
    save()
  }

  if (!state.mockups?.length) {
    step('Mockups maken')
    state.mockups = await makeMockups(state, origin)
    save()
  }

  if (!state.listingId) {
    step('Etsy-listing aanmaken')
    state.readinessStateId = await readinessState()
    const listing = await createDraftListing({
      title: etsyTitle(product.title),
      description: [product.description, spec.details, 'Made to order: printed just for you after you order, so please allow a few days before it ships.']
        .filter(Boolean).join('\n\n'),
      price: Math.min(...state.variants.map(v => v.price)),
      quantity: 999,
      taxonomy_id: await taxonomyId(spec, product.category!),
      who_made: 'i_did',
      when_made: 'made_to_order',
      is_supply: false,
      type: 'physical',
      shipping_profile_id: await shippingProfile(),
      readiness_state_id: state.readinessStateId,
      tags: etsyTags(product.tags),
      production_partner_ids: await printfulPartner(),
    })
    state.listingId = listing.listing_id
    save()
    run('UPDATE products SET etsy_listing_id = ? WHERE id = ?', String(listing.listing_id), product.id)
  }

  step("Foto's uploaden")
  const images = state.mockups.slice(0, MAX_IMAGES)
  for (let i = state.imagesUploaded ?? 0; i < images.length; i++) {
    const res = await fetch(images[i], { signal: AbortSignal.timeout(60_000) })
    if (!res.ok) {
      // Printful's mockup links don't last forever; make new ones on the next try
      state.mockups = []
      save()
      throw new Error(`Mockup ${i + 1} ophalen bij Printful mislukte (${res.status}). Probeer opnieuw.`)
    }
    await uploadListingImage(state.listingId, await res.blob(), `mockup-${i + 1}.jpg`, i + 1, product.title)
    state.imagesUploaded = i + 1
    save()
  }

  if (!state.inventoryDone) {
    step('Maten en prijzen instellen')
    await setInventory(state)
    state.inventoryDone = true
    save()
  }

  const live = getSetting('etsy_publish_live') === '1'
  if (live) {
    step('Live zetten')
    await setListingState(state.listingId, 'active')
  }
  run(
    `UPDATE products SET status = ?, publish_status = ?, publish_step = NULL, publish_error = NULL, updated_at = datetime('now') WHERE id = ?`,
    live ? 'listed' : 'draft', live ? 'etsy_live' : 'etsy_draft', product.id
  )
  log(product.shop_id, live
    ? `"${product.title}" staat live op Etsy`
    : `"${product.title}" staat als concept op Etsy. Controleer en publiceer hem daar.`, 'success')
}

// ─── Printful ─────────────────────────────────────────────

async function preparePrintFiles(product: ProductRow, spec: ProductSpec, designFile: string): Promise<Fulfillment> {
  const png = await designPng(designFile)
  const color = spec.colors ? ((await isDarkDesign(png)) ? spec.colors.light : spec.colors.dark) : null
  const [{ variants }, printfiles] = await Promise.all([getCatalogProduct(spec.printfulId), getPrintfiles(spec.printfulId)])

  const chosen = spec.sizes
    .map(size => variants.find(v => v.size === size && v.in_stock && (!color || v.color === color)))
    .flatMap(v => {
      const printfileId = v && printfiles.variant_printfiles.find(p => p.variant_id === v.id)?.placements[spec.placement]
      return v && printfileId ? [{ variant: v, printfileId }] : []
    })
  if (chosen.length === 0) throw new Error(`Printful heeft nu geen leverbare varianten voor ${product.category}${color ? ` in ${color}` : ''}`)

  const files: Fulfillment['printfiles'] = {}
  for (const printfileId of new Set(chosen.map(c => c.printfileId))) {
    const area = printfiles.printfiles.find(p => p.printfile_id === printfileId)
    if (!area) throw new Error(`Printful gaf geen printvlak ${printfileId} terug`)
    const data = await renderPrintFile(png, area.width, area.height, spec.layout)
    files[printfileId] = { width: area.width, height: area.height, file: savePrintFile(product.id, printfileId, data) }
  }

  // Bigger sizes cost more at Printful, so they cost the same amount more on Etsy
  const costs = chosen.map(c => parseFloat(c.variant.price))
  const minCost = Math.min(...costs)
  const base = Math.max(product.price || 0, minCost * 2)
  return {
    printfulProductId: spec.printfulId,
    placement: spec.placement,
    color,
    printfiles: files,
    variants: chosen.map((c, i) => ({
      variantId: c.variant.id,
      size: c.variant.size,
      label: sizeLabel(c.variant.size),
      cost: costs[i],
      price: Math.ceil(base + costs[i] - minCost) - 0.01,
      printfileId: c.printfileId,
    })),
  }
}

// Etsy values may not contain parentheses; inch marks and × are written out
function sizeLabel(size: string): string {
  return size.includes('″') ? `${size.replace(/″/g, '').replace(/×/g, 'x')} in` : size.replace(/[()]/g, '')
}

async function sendToPrintful(url: string, filename: string): Promise<number> {
  const file = await addFile({ url, filename })
  // Printful fetches the file in the background; wait so a bad link shows up here, not on the first order
  for (let i = 0; i < 30; i++) {
    const current = i === 0 ? file : await getFile(file.id)
    if (current.status === 'ok') return file.id
    if (current.status === 'failed') throw new Error('Printful kon het printbestand niet downloaden. Is de app online bereikbaar?')
    await sleep(3000)
  }
  throw new Error('Printful bleef te lang bezig met het printbestand. Probeer het later opnieuw.')
}

async function makeMockups(state: Fulfillment, origin: string): Promise<string[]> {
  const main = state.variants[0]
  const area = state.printfiles[main.printfileId]
  const task = await createMockupTask(state.printfulProductId, {
    variant_ids: [main.variantId],
    format: 'jpg',
    files: [{
      placement: state.placement,
      image_url: signedFileUrl(origin, area.file),
      position: { area_width: area.width, area_height: area.height, width: area.width, height: area.height, top: 0, left: 0 },
    }],
  })
  for (let i = 0; i < 60; i++) {
    await sleep(4000)
    const result = await getMockupTask(task.task_key)
    if (result.status === 'completed') {
      const urls = (result.mockups ?? []).flatMap(m => [m.mockup_url, ...(m.extra ?? []).map(e => e.url)])
      if (urls.length === 0) throw new Error('Printful gaf geen mockups terug')
      return [...new Set(urls)]
    }
    if (result.status === 'failed') throw new Error(`Printful kon geen mockups maken: ${result.error ?? 'onbekende fout'}`)
  }
  throw new Error('Printful bleef te lang bezig met de mockups. Probeer het later opnieuw.')
}

// ─── Etsy ─────────────────────────────────────────────────

const taxonomyCache = globalThis as unknown as { __fynnTaxonomy?: { at: number; nodes: { id: number; name: string; path: string }[] } }

async function taxonomyId(spec: ProductSpec, category: string): Promise<number> {
  let cache = taxonomyCache.__fynnTaxonomy
  if (!cache || Date.now() - cache.at > 24 * 60 * 60 * 1000) {
    const flat: { id: number; name: string; path: string }[] = []
    const walk = (nodes: TaxonomyNode[], path: string) => {
      for (const node of nodes) {
        const full = path ? `${path} > ${node.name}` : node.name
        flat.push({ id: node.id, name: node.name, path: full })
        walk(node.children ?? [], full)
      }
    }
    walk(await getTaxonomyNodes(), '')
    cache = taxonomyCache.__fynnTaxonomy = { at: Date.now(), nodes: flat }
  }
  for (const name of spec.taxonomy) {
    const matches = cache.nodes.filter(n => n.name.toLowerCase() === name.toLowerCase())
    const best = matches.find(n => spec.prefer && n.path.toLowerCase().includes(spec.prefer)) ?? matches[0]
    if (best) return best.id
  }
  throw new Error(`Geen Etsy-categorie gevonden voor ${category} (gezocht naar: ${spec.taxonomy.join(', ')})`)
}

async function shippingProfile(): Promise<number> {
  const profiles = await getShippingProfiles()
  const chosen = getSetting('etsy_shipping_profile_id')
  const match = profiles.find(p => String(p.shipping_profile_id) === chosen)
    ?? profiles.find(p => /printful/i.test(p.title))
    ?? profiles[0]
  if (!match) throw new Error('Je Etsy-shop heeft nog geen verzendprofiel. Maak er een aan in Etsy (Instellingen > Verzendinstellingen) en probeer opnieuw.')
  return match.shipping_profile_id
}

// The shop's "made to order" processing profile, created once when there is none
async function readinessState(): Promise<number> {
  const states = await getReadinessStates()
  const made = states.find(s => s.readiness_state === 'made_to_order')
  if (made) return made.readiness_state_id
  return (await createReadinessState(3, 7)).readiness_state_id
}

// Etsy asks print-on-demand sellers to name their production partner; used when the shop has added Printful
async function printfulPartner(): Promise<number[] | undefined> {
  const partners = await getProductionPartners().catch(() => [])
  const printful = partners.find(p => /printful/i.test(p.partner_name))
  return printful ? [printful.production_partner_id] : undefined
}

async function setInventory(state: Fulfillment) {
  const multiple = state.variants.length > 1
  const varyingPrice = new Set(state.variants.map(v => v.price)).size > 1
  await updateListingInventory(state.listingId!, {
    products: state.variants.map(v => ({
      sku: `PF-${v.variantId}`,
      property_values: multiple ? [{ property_id: SIZE_PROPERTY, property_name: 'Size', value_ids: [], values: [v.label] }] : [],
      offerings: [{ price: v.price, quantity: 999, is_enabled: true, readiness_state_id: state.readinessStateId! }],
    })),
    price_on_property: varyingPrice ? [SIZE_PROPERTY] : [],
    quantity_on_property: [],
    sku_on_property: multiple ? [SIZE_PROPERTY] : [],
    readiness_state_on_property: [],
  })
}

// Etsy allows only letters, numbers, punctuation and spaces, with %, : and & at most once
function etsyTitle(title: string): string {
  let clean = title.replace(/[^\p{L}\p{N}\p{P}\p{Sm}\p{Zs}]/gu, '')
  for (const once of ['%', ':', '&']) {
    const first = clean.indexOf(once)
    if (first >= 0) clean = clean.slice(0, first + 1) + clean.slice(first + 1).split(once).join('')
  }
  return clean.replace(/\s+/g, ' ').trim().slice(0, 140).trim()
}

// Etsy tags: at most 13, each at most 20 characters; longer ones are dropped, not cut mid-phrase
function etsyTags(raw: string | null): string[] {
  let tags: unknown = []
  try { tags = JSON.parse(raw || '[]') } catch { /* no tags */ }
  const seen = new Set<string>()
  return (Array.isArray(tags) ? tags : [])
    .map(t => String(t).replace(/[^\p{L}\p{Nd}\p{Zs}\-'™©®]/gu, '').replace(/\s+/g, ' ').trim())
    .filter(t => t && t.length <= 20 && !seen.has(t.toLowerCase()) && seen.add(t.toLowerCase()))
    .slice(0, 13)
}

// ─── Helpers ──────────────────────────────────────────────

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

// Shown in the activity feed as Marcus, the listing agent
function log(shopId: string, message: string, type: 'thinking' | 'success' | 'error') {
  const agent = get<{ id: string }>("SELECT id FROM agents WHERE shop_id = ? AND template_type = 'listing' LIMIT 1", shopId)
  if (!agent) return
  run('INSERT INTO activity_log (shop_id, agent_id, message, type, demo) VALUES (?, ?, ?, ?, 0)', shopId, agent.id, message, type)
  emitAgentEvent({
    shopId, agentId: agent.id, type: 'activity',
    data: { message, activityType: type }, timestamp: new Date().toISOString(),
  })
}
