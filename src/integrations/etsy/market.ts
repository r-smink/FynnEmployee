// Etsy market research: searches public active listings across all of Etsy.
// Only needs the app keystring (no OAuth). Etsy does not expose other shops' sales,
// so favorites, views and favorites-per-day are used as popularity signals.

import { getSetting } from '@/lib/ai'

const ETSY_API_BASE = 'https://openapi.etsy.com/v3'
const PAGE_SIZE = 100
const PAGES = 3
const CACHE_MS = 30 * 60 * 1000

export interface MarketListing {
  listing_id: number
  title: string
  tags: string[]
  price: { amount: number; divisor: number; currency_code: string }
  num_favorers: number
  views: number
  url: string
  original_creation_timestamp?: number
  creation_timestamp: number
  image?: string
}

export interface MarketSearch {
  count: number
  listings: MarketListing[]
}

export function hasEtsyKey(): boolean {
  return !!getSetting('etsy_api_key')
}

// Some Etsy apps expect "keystring:shared_secret", others the keystring alone; try both
function apiKeyCandidates(): string[] {
  const key = getSetting('etsy_api_key')
  if (!key) throw new Error('Geen Etsy API-sleutel ingesteld')
  const secret = getSetting('etsy_api_secret')
  return secret && !key.includes(':') ? [`${key}:${secret}`, key] : [key]
}

async function publicFetch<T>(endpoint: string): Promise<T> {
  let res: Response | null = null
  for (const apiKey of apiKeyCandidates()) {
    res = await fetch(`${ETSY_API_BASE}${endpoint}`, {
      headers: { 'x-api-key': apiKey },
      signal: AbortSignal.timeout(15_000),
    })
    if (res.status !== 401 && res.status !== 403) break
  }
  if (!res) throw new Error('Etsy niet bereikbaar')
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    if (res.status === 401 || res.status === 403) {
      throw new Error(`Etsy weigert de API-sleutel (${res.status}). Controleer je keystring en shared secret.`)
    }
    throw new Error(`Etsy API-fout (${res.status}): ${body.slice(0, 200)}`)
  }
  return res.json()
}

const cache = globalThis as unknown as { __fynnMarket?: Map<string, { at: number; data: MarketSearch }> }

export async function searchMarket(keywords: string): Promise<MarketSearch> {
  const key = keywords.trim().toLowerCase()
  cache.__fynnMarket ??= new Map()
  const hit = cache.__fynnMarket.get(key)
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.data

  const q = encodeURIComponent(key)
  const pages = await Promise.all(Array.from({ length: PAGES }, (_, i) =>
    publicFetch<{ count: number; results: MarketListing[] }>(
      `/application/listings/active?keywords=${q}&limit=${PAGE_SIZE}&offset=${i * PAGE_SIZE}&sort_on=score`
    ).catch(err => { if (i === 0) throw err; return { count: 0, results: [] } })
  ))
  const seen = new Set<number>()
  const listings = pages.flatMap(p => p.results).filter(l => !seen.has(l.listing_id) && seen.add(l.listing_id))
  const data = { count: pages[0].count, listings }

  // Thumbnails for the most popular listings (best effort)
  const top = [...listings].sort((a, b) => b.num_favorers - a.num_favorers).slice(0, 24)
  if (top.length) {
    try {
      const batch = await publicFetch<{ results: { listing_id: number; images?: { url_170x135: string }[] }[] }>(
        `/application/listings/batch?listing_ids=${top.map(l => l.listing_id).join(',')}&includes=Images`)
      const img = new Map(batch.results.map(r => [r.listing_id, r.images?.[0]?.url_170x135]))
      for (const l of listings) l.image = img.get(l.listing_id) ?? l.image
    } catch { /* thumbnails are optional */ }
  }

  cache.__fynnMarket.set(key, { at: Date.now(), data })
  return data
}
