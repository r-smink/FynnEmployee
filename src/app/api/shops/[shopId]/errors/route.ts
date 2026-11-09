import { NextRequest, NextResponse } from 'next/server'
import { all, get, run } from '@/lib/db'
import { engine } from '@/agents/engine'
import { autoFixEnabled, queueOrderFix, queuePublishFix, queueTaskRetry } from '@/lib/agent-queue'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ shopId: string }> }

// Everything that went wrong in a shop, on one page: orders that didn't reach Printful, products that didn't
// reach Etsy, and agent tasks that failed. Plus the fixes agents are working on right now.
export async function GET(_req: NextRequest, { params }: Params) {
  const { shopId } = await params

  const orders = all(
    `SELECT id, etsy_order_id, customer_name, product_title, fulfill_error, updated_at FROM orders
     WHERE shop_id = ? AND fulfill_error IS NOT NULL ORDER BY updated_at DESC`,
    shopId
  )
  const products = all(
    `SELECT id, title, publish_error, updated_at FROM products
     WHERE shop_id = ? AND publish_status = 'failed' AND error_dismissed = 0 AND status != 'deleted' ORDER BY updated_at DESC`,
    shopId
  )
  // Failed agent tasks of the last week, unless clicked away or since redone successfully
  const tasks = all(
    `SELECT l.id, l.task_id, l.message, l.created_at, t.title, t.type, a.id AS agent_id, a.name AS agent_name, a.color AS agent_color
     FROM activity_log l
     JOIN tasks t ON t.id = l.task_id
     LEFT JOIN agents a ON a.id = l.agent_id AND a.shop_id = l.shop_id
     WHERE l.shop_id = ? AND l.type = 'error' AND l.demo = 0 AND l.dismissed = 0 AND l.created_at >= datetime('now', '-7 days')
       AND t.type NOT IN ('fix_publish', 'fix_order')
       AND NOT EXISTS (SELECT 1 FROM tasks r WHERE r.shop_id = l.shop_id AND r.status = 'completed' AND r.demo = 0
                       AND r.input_data LIKE '%"retryOf":"' || l.task_id || '"%')
     ORDER BY l.id DESC LIMIT 100`,
    shopId
  )
  // Fixes and retries that are queued or running, so the page can show "Marcus is bezig"
  const fixes = all<{ id: string; type: string; status: string; input_data: string | null; agent_name: string | null; run_after: string | null }>(
    `SELECT t.id, t.type, t.status, t.input_data, t.run_after, a.name AS agent_name FROM tasks t
     LEFT JOIN agents a ON a.id = t.agent_id AND a.shop_id = t.shop_id
     WHERE t.shop_id = ? AND t.priority > 0 AND t.type != 'owner_task' AND t.status IN ('queued', 'in_progress')`,
    shopId
  ).map(f => ({ ...f, input: f.input_data ? JSON.parse(f.input_data) : {} }))

  return NextResponse.json({ autoFix: autoFixEnabled(), orders, products, tasks, fixes })
}

// assign:      give the error to an agent, who starts on it right away
// dismiss:     click a product or task error away (orders are solved with retry or "zelf afgehandeld")
// dismiss_all: click away every product and task error
export async function POST(request: NextRequest, { params }: Params) {
  const { shopId } = await params
  const { action, kind, id } = await request.json().catch(() => ({}))

  if (action === 'dismiss_all') {
    run("UPDATE products SET error_dismissed = 1 WHERE shop_id = ? AND publish_status = 'failed'", shopId)
    run("UPDATE activity_log SET dismissed = 1 WHERE shop_id = ? AND type = 'error'", shopId)
    return NextResponse.json({ ok: true })
  }

  if (action === 'dismiss') {
    if (kind === 'product') run('UPDATE products SET error_dismissed = 1 WHERE id = ? AND shop_id = ?', id, shopId)
    else if (kind === 'task') run('UPDATE activity_log SET dismissed = 1 WHERE id = ? AND shop_id = ?', id, shopId)
    else return NextResponse.json({ error: 'Een bestelling los je op met Opnieuw proberen of Zelf afgehandeld' }, { status: 400 })
    return NextResponse.json({ ok: true })
  }

  if (action !== 'assign') return NextResponse.json({ error: 'Onbekende actie' }, { status: 400 })

  let taskId: string | null = null
  if (kind === 'product') {
    const product = get<{ title: string }>('SELECT title FROM products WHERE id = ? AND shop_id = ?', id, shopId)
    if (!product) return NextResponse.json({ error: 'Product niet gevonden' }, { status: 404 })
    taskId = queuePublishFix(shopId, id, product.title)
  } else if (kind === 'order') {
    const order = get<{ etsy_order_id: string }>('SELECT etsy_order_id FROM orders WHERE id = ? AND shop_id = ?', id, shopId)
    if (!order) return NextResponse.json({ error: 'Bestelling niet gevonden' }, { status: 404 })
    taskId = queueOrderFix(shopId, id, order.etsy_order_id)
  } else if (kind === 'task') {
    const log = get<{ task_id: string | null }>('SELECT task_id FROM activity_log WHERE id = ? AND shop_id = ?', id, shopId)
    if (!log?.task_id) return NextResponse.json({ error: 'Taak niet gevonden' }, { status: 404 })
    taskId = queueTaskRetry(shopId, log.task_id)
  } else {
    return NextResponse.json({ error: 'Onbekend soort fout' }, { status: 400 })
  }
  if (!taskId) return NextResponse.json({ error: 'Deze shop heeft geen agent voor dit werk' }, { status: 409 })

  const agent = get<{ id: string; name: string; enabled: number }>(
    'SELECT a.id, a.name, a.enabled FROM tasks t JOIN agents a ON a.id = t.agent_id AND a.shop_id = t.shop_id WHERE t.id = ?', taskId
  )
  engine.wake(shopId, agent?.id)
  return NextResponse.json({
    ok: true,
    agent: agent?.name ?? null,
    // A paused agent keeps the task until it is switched on again
    paused: agent ? agent.enabled === 0 : false,
  })
}
