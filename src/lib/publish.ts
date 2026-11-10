import { get, run } from './db'
import sharp from 'sharp'
import { askAi, getSetting, isAiEnabled, setSetting } from './ai'
import { autoFixEnabled, queuePublishFix } from './agent-queue'
import { emitAgentEvent } from './events'
import { productSpec, PRODUCT_TYPES, type ProductSpec } from './product-specs'
import { designPng, isDarkDesign, renderPrintFile, savePrintFile, signedFileUrl } from './print-files'
import { slideshowVideo } from './listing-video'
import { cleanTags, etsyTitle } from './etsy-text'
import {
  isPrintfulConnected, getCatalogProduct, getPrintfiles, addFile, getFile, createMockupTask, getMockupTask,
} from '@/integrations/printful/client'
import {
  isEtsyConnected, createDraftListing, setListingState, uploadListingImage, updateListingInventory,
  getTaxonomyNodes, getShippingProfiles, getReadinessStates, createReadinessState, getProductionPartners,
  getTaxonomyProperties, updateListingProperty, updateListingFields, uploadListingVideo,
  type TaxonomyNode, type TaxonomyProperty,
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
  taxonomyId?: number
  imagesUploaded?: number
  // Etsy refused more photos (older 10-photo limit), so the rest is skipped
  imagesCapped?: boolean
  // Attributes and video are extras: when they fail the listing still goes up, so these mean "tried"
  attributesDone?: boolean
  attributesFilled?: number
  videoDone?: boolean
  hasVideo?: boolean
  inventoryDone?: boolean
}

// Etsy takes up to 20 photos; shops still on the older limit of 10 get the first 10
const MAX_IMAGES = 20
const OLD_IMAGE_LIMIT = 10
// Where the close-up of the design goes between the mockups, so it is also among the first 10
const DESIGN_PHOTO_AT = 4
const DESIGN_PHOTO = 'design'
// Custom variation property; Etsy names it after property_name and wants empty value_ids for new values
const SIZE_PROPERTY = 513

const running = (globalThis as unknown as { __fynnPublishing?: Set<string> }).__fynnPublishing ??= new Set()

export const isPublishing = (productId: string) => running.has(productId)

// Starts in the background; false when this product is already being published.
// Used when the owner approves or retries, so automatic fixes may try again after this attempt.
export function startPublish(productId: string, origin: string): boolean {
  run('UPDATE products SET auto_fixes = 0 WHERE id = ?', productId)
  const attempt = begin(productId, origin)
  if (!attempt) return false
  attempt.catch(() => { /* recorded on the product */ })
  return true
}

// For Marcus' fix task: the same, but waits and throws when it fails
export async function publishAndWait(productId: string, origin?: string): Promise<void> {
  const attempt = begin(productId, origin ?? getSetting('public_origin') ?? '')
  if (!attempt) throw new Error('Dit product wordt al op Etsy gezet')
  await attempt
}

function begin(productId: string, origin: string): Promise<void> | null {
  if (running.has(productId)) return null
  const product = get<ProductRow & { auto_fixes: number }>('SELECT * FROM products WHERE id = ?', productId)
  if (!product) return null
  if (!origin) {
    const message = 'Het online adres van de app is nog onbekend. Keur het product één keer goed in de online app.'
    run("UPDATE products SET publish_status = 'failed', publish_error = ?, error_dismissed = 0, updated_at = datetime('now') WHERE id = ?", message, productId)
    return Promise.reject(new Error(message))
  }

  running.add(productId)
  // Automatic fixes have no request to read the public address from
  setSetting('public_origin', origin)
  run("UPDATE products SET publish_status = 'publishing', publish_error = NULL, error_dismissed = 0, updated_at = datetime('now') WHERE id = ?", productId)
  return publish(product, origin)
    .catch(err => {
      const message = err instanceof Error ? err.message : String(err)
      run("UPDATE products SET publish_status = 'failed', publish_step = NULL, publish_error = ?, updated_at = datetime('now') WHERE id = ?", message, productId)
      log(product.shop_id, `Kon "${product.title}" niet op Etsy zetten: ${message}`, 'error')
      // One automatic try per owner attempt; after that it waits on Fouten
      if (autoFixEnabled() && product.auto_fixes < 1 && queuePublishFix(product.shop_id, productId, product.title, { auto: true })) {
        run('UPDATE products SET auto_fixes = auto_fixes + 1 WHERE id = ?', productId)
      }
      throw err
    })
    .finally(() => running.delete(productId))
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
    state.taxonomyId = await taxonomyId(spec, product.category!)
    const listing = await createDraftListing({
      title: etsyTitle(product.title),
      description: [product.description, spec.details, 'Made to order: printed just for you after you order, so please allow a few days before it ships.']
        .filter(Boolean).join('\n\n'),
      price: Math.min(...state.variants.map(v => v.price)),
      quantity: 999,
      taxonomy_id: state.taxonomyId,
      who_made: 'i_did',
      when_made: 'made_to_order',
      is_supply: false,
      type: 'physical',
      shipping_profile_id: await shippingProfile(),
      readiness_state_id: state.readinessStateId,
      tags: etsyTags(product.tags),
      materials: spec.materials,
      production_partner_ids: await printfulPartner(),
    })
    state.listingId = listing.listing_id
    save()
    run('UPDATE products SET etsy_listing_id = ? WHERE id = ?', String(listing.listing_id), product.id)
  }

  step("Foto's uploaden")
  const mockups = state.mockups.slice(0, MAX_IMAGES - 1)
  const images = [...mockups.slice(0, DESIGN_PHOTO_AT), DESIGN_PHOTO, ...mockups.slice(DESIGN_PHOTO_AT)]
  for (let i = state.imagesUploaded ?? 0; !state.imagesCapped && i < images.length; i++) {
    let image: Blob
    if (images[i] === DESIGN_PHOTO) {
      image = new Blob([new Uint8Array(await designCloseUp(designFile))], { type: 'image/jpeg' })
    } else {
      const res = await fetch(images[i], { signal: AbortSignal.timeout(60_000) })
      if (!res.ok) {
        // Printful's mockup links don't last forever; make new ones on the next try
        state.mockups = []
        save()
        throw new Error(`Mockup ${i + 1} ophalen bij Printful mislukte (${res.status}). Probeer opnieuw.`)
      }
      image = await res.blob()
    }
    try {
      await uploadListingImage(state.listingId, image, `photo-${i + 1}.jpg`, i + 1, product.title)
    } catch (err) {
      if (i < OLD_IMAGE_LIMIT || !(err instanceof Error) || !err.message.includes('(400)')) throw err
      log(product.shop_id, `Etsy nam niet meer dan ${i} foto's aan voor "${product.title}"`, 'info')
      state.imagesUploaded = i
      state.imagesCapped = true
      save()
      break
    }
    state.imagesUploaded = i + 1
    save()
  }

  if (!state.attributesDone) {
    step('Kenmerken invullen')
    try {
      state.attributesFilled = await fillAttributes(state.listingId, state.taxonomyId ?? await taxonomyId(spec, product.category!), product, spec, state.color)
    } catch (err) {
      log(product.shop_id, `Kenmerken voor "${product.title}" invullen lukte niet: ${err instanceof Error ? err.message : err}`, 'info')
    }
    state.attributesDone = true
    save()
  }

  if (!state.videoDone) {
    step('Video maken')
    try {
      state.hasVideo = await addVideo(state.listingId, state.mockups, product.title)
      if (!state.hasVideo) log(product.shop_id, `Geen video voor "${product.title}": ffmpeg staat niet op deze server`, 'info')
    } catch (err) {
      log(product.shop_id, `Video voor "${product.title}" lukte niet: ${err instanceof Error ? err.message : err}`, 'info')
    }
    state.videoDone = true
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
  const extras = [
    `${state.imagesUploaded ?? 0} foto's`,
    state.hasVideo ? 'een video' : null,
    state.attributesFilled ? `${state.attributesFilled} kenmerken` : null,
  ].filter(Boolean).join(', ')
  log(product.shop_id, live
    ? `"${product.title}" staat live op Etsy, met ${extras}`
    : `"${product.title}" staat als concept op Etsy, met ${extras}. Controleer en publiceer hem daar.`, 'success')
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
  const params = {
    variant_ids: [main.variantId],
    format: 'jpg' as const,
    files: [{
      placement: state.placement,
      image_url: signedFileUrl(origin, area.file),
      position: { area_width: area.width, area_height: area.height, width: area.width, height: area.height, top: 0, left: 0 },
    }],
  }
  // Every mockup style Printful has for this product (flat, on a model, lifestyle, ...), for more photos;
  // if Printful refuses that, the default set is still fine
  const styles = (await getPrintfiles(state.printfulProductId).catch(() => null))?.option_groups
  const task = styles?.length
    ? await createMockupTask(state.printfulProductId, { ...params, option_groups: styles }).catch(() => createMockupTask(state.printfulProductId, params))
    : await createMockupTask(state.printfulProductId, params)
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

// The design on its own, large, as a close-up photo between the mockups
async function designCloseUp(designFile: string): Promise<Buffer> {
  const png = await designPng(designFile)
  const background = (await isDarkDesign(png)) ? '#f6f5f2' : '#1c1c1e'
  const design = await sharp(png).trim().toBuffer().catch(() => png)
  const fitted = await sharp(design).resize(1640, 1640, { fit: 'inside' }).png().toBuffer()
  return sharp({ create: { width: 2000, height: 2000, channels: 3, background } })
    .composite([{ input: fitted, gravity: 'center' }])
    .jpeg({ quality: 90 })
    .toBuffer()
}

async function addVideo(listingId: number, mockups: string[], title: string): Promise<boolean> {
  const shots = await Promise.all(mockups.slice(0, 6).map(url =>
    fetch(url, { signal: AbortSignal.timeout(60_000) }).then(r => r.ok ? r.arrayBuffer() : null).catch(() => null)))
  const video = await slideshowVideo(shots.filter((s): s is ArrayBuffer => !!s).map(s => Buffer.from(s)))
  if (!video) return false
  await uploadListingVideo(listingId, new Blob([new Uint8Array(video)], { type: 'video/mp4' }), title)
  return true
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

// Sizes are variations and a measurement needs a unit, so those attributes are left to the variations
const SKIP_ATTRIBUTE = /size|dimension|width|height|length|weight|capacity|volume|diameter/i
// Printful colour names as Etsy calls them
const ETSY_COLOR: Record<string, string> = { White: 'White', Black: 'Black', Oyster: 'Beige' }

// Fills the category's attributes (colour, occasion, theme, ...) so buyers find the listing through Etsy's filters.
// Marcus picks them from the values Etsy allows; without AI only the garment colour is set. Returns how many were set.
async function fillAttributes(listingId: number, taxonomy: number, product: ProductRow, spec: ProductSpec, color: string | null): Promise<number> {
  const properties = (await getTaxonomyProperties(taxonomy))
    .filter(p => p.supports_attributes && p.possible_values?.length && !SKIP_ATTRIBUTE.test(p.name))
  const chosen = new Map<number, TaxonomyProperty['possible_values']>()
  const pick = (property: TaxonomyProperty, names: string[]) => {
    const max = property.is_multivalued ? property.max_values_allowed ?? 5 : 1
    const values = names
      .map(name => property.possible_values.find(v => v.name.toLowerCase() === String(name).trim().toLowerCase()))
      .filter((v, i, all): v is NonNullable<typeof v> => !!v && all.indexOf(v) === i)
      .slice(0, max)
    if (values.length) chosen.set(property.property_id, values)
  }

  let styles: string[] = []
  if (isAiEnabled() && properties.length) {
    const answer = await suggestAttributes(product, spec, color, properties)
    for (const property of properties) {
      const names = answer.attributes[property.name] ?? answer.attributes[property.display_name]
      if (names) pick(property, Array.isArray(names) ? names : [names])
    }
    styles = answer.styles
  }
  // The garment colour is known for sure, so it wins over a guess
  const primary = properties.find(p => /^primary colou?r$/i.test(p.name))
  if (primary && color) pick(primary, [ETSY_COLOR[color] ?? color])

  let filled = 0
  for (const [propertyId, values] of chosen) {
    try {
      await updateListingProperty(listingId, propertyId, values)
      filled++
    } catch { /* one refused attribute shouldn't stop the others */ }
  }
  if (styles.length) await updateListingFields(listingId, { styles }).catch(() => { /* styles are optional */ })
  return filled
}

async function suggestAttributes(product: ProductRow, spec: ProductSpec, color: string | null, properties: TaxonomyProperty[]) {
  const model = get<{ model: string | null }>("SELECT model FROM agents WHERE shop_id = ? AND template_type = 'listing' LIMIT 1", product.shop_id)?.model || undefined
  const list = properties.map(p => `- ${p.name}${p.is_multivalued ? ` (up to ${p.max_values_allowed ?? 5})` : ''}: ${p.possible_values.slice(0, 150).map(v => v.name).join(' | ')}`).join('\n')
  const text = await askAi(
    'You fill in Etsy listing attributes for a print-on-demand shop. Only choose values that clearly fit the product; leave an attribute out when unsure. Answer with JSON only.',
    `Product type: ${product.category}${color ? ` (${color})` : ''}\nProduct: ${spec.details}\nTitle: ${product.title}\nDescription: ${product.description ?? ''}\nTags: ${product.tags ?? ''}\n\n` +
    `Attributes and the values Etsy allows:\n${list}\n\n` +
    'Return {"attributes": {"<attribute name>": ["<value exactly as listed>"]}, "styles": ["<at most 2 short style words, e.g. Minimalist, Boho>"]}',
    { maxTokens: 700, model }
  )
  let parsed: { attributes?: Record<string, string | string[]>; styles?: unknown } = {}
  try { parsed = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1)) } catch { /* nothing usable */ }
  return {
    attributes: parsed.attributes && typeof parsed.attributes === 'object' ? parsed.attributes : {},
    // Etsy styles: at most 2, letters, numbers and spaces, 45 characters each
    styles: (Array.isArray(parsed.styles) ? parsed.styles : [])
      .map(s => String(s).replace(/[^\p{L}\p{N}\s]/gu, '').replace(/\s+/g, ' ').trim().slice(0, 45))
      .filter(Boolean).slice(0, 2),
  }
}

function etsyTags(raw: string | null): string[] {
  let tags: unknown = []
  try { tags = JSON.parse(raw || '[]') } catch { /* no tags */ }
  return cleanTags(Array.isArray(tags) ? tags : [])
}

// ─── Helpers ──────────────────────────────────────────────

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

// Shown in the activity feed as Marcus, the listing agent
function log(shopId: string, message: string, type: 'thinking' | 'info' | 'success' | 'error') {
  const agent = get<{ id: string }>("SELECT id FROM agents WHERE shop_id = ? AND template_type = 'listing' LIMIT 1", shopId)
  if (!agent) return
  run('INSERT INTO activity_log (shop_id, agent_id, message, type, demo) VALUES (?, ?, ?, ?, 0)', shopId, agent.id, message, type)
  emitAgentEvent({
    shopId, agentId: agent.id, type: 'activity',
    data: { message, activityType: type }, timestamp: new Date().toISOString(),
  })
}
