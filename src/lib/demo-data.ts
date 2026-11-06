import { db, get, run } from './db'
import { isAiEnabled } from './ai'
import { isEtsyConnected } from '@/integrations/etsy/client'
import { isPrintfulConnected } from '@/integrations/printful/client'

// Removes everything agents simulated in demo mode, so AI Live starts from a clean slate.
// Orders and products are never simulated (they only come in through Etsy), so they stay.
export function purgeDemoData(): number {
  return db.transaction(() => {
    const removed = run('DELETE FROM tasks WHERE demo = 1').changes
    run('DELETE FROM activity_log WHERE demo = 1')
    run(`UPDATE agents SET
      tasks_completed = (SELECT COUNT(*) FROM tasks t WHERE t.agent_id = agents.id AND t.shop_id = agents.shop_id AND t.status = 'completed'),
      current_task_id = CASE WHEN current_task_id IN (SELECT id FROM tasks) THEN current_task_id ELSE NULL END`)
    return removed
  })()
}

// Call after any settings change: once AI is really live, demo leftovers are wiped
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
