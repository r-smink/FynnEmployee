import { NextRequest, NextResponse } from 'next/server'
import { get } from '@/lib/db'
import { isAiEnabled } from '@/lib/ai'

export const dynamic = 'force-dynamic'

const count = (sql: string, ...params: unknown[]) => get<{ n: number }>(sql, ...params)?.n ?? 0

// What needs the owner and what the agents really did: the "is anything happening?" overview
export async function GET(_req: NextRequest, { params }: { params: Promise<{ shopId: string }> }) {
  const { shopId } = await params
  const day = "datetime('now', '-1 day')"

  const lastError = get<{ message: string; agent: string; created_at: string }>(
    `SELECT l.message, a.name AS agent, l.created_at FROM activity_log l
     LEFT JOIN agents a ON a.id = l.agent_id AND a.shop_id = l.shop_id
     WHERE l.shop_id = ? AND l.demo = 0 AND l.type = 'error' AND l.created_at >= ${day}
     ORDER BY l.id DESC LIMIT 1`,
    shopId
  )
  const lastWork = get<{ at: string | null }>(
    "SELECT MAX(completed_at) AS at FROM tasks WHERE shop_id = ? AND demo = 0 AND status = 'completed'",
    shopId
  )

  return NextResponse.json({
    live: isAiEnabled(),
    review: count("SELECT COUNT(*) AS n FROM products WHERE shop_id = ? AND status = 'review'", shopId),
    newOrders: count("SELECT COUNT(*) AS n FROM orders WHERE shop_id = ? AND status = 'new'", shopId),
    approved: count(
      `SELECT COUNT(*) AS n FROM products WHERE shop_id = ? AND status = 'draft' AND design_url IS NOT NULL
       AND COALESCE(publish_status, '') NOT IN ('etsy_draft', 'etsy_live')`,
      shopId
    ),
    publishFailed: count("SELECT COUNT(*) AS n FROM products WHERE shop_id = ? AND publish_status = 'failed'", shopId),
    // Listings this app made, plus products synced from Etsy before (those have no publish status)
    onEtsy: count(
      `SELECT COUNT(*) AS n FROM products WHERE shop_id = ?
       AND (publish_status IN ('etsy_draft', 'etsy_live') OR (publish_status IS NULL AND etsy_listing_id IS NOT NULL))`,
      shopId
    ),
    last24h: {
      done: count(`SELECT COUNT(*) AS n FROM tasks WHERE shop_id = ? AND demo = 0 AND status = 'completed' AND completed_at >= ${day}`, shopId),
      failed: count(`SELECT COUNT(*) AS n FROM tasks WHERE shop_id = ? AND demo = 0 AND status = 'failed' AND completed_at >= ${day}`, shopId),
      designs: count(
        `SELECT COUNT(*) AS n FROM products WHERE shop_id = ? AND created_by = 'luna' AND (design_url IS NOT NULL OR status = 'rejected') AND created_at >= ${day}`,
        shopId
      ),
    },
    lastError: lastError ?? null,
    lastWorkAt: lastWork?.at ?? null,
  })
}
