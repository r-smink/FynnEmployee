import { hasEtsyKey, searchMarket } from '@/integrations/etsy/market'
import { analyzeListings } from './trends'

// Real Etsy figures for one search, as text an agent can use in its prompt.
// Returns null without an Etsy key or when Etsy fails, so callers can say there is no data.
export async function marketSummary(query: string): Promise<string | null> {
  if (!hasEtsyKey() || !query.trim()) return null
  try {
    const r = analyzeListings(query, await searchMarket(query), 'etsy')
    if (!r.sampleSize) return `Etsy market data for "${query}": no active listings found.`
    const lines = [
      `Etsy market data for "${query}" (${r.totalResults} active listings, sample of ${r.sampleSize}):`,
      r.price && `- Price (${r.currency}): median ${r.price.median}, middle half ${r.price.p25}–${r.price.p75}`,
      `- Most used tags (listings using it): ${r.tags.slice(0, 12).map(t => `${t.tag} (${t.listings})`).join(', ')}`,
      `- Fastest rising listings (favorites per day): ${r.hot.slice(0, 5).map(h => `"${h.title.slice(0, 70)}" (${h.favoritesPerDay})`).join('; ')}`,
    ]
    return lines.filter(Boolean).join('\n')
  } catch (err) {
    console.error(`Market data for "${query}" failed:`, err)
    return null
  }
}

export const NO_MARKET_DATA =
  'No live Etsy market data is available (no Etsy API key). Base your answer on general knowledge and say so explicitly.'
