import { NextRequest, NextResponse } from 'next/server'
import { get } from '@/lib/db'
import { isAiEnabled, getSetting, setSetting } from '@/lib/ai'

export const dynamic = 'force-dynamic'

const dismissedKey = (shopId: string) => `errors_dismissed_${shopId}`

const count = (sql: string, ...params: unknown[]) => get<{ n: number }>(sql, ...params)?.n ?? 0

// What needs the owner and what the agents really did: the "is anything happening?" overview
export async function GET(_req: NextRequest, { params }: { params: Promise<{ shopId: string }> }) {
  const { shopId } = await params
  const day = "datetime('now', '-1 day')"

  // Errors up to the one the owner clicked away stay hidden
  const seen = Number(getSetting(dismissedKey(shopId))) || 0
  const lastError = get<{ message: string; agent: string; created_at: string }>(
    `SELECT l.message, a.name AS agent, l.created_at FROM activity_log l
     LEFT JOIN agents a ON a.id = l.agent_id AND a.shop_id = l.shop_id
     WHERE l.shop_id = ? AND l.demo = 0 AND l.type = 'error' AND l.dismissed = 0 AND l.created_at >= ${day} AND l.id > ?
     ORDER BY l.id DESC LIMIT 1`,
    shopId, seen
  )
  const lastWork = get<{ at: string | null }>(
    "SELECT MAX(completed_at) AS at FROM tasks WHERE shop_id = ? AND demo = 0 AND status = 'completed'",
    shopId
  )

  return NextResponse.json({
    live: isAiEnabled(),
    review: count("SELECT COUNT(*) AS n FROM products WHERE shop_id = ? AND status = 'review'", shopId),
    // Orders the app doesn't send itself (sending is off), drafts to confirm, and ones that failed
    newOrders: count(
      "SELECT COUNT(*) AS n FROM orders WHERE shop_id = ? AND status = 'new' AND fulfillment_status = 'manual' AND fulfill_error IS NULL",
      shopId
    ),
    ordersToConfirm: count(
      "SELECT COUNT(*) AS n FROM orders WHERE shop_id = ? AND status = 'processing' AND fulfillment_status = 'draft' AND fulfill_error IS NULL",
      shopId
    ),
    orderErrors: count("SELECT COUNT(*) AS n FROM orders WHERE shop_id = ? AND fulfill_error IS NOT NULL", shopId),
    approved: count(
      `SELECT COUNT(*) AS n FROM products WHERE shop_id = ? AND status = 'draft' AND design_url IS NOT NULL
       AND COALESCE(publish_status, '') NOT IN ('etsy_draft', 'etsy_live')`,
      shopId
    ),
    // Failed agent tasks on Fouten: same rule as that page (last week, not clicked away, not redone)
    taskErrors: count(
      `SELECT COUNT(*) AS n FROM activity_log l JOIN tasks t ON t.id = l.task_id
       WHERE l.shop_id = ? AND l.type = 'error' AND l.demo = 0 AND l.dismissed = 0 AND l.created_at >= datetime('now', '-7 days')
         AND t.type NOT IN ('fix_publish', 'fix_order')
         AND NOT EXISTS (SELECT 1 FROM tasks r WHERE r.shop_id = l.shop_id AND r.status = 'completed' AND r.demo = 0
                         AND r.input_data LIKE '%"retryOf":"' || l.task_id || '"%')`,
      shopId
    ),
    publishFailed: count("SELECT COUNT(*) AS n FROM products WHERE shop_id = ? AND publish_status = 'failed' AND error_dismissed = 0", shopId),
    // Listings this app made, plus products synced from Etsy before (those have no publish status)
    onEtsy: count(
      `SELECT COUNT(*) AS n FROM products WHERE shop_id = ?
       AND status != 'deleted' AND (publish_status IN ('etsy_draft', 'etsy_live') OR (publish_status IS NULL AND etsy_listing_id IS NOT NULL))`,
      shopId
    ),
    last24h: {
      done: count(`SELECT COUNT(*) AS n FROM tasks WHERE shop_id = ? AND demo = 0 AND status = 'completed' AND completed_at >= ${day}`, shopId),
      failed: count(`SELECT COUNT(*) AS n FROM tasks WHERE shop_id = ? AND demo = 0 AND status = 'failed' AND completed_at >= ${day}`, shopId),
      designs: count(
        `SELECT COUNT(*) AS n FROM products WHERE shop_id = ? AND created_by = 'luna' AND (design_url IS NOT NULL OR status IN ('rejected', 'deleted')) AND created_at >= ${day}`,
        shopId
      ),
    },
    lastError: lastError ?? null,
    lastWorkAt: lastWork?.at ?? null,
  })
}

// Clicks away the "Laatste fout" banner: every error logged so far stays hidden, a new one shows again
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ shopId: string }> }) {
  const { shopId } = await params
  const last = get<{ id: number | null }>("SELECT MAX(id) AS id FROM activity_log WHERE shop_id = ? AND type = 'error'", shopId)
  setSetting(dismissedKey(shopId), String(last?.id ?? 0))
  return NextResponse.json({ ok: true })
}
