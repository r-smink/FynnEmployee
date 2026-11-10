import { v4 as uuid } from 'uuid'
import { all, get, run } from './db'
import { askAi, isAiEnabled } from './ai'
import { getShopSetting, setShopSetting } from './shop-settings'
import { getAllShopListings, isEtsyConnected } from '@/integrations/etsy/client'
import { createBoard, createPin, getBoards, isPinterestConnected } from '@/integrations/pinterest/client'

// Milo promotes live Etsy listings on other channels. Pinterest for now, off until the owner switches it on.

export const PINTEREST_ENABLED_KEY = 'promo_pinterest_enabled'
export const PINTEREST_BOARD_KEY = 'pinterest_board_id'
export const DAILY_PINS_KEY = 'promo_daily_pins'
export const DEFAULT_DAILY_PINS = 3
// After a round finds nothing left to pin, Milo waits this long before looking again
const NOTHING_LEFT_KEY = 'promo_nothing_left_at'
const NOTHING_LEFT_HOURS = 12

export interface Promotion {
  id: string
  listing_id: string
  channel: string
  title: string | null
  external_url: string | null
  status: 'posted' | 'failed'
  error: string | null
  created_at: string
}

export const pinterestEnabled = (shopId: string) => getShopSetting(shopId, PINTEREST_ENABLED_KEY) === '1'

export function dailyPins(shopId: string): number {
  const n = parseInt(getShopSetting(shopId, DAILY_PINS_KEY) || '', 10)
  return Number.isInteger(n) && n >= 1 && n <= 20 ? n : DEFAULT_DAILY_PINS
}

const pinsToday = (shopId: string) => get<{ n: number }>(
  "SELECT COUNT(*) AS n FROM promotions WHERE shop_id = ? AND channel = 'pinterest' AND status = 'posted' AND created_at >= datetime('now', 'start of day')",
  shopId
)!.n

export function getPromotions(shopId: string): Promotion[] {
  return all<Promotion>(
    'SELECT id, listing_id, channel, title, external_url, status, error, created_at FROM promotions WHERE shop_id = ? ORDER BY created_at DESC LIMIT 40', shopId
  )
}

// Cheap check for the agent's rhythm: switched on, connected, room left today, and not just found nothing
export function promoDue(shopId: string): boolean {
  if (!pinterestEnabled(shopId) || !isPinterestConnected() || !isEtsyConnected()) return false
  if (pinsToday(shopId) >= dailyPins(shopId)) return false
  const nothingAt = Number(getShopSetting(shopId, NOTHING_LEFT_KEY) || 0)
  return Date.now() - nothingAt > NOTHING_LEFT_HOURS * 3600 * 1000
}

// The board pins go to: the one the owner chose, or one named after the shop (made when missing)
async function boardId(shopId: string): Promise<string> {
  const chosen = getShopSetting(shopId, PINTEREST_BOARD_KEY)
  if (chosen) return chosen
  const shop = get<{ name: string; description: string | null }>('SELECT name, description FROM shops WHERE id = ?', shopId)
  const name = shop?.name || 'Mijn Etsy-shop'
  const boards = await getBoards()
  const board = boards.find(b => b.name.toLowerCase() === name.toLowerCase()) ?? await createBoard(name, shop?.description || `Ontwerpen van ${name}`)
  setShopSetting(shopId, PINTEREST_BOARD_KEY, board.id)
  return board.id
}

// Pins the next live listing that has no pin yet; null when every live listing is pinned
export async function promoteNext(shopId: string, opts: { model?: string; onStep?: (m: string, p: number) => void } = {}): Promise<Promotion | null> {
  const step = opts.onStep ?? (() => {})
  if (!pinterestEnabled(shopId)) throw new Error('Promoten op Pinterest staat uit')
  if (!isPinterestConnected()) throw new Error('Pinterest is niet gekoppeld')
  if (pinsToday(shopId) >= dailyPins(shopId)) throw new Error(`Vandaag zijn al ${dailyPins(shopId)} pins geplaatst, het maximum per dag`)

  step('Zoekt een live listing die nog niet op Pinterest staat...', 15)
  const pinned = new Set(all<{ listing_id: string }>(
    // A pin that failed today isn't tried again until tomorrow
    `SELECT listing_id FROM promotions WHERE shop_id = ? AND channel = 'pinterest'
       AND (status = 'posted' OR created_at >= datetime('now', '-1 day'))`, shopId
  ).map(p => p.listing_id))
  const listing = (await getAllShopListings())
    .filter(l => l.state === 'active' && l.images?.length && !pinned.has(String(l.listing_id)))
    .sort((a, b) => b.creation_timestamp - a.creation_timestamp)[0]
  if (!listing) {
    setShopSetting(shopId, NOTHING_LEFT_KEY, String(Date.now()))
    return null
  }

  const title = listing.title.replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&')
  let pin = { title: title.slice(0, 100), description: `${title}. ${(listing.tags || []).slice(0, 6).map(t => `#${t.replace(/\s+/g, '')}`).join(' ')}` }
  if (isAiEnabled()) {
    step('Schrijft de pin...', 40)
    const text = await askAi(
      'You write Pinterest pins that bring buyers to an Etsy listing. Pinterest is a search engine: use the words people search for. Answer with JSON only.',
      `Etsy listing:\nTitle: ${title}\nTags: ${(listing.tags || []).join(', ')}\n\n` +
      'Write in the same language as the listing: a pin title (max 100 characters, inviting, keyword first) and a description ' +
      '(max 450 characters: who it is for, the occasion, 3-5 hashtags at the end). Return {"title": "...", "description": "..."}',
      { maxTokens: 400, model: opts.model }
    ).catch(() => '')
    try {
      const p = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1))
      if (p.title && p.description) pin = { title: String(p.title), description: String(p.description) }
    } catch { /* the plain version above */ }
  }

  step('Plaatst de pin op Pinterest...', 70)
  const id = uuid()
  try {
    const created = await createPin({
      boardId: await boardId(shopId), title: pin.title, description: pin.description, link: listing.url,
      imageUrl: listing.images![0].url_fullxfull, altText: listing.images![0].alt_text || title,
    })
    run(`INSERT INTO promotions (id, shop_id, listing_id, channel, title, external_id, external_url, status) VALUES (?, ?, ?, 'pinterest', ?, ?, ?, 'posted')`,
      id, shopId, String(listing.listing_id), pin.title, created.id, `https://www.pinterest.com/pin/${created.id}/`)
  } catch (err) {
    run(`INSERT INTO promotions (id, shop_id, listing_id, channel, title, status, error) VALUES (?, ?, ?, 'pinterest', ?, 'failed', ?)`,
      id, shopId, String(listing.listing_id), pin.title, err instanceof Error ? err.message : String(err))
    throw err
  }
  return get<Promotion>('SELECT id, listing_id, channel, title, external_url, status, error, created_at FROM promotions WHERE id = ?', id)!
}
