import { db, get, run } from './db'
import { isAiEnabled } from './ai'
import { isEtsyConnected } from '@/integrations/etsy/client'
import { isPrintfulConnected } from '@/integrations/printful/client'

// Removes everything that is not real, so AI Live starts from a clean slate:
// - tasks and activity simulated in demo mode
// - products that are neither on Etsy nor a real design by Luna (older versions marked these "listed" without publishing)
// - orders that did not come in from Etsy
export function purgeDemoData(): number {
  return db.transaction(() => {
    const removed = run('DELETE FROM tasks WHERE demo = 1').changes
    run('DELETE FROM activity_log WHERE demo = 1')
    run("DELETE FROM products WHERE etsy_listing_id IS NULL AND design_url IS NULL AND status NOT IN ('rejected', 'deleted')")
    run('DELETE FROM orders WHERE etsy_order_id IS NULL')
    run(`UPDATE agents SET
      tasks_completed = (SELECT COUNT(*) FROM tasks t WHERE t.agent_id = agents.id AND t.shop_id = agents.shop_id AND t.status = 'completed'),
      current_task_id = CASE WHEN current_task_id IN (SELECT id FROM tasks) THEN current_task_id ELSE NULL END`)
    return removed
  })()
}

// Call after any settings change and at startup: once AI is really live, demo leftovers are wiped
export function purgeDemoDataIfLive() {
  if (isAiEnabled()) purgeDemoData()
}

// What the "is it really live?" indicator shows
export function getLiveStatus() {
  const last = get<{ at: string | null }>(
    "SELECT MAX(completed_at) AS at FROM tasks WHERE demo = 0 AND status = 'completed' AND output_data IS NOT NULL"
  )
  return {
    etsy_connected: isEtsyConnected() ? 'true' : 'false',
    printful_connected: isPrintfulConnected() ? 'true' : 'false',
    last_ai_task_at: last?.at ?? null,
  }
}
