import { v4 as uuid } from 'uuid'
import { all, get, run } from './db'
import { askAi, isAiEnabled } from './ai'
import { getShopSetting, setShopSetting } from './shop-settings'
import { cleanTags, etsyTitle } from './etsy-text'
import { marketSummary } from './market-context'
import { getAllShopListings, isEtsyConnected, updateListingFields, type EtsyShopListing } from '@/integrations/etsy/client'

// Milo checks every Etsy listing of the shop for SEO, one at a time, and writes a better title, tags and description.
// The owner approves them on Marketing, or lets Milo apply them himself.

export const SEO_AUTO_KEY = 'seo_auto_apply'
// A listing is checked again after this many days
const RECHECK_DAYS = 21
// Listings scoring this or higher are fine as they are
const GOOD_SCORE = 85
const LISTING_COUNT_KEY = 'seo_listing_count'

export const seoAutoApply = (shopId: string) => getShopSetting(shopId, SEO_AUTO_KEY) === '1'

export interface ListingText {
  title: string
  description: string
  tags: string[]
}

interface ListingFacts extends ListingText {
  materials: string[]
  photos: number
  video: boolean
}

export interface SeoReview {
  id: string
  listing_id: string
  listing_url: string | null
  score_before: number
  score_after: number | null
  issues: string[]
  current: ListingText & { photos?: number; video?: boolean; image?: string | null }
  proposal: ListingText | null
  status: 'ok' | 'checked' | 'proposed' | 'applied' | 'rejected' | 'failed'
  error: string | null
  created_at: string
  applied_at: string | null
}

type Row = Omit<SeoReview, 'issues' | 'current' | 'proposal'> & { issues: string | null; current: string; proposal: string | null }

const parse = (r: Row): SeoReview => ({
  ...r,
  issues: JSON.parse(r.issues || '[]'),
  current: JSON.parse(r.current),
  proposal: r.proposal ? JSON.parse(r.proposal) : null,
})

export function getReviews(shopId: string): SeoReview[] {
  return all<Row>(
    `SELECT * FROM seo_reviews WHERE shop_id = ?
     ORDER BY CASE status WHEN 'proposed' THEN 0 WHEN 'failed' THEN 1 ELSE 2 END, created_at DESC LIMIT 60`, shopId
  ).map(parse)
}

// Etsy sends descriptions and titles with HTML entities
const decode = (s: string) => s
  .replace(/&#39;|&#039;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')

// ─── Scoring ──────────────────────────────────────────────

// 0–100 with the reasons points were lost, in Dutch
export function auditListing(l: ListingFacts): { score: number; issues: string[] } {
  const issues: string[] = []
  let score = 0
  const title = l.title.trim()

  if (title.length >= 70) score += 15
  else {
    score += title.length >= 40 ? 8 : 0
    issues.push(`Titel is kort (${title.length} tekens). Gebruik tot 140 tekens met de woorden waarop kopers zoeken.`)
  }
  // Etsy weighs the start of the title most: a tag should be in the first 40 characters
  const head = title.slice(0, 40).toLowerCase()
  if (l.tags.some(t => head.includes(t.toLowerCase()))) score += 10
  else issues.push('Het belangrijkste zoekwoord staat niet vooraan in de titel.')
  const words = title.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(w => w.length > 3)
  const repeated = [...new Set(words.filter((w, i) => words.indexOf(w) !== i && words.filter(x => x === w).length > 2))]
  if (repeated.length === 0) score += 5
  else issues.push(`Titel herhaalt woorden te vaak (${repeated.join(', ')}). Dat helpt niet en leest slecht.`)

  score += Math.round((Math.min(13, l.tags.length) / 13) * 20)
  if (l.tags.length < 13) issues.push(`Maar ${l.tags.length} van de 13 tags gebruikt.`)
  const longTail = l.tags.filter(t => t.trim().includes(' ')).length
  if (longTail >= 8) score += 10
  else {
    score += longTail >= 4 ? 5 : 0
    issues.push(`Maar ${longTail} tags van meerdere woorden. Kopers zoeken op zinnen als "cat mom shirt".`)
  }

  const description = l.description.trim()
  if (description.length >= 600) score += 10
  else {
    score += description.length >= 300 ? 5 : 0
    issues.push(`Beschrijving is kort (${description.length} tekens). Etsy en Google lezen de beschrijving ook.`)
  }
  const keyword = l.tags[0]?.toLowerCase()
  if (keyword && description.slice(0, 160).toLowerCase().includes(keyword)) score += 5
  else issues.push('De eerste zin van de beschrijving noemt het hoofdzoekwoord niet.')

  if (l.photos >= 7) score += 15
  else {
    score += l.photos >= 5 ? 9 : l.photos >= 3 ? 4 : 0
    issues.push(`${l.photos} foto's. Listings met 7 of meer foto's verkopen beter.`)
  }
  if (l.video) score += 5
  else issues.push('Geen video.')
  if (l.materials.length) score += 5
  else issues.push('Materialen zijn niet ingevuld.')

  return { score: Math.min(100, score), issues }
}

// ─── Which listing is next ────────────────────────────────

const listingCache = globalThis as unknown as { __fynnShopListings?: { at: number; listings: EtsyShopListing[] } }

async function shopListings(fresh = false): Promise<EtsyShopListing[]> {
  const hit = listingCache.__fynnShopListings
  if (!fresh && hit && Date.now() - hit.at < 15 * 60 * 1000) return hit.listings
  const listings = await getAllShopListings()
  listingCache.__fynnShopListings = { at: Date.now(), listings }
  return listings
}

const recentlyReviewed = (shopId: string) => new Set(all<{ listing_id: string }>(
  `SELECT DISTINCT listing_id FROM seo_reviews WHERE shop_id = ?
     AND (status = 'proposed' OR (status != 'failed' AND created_at >= datetime('now', ?)))`,
  shopId, `-${RECHECK_DAYS} days`
).map(r => r.listing_id))

// Whether a listing is due for a check; cheap (no Etsy call), from the count of the last round
export function seoDue(shopId: string): boolean {
  if (!isEtsyConnected()) return false
  const known = parseInt(getShopSetting(shopId, LISTING_COUNT_KEY) || '', 10)
  return !Number.isInteger(known) || recentlyReviewed(shopId).size < known
}

const factsOf = (l: EtsyShopListing): ListingFacts => ({
  title: decode(l.title),
  description: decode(l.description || ''),
  tags: (l.tags || []).map(decode),
  materials: l.materials || [],
  photos: l.images?.length ?? 0,
  video: (l.videos?.length ?? 0) > 0,
})

export interface SeoRoundResult {
  review: SeoReview | null
  remaining: number
}

// Checks the next listing that is due; returns null as review when every listing was checked recently
export async function runSeoRound(shopId: string, opts: { model?: string; listingId?: string; onStep?: (m: string, p: number) => void } = {}): Promise<SeoRoundResult> {
  const step = opts.onStep ?? (() => {})
  if (!isEtsyConnected()) throw new Error('Etsy is niet gekoppeld. Koppel je shop bij Instellingen.')
  step('Haalt je Etsy-listings op...', 10)
  const listings = await shopListings(!!opts.listingId)
  setShopSetting(shopId, LISTING_COUNT_KEY, String(listings.length))
  const done = recentlyReviewed(shopId)
  const due = listings.filter(l => !done.has(String(l.listing_id)))
  const listing = opts.listingId ? listings.find(l => String(l.listing_id) === opts.listingId) : due[0]
  if (!listing) return { review: null, remaining: 0 }

  const facts = factsOf(listing)
  const before = auditListing(facts)
  const current = { title: facts.title, description: facts.description, tags: facts.tags, photos: facts.photos, video: facts.video, image: listing.images?.[0]?.url_570xN ?? null }
  const id = uuid()
  const insert = (status: SeoReview['status'], proposal: ListingText | null, after: number | null, error: string | null = null) => run(
    `INSERT INTO seo_reviews (id, shop_id, listing_id, listing_url, score_before, score_after, issues, current, proposal, status, error)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id, shopId, String(listing.listing_id), listing.url, before.score, after, JSON.stringify(before.issues),
    JSON.stringify(current), proposal ? JSON.stringify(proposal) : null, status, error
  )
  const remaining = Math.max(0, due.length - 1)

  // Text that already scores well is left alone; photos and video are not something new text can fix
  const textIssues = before.issues.filter(i => !/foto|video|materialen/i.test(i))
  if (before.score >= GOOD_SCORE || textIssues.length === 0) {
    insert('ok', null, null)
    return { review: parse(get<Row>('SELECT * FROM seo_reviews WHERE id = ?', id)!), remaining }
  }
  if (!isAiEnabled()) {
    insert('checked', null, null)
    return { review: parse(get<Row>('SELECT * FROM seo_reviews WHERE id = ?', id)!), remaining }
  }

  step(`Zoekt waar kopers op zoeken voor "${facts.title.slice(0, 40)}"...`, 35)
  const query = facts.tags[0] || facts.title.split(/\s+/).slice(0, 3).join(' ')
  const market = await marketSummary(query)
  step('Schrijft een betere titel, tags en beschrijving...', 60)
  const proposal = await propose(facts, market, opts.model)
  const after = auditListing({ ...facts, ...proposal }).score
  if (after <= before.score) {
    insert('ok', null, null)
    return { review: parse(get<Row>('SELECT * FROM seo_reviews WHERE id = ?', id)!), remaining }
  }
  insert('proposed', proposal, after)
  if (seoAutoApply(shopId)) {
    step('Voert de verbetering door op Etsy...', 85)
    await applyReview(shopId, id).catch(() => { /* recorded on the review */ })
  }
  return { review: parse(get<Row>('SELECT * FROM seo_reviews WHERE id = ?', id)!), remaining }
}

async function propose(l: ListingFacts, market: string | null, model?: string): Promise<ListingText> {
  const text = await askAi(
    'You are an Etsy SEO specialist. You improve listing text so it ranks in Etsy search and converts. Answer with JSON only.',
    `Current listing:\nTitle: ${l.title}\nTags: ${l.tags.join(', ')}\nDescription:\n${l.description}\n\n` +
    (market ? `${market}\n\n` : '') +
    'Write an improved version in the same language as the current listing:\n' +
    '- title: up to 140 characters, the main search phrase first, then other phrases buyers use, separated naturally; no repeated words, no ALL CAPS\n' +
    '- tags: exactly 13, each at most 20 characters, mostly multi-word phrases buyers search for, no repeats of the same phrase\n' +
    '- description: open with one or two sentences that use the main search phrase and say who it is for; then keep EVERY fact from ' +
    'the current description (materials, sizes, care, shipping, made to order) word for word. Never invent facts.\n' +
    'Return {"title": "...", "tags": ["..."], "description": "..."}',
    { maxTokens: 1500, model }
  )
  let parsed: Partial<ListingText> = {}
  try { parsed = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1)) } catch { /* below */ }
  const title = etsyTitle(String(parsed.title ?? ''))
  const tags = cleanTags(Array.isArray(parsed.tags) ? parsed.tags : [])
  const description = String(parsed.description ?? '').trim()
  if (!title || tags.length < 5 || description.length < 100) throw new Error('Het AI-model gaf geen bruikbaar SEO-voorstel terug')
  return { title, tags, description: description.slice(0, 60_000) }
}

// Puts the proposal on Etsy; the product in the app gets the new title and tags too
export async function applyReview(shopId: string, reviewId: string): Promise<void> {
  const review = get<Row>('SELECT * FROM seo_reviews WHERE id = ? AND shop_id = ?', reviewId, shopId)
  if (!review?.proposal) throw new Error('Geen voorstel om door te voeren')
  const proposal = JSON.parse(review.proposal) as ListingText
  try {
    await updateListingFields(Number(review.listing_id), proposal)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    run("UPDATE seo_reviews SET status = 'failed', error = ? WHERE id = ?", message, reviewId)
    throw err
  }
  run("UPDATE seo_reviews SET status = 'applied', error = NULL, applied_at = datetime('now') WHERE id = ?", reviewId)
  run("UPDATE products SET title = ?, tags = ?, updated_at = datetime('now') WHERE etsy_listing_id = ?",
    proposal.title, JSON.stringify(proposal.tags), review.listing_id)
  listingCache.__fynnShopListings = undefined
}

export function rejectReview(shopId: string, reviewId: string) {
  run("UPDATE seo_reviews SET status = 'rejected' WHERE id = ? AND shop_id = ? AND status IN ('proposed', 'failed')", reviewId, shopId)
}

// The owner edited the proposal before applying it
export function editProposal(shopId: string, reviewId: string, input: Partial<ListingText>): ListingText {
  const review = get<Row>('SELECT * FROM seo_reviews WHERE id = ? AND shop_id = ?', reviewId, shopId)
  if (!review?.proposal) throw new Error('Geen voorstel gevonden')
  const old = JSON.parse(review.proposal) as ListingText
  const next: ListingText = {
    title: input.title !== undefined ? etsyTitle(input.title) : old.title,
    tags: input.tags !== undefined ? cleanTags(input.tags) : old.tags,
    description: input.description !== undefined ? input.description.trim().slice(0, 60_000) : old.description,
  }
  if (!next.title || !next.description) throw new Error('Titel en beschrijving mogen niet leeg zijn')
  run("UPDATE seo_reviews SET proposal = ?, status = 'proposed' WHERE id = ?", JSON.stringify(next), reviewId)
  return next
}
