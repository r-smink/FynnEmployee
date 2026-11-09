import { NextRequest, NextResponse } from 'next/server'
import { all, get, run } from '@/lib/db'
import { isAiEnabled } from '@/lib/ai'
import { engine } from '@/agents/engine'
import { enqueue, PRIORITY } from '@/lib/agent-queue'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ shopId: string; agentId: string }> }

// Assignments the owner gave this agent, newest first, with the result or the reason it failed
export async function GET(_req: NextRequest, { params }: Params) {
  const { shopId, agentId } = await params
  const tasks = all<{ id: string; description: string | null; status: string; priority: number; output_data: string | null; created_at: string; completed_at: string | null }>(
    `SELECT id, description, status, priority, output_data, created_at, completed_at FROM tasks
     WHERE shop_id = ? AND agent_id = ? AND type = 'owner_task' ORDER BY created_at DESC LIMIT 10`,
    shopId, agentId
  )
  return NextResponse.json(tasks.map(t => {
    let output: { aiResponse?: string; brief?: { title?: string }; design?: string } = {}
    try { output = JSON.parse(t.output_data || '{}') } catch { /* no output */ }
    const error = t.status === 'failed'
      ? get<{ message: string }>("SELECT message FROM activity_log WHERE task_id = ? AND type = 'error' ORDER BY id DESC LIMIT 1", t.id)?.message ?? null
      : null
    return {
      id: t.id, text: t.description, status: t.status, priority: t.priority, created_at: t.created_at, completed_at: t.completed_at,
      result: output.aiResponse ?? (output.brief?.title ? `Ontwerp "${output.brief.title}" staat klaar om te beoordelen bij Producten` : null),
      design: output.design ?? null,
      error,
    }
  }))
}

// A new assignment: it goes before the agent's own work and starts as soon as the agent is free
export async function POST(request: NextRequest, { params }: Params) {
  const { shopId, agentId } = await params
  const { text, priority } = await request.json().catch(() => ({}))
  const assignment = typeof text === 'string' ? text.trim() : ''
  if (assignment.length < 3) return NextResponse.json({ error: 'Schrijf wat de agent moet doen' }, { status: 400 })
  if (assignment.length > 2000) return NextResponse.json({ error: 'Een opdracht mag maximaal 2000 tekens zijn' }, { status: 400 })
  const level = [PRIORITY.normal, PRIORITY.high, PRIORITY.urgent].includes(priority) ? priority : PRIORITY.normal
  if (!isAiEnabled()) {
    return NextResponse.json({ error: 'Opdrachten werken alleen in AI Live. Vul je OpenRouter-sleutel in bij Instellingen.' }, { status: 409 })
  }
  const agent = get<{ name: string; enabled: number }>('SELECT name, enabled FROM agents WHERE id = ? AND shop_id = ?', agentId, shopId)
  if (!agent) return NextResponse.json({ error: 'Agent niet gevonden' }, { status: 404 })

  const short = assignment.replace(/\s+/g, ' ')
  const id = enqueue({
    shopId, agentId, type: 'owner_task', priority: level, description: assignment,
    title: `Opdracht: ${short.length > 60 ? short.slice(0, 57) + '...' : short}`,
  })
  engine.wake(shopId, agentId)
  return NextResponse.json({ ok: true, id, paused: agent.enabled === 0 })
}

// Cancels an assignment that hasn't started yet
export async function DELETE(request: NextRequest, { params }: Params) {
  const { shopId, agentId } = await params
  const taskId = new URL(request.url).searchParams.get('taskId')
  const done = run(
    "DELETE FROM tasks WHERE id = ? AND shop_id = ? AND agent_id = ? AND type = 'owner_task' AND status = 'queued'",
    taskId, shopId, agentId
  )
  if (done.changes === 0) return NextResponse.json({ error: 'Deze opdracht is al gestart of klaar' }, { status: 409 })
  return NextResponse.json({ ok: true })
}
