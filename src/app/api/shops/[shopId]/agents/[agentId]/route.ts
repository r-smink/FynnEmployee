import { NextRequest, NextResponse } from 'next/server'
import { get, run } from '@/lib/db'
import { engine } from '@/agents/engine'
import type { Agent } from '@/agents/types'

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ shopId: string; agentId: string }> }) {
  const { shopId, agentId } = await params
  const agent = get('SELECT * FROM agents WHERE id = ? AND shop_id = ?', agentId, shopId)
  if (!agent) return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
  return NextResponse.json(agent)
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ shopId: string; agentId: string }> }) {
  const { shopId, agentId } = await params
  const body = await request.json()

  const updates: string[] = []
  const values: unknown[] = []

  for (const [key, value] of Object.entries(body)) {
    if (['name', 'role', 'description', 'color', 'custom_prompt', 'model'].includes(key)) {
      updates.push(`${key} = ?`)
      // empty model/prompt means "use the default"
      values.push((key === 'model' || key === 'custom_prompt') && typeof value === 'string' && !value.trim() ? null : value)
    }
  }

  if (updates.length > 0) {
    updates.push("updated_at = datetime('now')")
    values.push(agentId, shopId)
    run(`UPDATE agents SET ${updates.join(', ')} WHERE id = ? AND shop_id = ?`, ...values)
  }

  // On/off goes through the live agent so the engine stops (or resumes) picking up tasks
  if (typeof body.enabled === 'boolean') {
    const live = engine.getShopAgents(shopId).get(agentId)
    if (live) live.setEnabled(body.enabled)
    else run('UPDATE agents SET enabled = ? WHERE id = ? AND shop_id = ?', body.enabled ? 1 : 0, agentId, shopId)
  }

  const agent = get<Agent>('SELECT * FROM agents WHERE id = ? AND shop_id = ?', agentId, shopId)

  // Keep the running agent in sync so changes apply to its next task
  const live = agent && engine.getShopAgents(shopId).get(agentId)
  if (agent && live) {
    live.name = agent.name
    live.color = agent.color
    live.customPrompt = agent.custom_prompt || undefined
    live.model = agent.model || undefined
  }

  return NextResponse.json(agent)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ shopId: string; agentId: string }> }) {
  const { shopId, agentId } = await params
  run('DELETE FROM agents WHERE id = ? AND shop_id = ? AND is_custom = 1', agentId, shopId)
  run('UPDATE rooms SET agent_id = NULL WHERE shop_id = ? AND agent_id = ?', shopId, agentId)
  engine.removeAgent(shopId, agentId)
  return NextResponse.json({ success: true })
}
