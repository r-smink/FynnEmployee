import { NextRequest, NextResponse } from 'next/server'
import { getShopSetting, setShopSetting } from '@/lib/shop-settings'
import { hasEtsyKey, searchMarket } from '@/integrations/etsy/market'
import { analyzeListings, demoSearch } from '@/lib/trends'

export const dynamic = 'force-dynamic'

const KEYWORDS_KEY = 'trend_keywords'
const MAX_KEYWORDS = 12

function savedKeywords(shopId: string): string[] {
  try {
    const v = JSON.parse(getShopSetting(shopId, KEYWORDS_KEY) || '[]')
    return Array.isArray(v) ? v.filter(k => typeof k === 'string') : []
  } catch {
    return []
  }
}

// ?q=<keywords> returns a market report; without q the shop's saved keywords
export async function GET(request: NextRequest, { params }: { params: Promise<{ shopId: string }> }) {
  const { shopId } = await params
  const q = request.nextUrl.searchParams.get('q')?.trim().slice(0, 100)
  if (!q) return NextResponse.json({ keywords: savedKeywords(shopId), etsy: hasEtsyKey() })

  if (!hasEtsyKey()) {
    return NextResponse.json(analyzeListings(q, demoSearch(q), 'demo',
      'Voorbeelddata: voeg je Etsy API-sleutel toe bij Instellingen voor echte cijfers.'))
  }
  try {
    return NextResponse.json(analyzeListings(q, await searchMarket(q), 'etsy'))
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 502 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ shopId: string }> }) {
  const { shopId } = await params
  const body = await request.json().catch(() => ({}))
  if (!Array.isArray(body.keywords)) return NextResponse.json({ error: 'keywords moet een lijst zijn' }, { status: 400 })
  const keywords = [...new Set(body.keywords
    .filter((k: unknown): k is string => typeof k === 'string')
    .map((k: string) => k.trim().toLowerCase().slice(0, 100))
    .filter(Boolean))].slice(0, MAX_KEYWORDS)
  setShopSetting(shopId, KEYWORDS_KEY, JSON.stringify(keywords))
  return NextResponse.json({ keywords })
}
