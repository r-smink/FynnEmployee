import { NextResponse } from 'next/server'
import { all } from '@/lib/db'
import { engine } from '@/agents/engine'

export const dynamic = 'force-dynamic'

export async function GET() {
  engine.ensureShopStarted('default')
  const agents = all('SELECT * FROM agents WHERE shop_id = ? ORDER BY id', 'default')

  // Attach current task info
  const enriched = agents.map((agent: any) => {
    let currentTask = null
    if (agent.current_task_id) {
      currentTask = all('SELECT * FROM tasks WHERE id = ?', agent.current_task_id)[0] || null
    }
    const recentActivity = all(
      'SELECT * FROM activity_log WHERE agent_id = ? AND shop_id = ? ORDER BY created_at DESC LIMIT 5',
      agent.id, 'default'
    )
    return { ...agent, currentTask, recentActivity }
  })

  return NextResponse.json(enriched)
}
