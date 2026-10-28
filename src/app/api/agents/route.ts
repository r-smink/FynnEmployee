import { NextResponse } from 'next/server'
import { all } from '@/lib/db'
import { engine } from '@/agents/engine'

export const dynamic = 'force-dynamic'

export async function GET() {
  engine.ensureStarted()
  const agents = all('SELECT * FROM agents ORDER BY id')

  // Attach current task info
  const enriched = agents.map((agent: any) => {
    let currentTask = null
    if (agent.current_task_id) {
      currentTask = all('SELECT * FROM tasks WHERE id = ?', agent.current_task_id)[0] || null
    }
    const recentActivity = all(
      'SELECT * FROM activity_log WHERE agent_id = ? ORDER BY created_at DESC LIMIT 5',
      agent.id
    )
    return { ...agent, currentTask, recentActivity }
  })

  return NextResponse.json(enriched)
}
