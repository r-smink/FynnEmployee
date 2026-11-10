import { NextRequest, NextResponse } from 'next/server'
import { get } from '@/lib/db'
import { isAiEnabled } from '@/lib/ai'
import { setShopSetting } from '@/lib/shop-settings'
import { hasEtsyKey } from '@/integrations/etsy/market'
import { engine } from '@/agents/engine'
import { agentFor, enqueue, PRIORITY } from '@/lib/agent-queue'
import {
  AUTO_ADD_KEY, AUTO_ADD_SCORE, addFindingAsTheme, autoAddEnabled, discoverTrends, getFindings, setFindingStatus,
} from '@/lib/trend-discovery'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ shopId: string }> }

// Niches Nova found, whether strong ones become themes by themselves, and whether she is searching now
export async function GET(_req: NextRequest, { params }: Params) {
  const { shopId } = await params
  const nova = agentFor(shopId, 'analytics')
  const searching = !!nova && !!get(
    "SELECT 1 FROM tasks WHERE shop_id = ? AND agent_id = ? AND type = 'analytics_trend' AND status IN ('queued', 'in_progress') AND demo = 0",
    shopId, nova.id
  )
  return NextResponse.json({
    findings: getFindings(shopId), autoAdd: autoAddEnabled(shopId), autoAddScore: AUTO_ADD_SCORE,
    etsy: hasEtsyKey(), searching, agent: nova?.name ?? 'Nova',
  })
}

export async function POST(request: NextRequest, { params }: Params) {
  const { shopId } = await params
  const body = await request.json().catch(() => ({}))

  if (body.action === 'auto_add') {
    setShopSetting(shopId, AUTO_ADD_KEY, body.enabled ? '1' : '0')
    return NextResponse.json({ ok: true })
  }

  if (body.action === 'discover') {
    if (!hasEtsyKey()) return NextResponse.json({ error: 'Vul eerst je Etsy API-sleutel in bij Instellingen' }, { status: 409 })
    const nova = agentFor(shopId, 'analytics')
    // In AI Live Nova does it as a task the owner can follow; otherwise it runs here and now, without AI
    if (nova && isAiEnabled()) {
      enqueue({ shopId, agentId: nova.id, type: 'analytics_trend', title: 'Zoek nieuwe trends op Etsy', description: 'Gevraagd door de eigenaar', priority: PRIORITY.high })
      engine.wake(shopId, nova.id)
      return NextResponse.json({ ok: true, queued: true })
    }
    try {
      const result = await discoverTrends(shopId)
      return NextResponse.json({ ok: true, found: result.findings.length })
    } catch (err) {
      return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 502 })
    }
  }

  const id = typeof body.id === 'string' ? body.id : ''
  if (!get('SELECT 1 FROM trend_findings WHERE id = ? AND shop_id = ?', id, shopId)) {
    return NextResponse.json({ error: 'Trend niet gevonden' }, { status: 404 })
  }
  try {
    if (body.action === 'add') return NextResponse.json({ ok: true, theme: addFindingAsTheme(shopId, id) })
    if (body.action === 'ignore') setFindingStatus(shopId, id, 'ignored')
    else if (body.action === 'restore') setFindingStatus(shopId, id, 'new')
    else return NextResponse.json({ error: 'Onbekende actie' }, { status: 400 })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 400 })
  }
  return NextResponse.json({ ok: true })
}
