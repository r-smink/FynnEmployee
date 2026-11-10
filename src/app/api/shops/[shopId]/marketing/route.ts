import { NextRequest, NextResponse } from 'next/server'
import { get } from '@/lib/db'
import { getSetting, isAiEnabled, setSetting } from '@/lib/ai'
import { setShopSetting, getShopSetting } from '@/lib/shop-settings'
import { getPublicOrigin } from '@/lib/public-origin'
import { isEtsyConnected } from '@/integrations/etsy/client'
import { disconnectPinterest, getBoards, isPinterestConfigured, isPinterestConnected } from '@/integrations/pinterest/client'
import { engine } from '@/agents/engine'
import { agentFor, enqueue, PRIORITY } from '@/lib/agent-queue'
import { SEO_AUTO_KEY, applyReview, editProposal, getReviews, rejectReview, seoAutoApply } from '@/lib/seo'
import {
  DAILY_PINS_KEY, PINTEREST_BOARD_KEY, PINTEREST_ENABLED_KEY, dailyPins, getPromotions, pinterestEnabled,
} from '@/lib/promote'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ shopId: string }> }

export async function GET(request: NextRequest, { params }: Params) {
  const { shopId } = await params
  const milo = agentFor(shopId, 'marketing')
  const busy = (type: string) => !!milo && !!get(
    "SELECT 1 FROM tasks WHERE shop_id = ? AND agent_id = ? AND type = ? AND status IN ('queued', 'in_progress') AND demo = 0",
    shopId, milo.id, type
  )
  const connected = isPinterestConnected()
  // Boards only when asked (?boards=1): the page polls this route and Pinterest limits API calls
  const boards = connected && request.nextUrl.searchParams.get('boards') ? await getBoards().catch(() => null) : null
  return NextResponse.json({
    agent: milo?.name ?? null,
    etsy: isEtsyConnected(),
    ai: isAiEnabled(),
    seo: { autoApply: seoAutoApply(shopId), reviews: getReviews(shopId), checking: busy('seo_audit') },
    pinterest: {
      configured: isPinterestConfigured(),
      appId: getSetting('pinterest_app_id'),
      connected,
      username: getSetting('pinterest_username'),
      enabled: pinterestEnabled(shopId),
      boardId: getShopSetting(shopId, PINTEREST_BOARD_KEY),
      boards,
      dailyPins: dailyPins(shopId),
      redirectUri: `${getPublicOrigin(request)}/api/pinterest/callback`,
      promotions: getPromotions(shopId),
      pinning: busy('promo_pin'),
    },
  })
}

export async function POST(request: NextRequest, { params }: Params) {
  const { shopId } = await params
  const body = await request.json().catch(() => ({}))
  const milo = agentFor(shopId, 'marketing')
  const queue = (type: 'seo_audit' | 'promo_pin', title: string, input?: Record<string, unknown>) => {
    if (!milo) return NextResponse.json({ error: 'Deze shop heeft geen SEO & Marketing-agent' }, { status: 404 })
    if (!isAiEnabled()) return NextResponse.json({ error: 'Dit werkt alleen in AI Live' }, { status: 409 })
    enqueue({ shopId, agentId: milo.id, type, title, description: 'Gevraagd door de eigenaar', input, priority: PRIORITY.high })
    engine.wake(shopId, milo.id)
    return NextResponse.json({ ok: true })
  }

  try {
    switch (body.action) {
      case 'settings': {
        if (typeof body.seoAutoApply === 'boolean') setShopSetting(shopId, SEO_AUTO_KEY, body.seoAutoApply ? '1' : '0')
        if (typeof body.pinterestEnabled === 'boolean') setShopSetting(shopId, PINTEREST_ENABLED_KEY, body.pinterestEnabled ? '1' : '0')
        if (typeof body.boardId === 'string') setShopSetting(shopId, PINTEREST_BOARD_KEY, body.boardId)
        if (Number.isInteger(body.dailyPins) && body.dailyPins >= 1 && body.dailyPins <= 20) setShopSetting(shopId, DAILY_PINS_KEY, String(body.dailyPins))
        return NextResponse.json({ ok: true })
      }
      case 'pinterest_keys': {
        const appId = typeof body.appId === 'string' ? body.appId.trim() : ''
        const secret = typeof body.appSecret === 'string' ? body.appSecret.trim() : ''
        if (!appId || !secret) return NextResponse.json({ error: 'Vul de App ID en het App secret in' }, { status: 400 })
        setSetting('pinterest_app_id', appId)
        setSetting('pinterest_app_secret', secret)
        return NextResponse.json({ ok: true })
      }
      case 'pinterest_disconnect':
        disconnectPinterest()
        setShopSetting(shopId, PINTEREST_ENABLED_KEY, '0')
        return NextResponse.json({ ok: true })
      case 'check_now':
        return queue('seo_audit', body.listingId ? 'SEO-check van deze listing' : 'SEO-check van de volgende listing',
          typeof body.listingId === 'string' ? { listingId: body.listingId } : undefined)
      case 'pin_now':
        return queue('promo_pin', 'Live listing promoten op Pinterest')
      case 'apply':
        await applyReview(shopId, String(body.id))
        return NextResponse.json({ ok: true })
      case 'reject':
        rejectReview(shopId, String(body.id))
        return NextResponse.json({ ok: true })
      case 'edit':
        return NextResponse.json({ ok: true, proposal: editProposal(shopId, String(body.id), body.proposal ?? {}) })
      default:
        return NextResponse.json({ error: 'Onbekende actie' }, { status: 400 })
    }
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 502 })
  }
}
