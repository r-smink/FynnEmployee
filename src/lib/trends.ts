// Turns a sample of Etsy listings into market statistics for the Trends page (shared types for the UI)
import type { MarketListing, MarketSearch } from '@/integrations/etsy/market'

export interface TagStat { tag: string; listings: number; avgFavorites: number }
export interface PriceBucket { from: number; to: number; listings: number }
export interface HotListing {
  id: number
  title: string
  url: string
  image: string | null
  price: number
  favorites: number
  views: number
  // favorites per day since the listing was first published: how fast it gains traction
  favoritesPerDay: number
  ageDays: number
}

export interface TrendReport {
  query: string
  source: 'etsy' | 'demo'
  notice: string | null
  totalResults: number
  sampleSize: number
  currency: string
  price: { median: number; p25: number; p75: number } | null
  avgFavorites: number
  avgViews: number
  tags: TagStat[]
  priceBuckets: PriceBucket[]
  hot: HotListing[]
  fetchedAt: string
}

const DAY = 86_400

function quantile(sorted: number[], q: number): number {
  if (!sorted.length) return 0
  const i = (sorted.length - 1) * q
  const lo = Math.floor(i), hi = Math.ceil(i)
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (i - lo)
}

const round2 = (n: number) => Math.round(n * 100) / 100

// Rounded bucket edges (1, 2, 5, 10, 20, 50, …) so the histogram labels read naturally
function niceStep(range: number, buckets: number): number {
  const raw = range / buckets
  const mag = 10 ** Math.floor(Math.log10(raw || 1))
  return [1, 2, 2.5, 5, 10].map(m => m * mag).find(s => s >= raw) ?? 10 * mag
}

export function analyzeListings(query: string, search: MarketSearch, source: TrendReport['source'], notice: string | null = null): TrendReport {
  const now = Date.now() / 1000
  // Listings come in many currencies; analyse the most common one
  const byCurrency = new Map<string, number>()
  for (const l of search.listings) byCurrency.set(l.price.currency_code, (byCurrency.get(l.price.currency_code) || 0) + 1)
  const currency = [...byCurrency.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'EUR'
  const priceOf = (l: MarketListing) => l.price.amount / (l.price.divisor || 100)
  const listings = search.listings

  const prices = listings.filter(l => l.price.currency_code === currency).map(priceOf).sort((a, b) => a - b)
  const price = prices.length ? { median: round2(quantile(prices, 0.5)), p25: round2(quantile(prices, 0.25)), p75: round2(quantile(prices, 0.75)) } : null

  // Histogram over the 5th–95th percentile so a few outliers don't flatten everything
  const priceBuckets: PriceBucket[] = []
  if (prices.length >= 4) {
    const step = niceStep(quantile(prices, 0.95) - quantile(prices, 0.05), 8)
    const start = Math.floor(quantile(prices, 0.05) / step) * step
    const end = Math.ceil(quantile(prices, 0.95) / step) * step
    for (let from = start; from < end; from += step) {
      const to = from + step
      const last = to >= end
      priceBuckets.push({
        from: round2(from), to: round2(to),
        listings: prices.filter(p => p >= from && (last ? p <= to : p < to)).length,
      })
    }
  }

  const tagMap = new Map<string, { listings: number; favorites: number }>()
  for (const l of listings) {
    for (const raw of new Set(l.tags.map(t => t.trim().toLowerCase()).filter(Boolean))) {
      const t = tagMap.get(raw) ?? { listings: 0, favorites: 0 }
      t.listings++
      t.favorites += l.num_favorers
      tagMap.set(raw, t)
    }
  }
  const tags = [...tagMap.entries()]
    .map(([tag, t]) => ({ tag, listings: t.listings, avgFavorites: Math.round(t.favorites / t.listings) }))
    .sort((a, b) => b.listings - a.listings || b.avgFavorites - a.avgFavorites)
    .slice(0, 15)

  const hot = listings
    .map(l => {
      const ageDays = Math.max(1, Math.round((now - (l.original_creation_timestamp || l.creation_timestamp)) / DAY))
      return {
        id: l.listing_id, title: l.title, url: l.url, image: l.image ?? null,
        price: round2(priceOf(l)), favorites: l.num_favorers, views: l.views,
        favoritesPerDay: round2(l.num_favorers / ageDays), ageDays,
      }
    })
    .sort((a, b) => b.favoritesPerDay - a.favoritesPerDay)
    .slice(0, 12)

  const n = Math.max(1, listings.length)
  return {
    query, source, notice,
    totalResults: search.count,
    sampleSize: listings.length,
    currency,
    price,
    avgFavorites: Math.round(listings.reduce((s, l) => s + l.num_favorers, 0) / n),
    avgViews: Math.round(listings.reduce((s, l) => s + (l.views || 0), 0) / n),
    tags,
    priceBuckets,
    hot,
    fetchedAt: new Date().toISOString(),
  }
}

// Deterministic sample data so the page can be explored before Etsy is connected (always labeled as such)
export function demoSearch(query: string): MarketSearch {
  let seed = 0
  for (const ch of query) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0
  const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 2 ** 32 }
  const words = query.toLowerCase().split(/\s+/).filter(Boolean)
  const extra = ['gift', 'personalized', 'handmade', 'minimalist', 'boho', 'vintage', 'custom', 'wall art', 'printable', 'birthday', 'for her', 'aesthetic', 'trendy', 'cute', 'unique']
  const now = Date.now() / 1000
  const listings: MarketListing[] = Array.from({ length: 300 }, (_, i) => {
    const pick = extra.filter(() => rnd() < 0.35).slice(0, 8)
    const fav = Math.round(rnd() ** 3 * 4000)
    return {
      listing_id: 1000 + i,
      title: `${words.join(' ')} ${pick.slice(0, 3).join(' ')}`.trim(),
      tags: [...words, ...pick],
      price: { amount: Math.round((6 + rnd() ** 1.6 * 60) * 100), divisor: 100, currency_code: 'EUR' },
      num_favorers: fav,
      views: Math.round(fav * (8 + rnd() * 20)),
      url: 'https://www.etsy.com/search?q=' + encodeURIComponent(query),
      creation_timestamp: now - Math.round(5 + rnd() * 700) * DAY,
    }
  })
  return { count: 12000 + Math.round(rnd() * 80000), listings }
}
