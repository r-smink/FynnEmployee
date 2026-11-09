import { v4 as uuid } from 'uuid'
import { get, run } from './db'
import { getSetting } from './ai'
import type { Task, TaskType } from '@/agents/types'

// Work that goes before an agent's own rhythm: assignments from the owner and fixes for things that failed.
// Queued tasks have priority > 0 (ordinary tasks keep 0); the engine starts the highest one as soon as the agent is free.

export const PRIORITY = { normal: 1, high: 2, urgent: 3 } as const
export const PRIORITY_LABEL: Record<number, string> = { 1: 'Normaal', 2: 'Hoog', 3: 'Urgent' }

// The owner can switch automatic fixes off on Fouten
export const autoFixEnabled = () => getSetting('auto_fix') !== '0'

// Seconds an automatic fix waits, so a hiccup at Etsy or Printful has passed
const AUTO_FIX_DELAY = 120

interface Enqueue {
  shopId: string
  agentId: string
  type: TaskType
  title: string
  description?: string
  input?: Record<string, unknown>
  priority: number
  delaySeconds?: number
}

// Returns the task id; a fix still waiting for the same thing is reused instead of queued twice.
// One that is running doesn't count: when it fails, its automatic follow-up must still be queued.
export function enqueue(t: Enqueue): string {
  const input = t.input ? JSON.stringify(t.input) : null
  if (input && t.type !== 'owner_task') {
    const waiting = get<{ id: string }>(
      "SELECT id FROM tasks WHERE shop_id = ? AND type = ? AND input_data = ? AND status = 'queued' AND priority > 0",
      t.shopId, t.type, input
    )
    if (waiting) return waiting.id
  }
  const id = uuid()
  run(
    `INSERT INTO tasks (id, shop_id, agent_id, type, title, description, status, priority, input_data, run_after, demo)
     VALUES (?, ?, ?, ?, ?, ?, 'queued', ?, ?, ${t.delaySeconds ? "datetime('now', ?)" : '?'}, 0)`,
    id, t.shopId, t.agentId, t.type, t.title, t.description ?? null, t.priority, input,
    t.delaySeconds ? `+${t.delaySeconds} seconds` : null
  )
  return id
}

export function nextQueuedTask(shopId: string, agentId: string): Task | undefined {
  return get<Task>(
    `SELECT * FROM tasks WHERE shop_id = ? AND agent_id = ? AND status = 'queued' AND priority > 0
       AND (run_after IS NULL OR run_after <= datetime('now'))
     ORDER BY priority DESC, created_at LIMIT 1`,
    shopId, agentId
  )
}

export const agentFor = (shopId: string, templateType: string) =>
  get<{ id: string; name: string }>('SELECT id, name FROM agents WHERE shop_id = ? AND template_type = ? LIMIT 1', shopId, templateType)

// ─── Fixes ────────────────────────────────────────────────

export function queuePublishFix(shopId: string, productId: string, title: string, opts: { auto?: boolean; priority?: number } = {}): string | null {
  const marcus = agentFor(shopId, 'listing')
  if (!marcus) return null
  return enqueue({
    shopId, agentId: marcus.id, type: 'fix_publish', input: { productId },
    title: `Opnieuw naar Etsy: "${title}"`,
    description: opts.auto ? 'Automatisch opnieuw geprobeerd na een fout' : 'Gevraagd door de eigenaar',
    priority: opts.priority ?? PRIORITY.high, delaySeconds: opts.auto ? AUTO_FIX_DELAY : undefined,
  })
}

export function queueOrderFix(shopId: string, orderId: string, label: string, opts: { auto?: boolean; priority?: number } = {}): string | null {
  const aria = agentFor(shopId, 'fulfillment')
  if (!aria) return null
  return enqueue({
    shopId, agentId: aria.id, type: 'fix_order', input: { orderId },
    title: `Bestelling opnieuw naar Printful: ${label}`,
    description: opts.auto ? 'Automatisch opnieuw geprobeerd na een fout' : 'Gevraagd door de eigenaar',
    priority: opts.priority ?? PRIORITY.urgent, delaySeconds: opts.auto ? AUTO_FIX_DELAY : undefined,
  })
}

// A failed task of any agent, queued again for the same agent
export function queueTaskRetry(shopId: string, taskId: string): string | null {
  const task = get<Task>('SELECT * FROM tasks WHERE id = ? AND shop_id = ?', taskId, shopId)
  if (!task) return null
  return enqueue({
    shopId, agentId: task.agent_id, type: task.type, title: task.title, description: task.description ?? undefined,
    input: { ...(task.input_data ? JSON.parse(task.input_data) : {}), retryOf: task.id },
    priority: Math.max(task.priority, PRIORITY.high),
  })
}
