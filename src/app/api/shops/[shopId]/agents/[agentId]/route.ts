import { NextRequest, NextResponse } from 'next/server'
import { get, run } from '@/lib/db'
import { engine } from '@/agents/engine'

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
    if (['name', 'role', 'description', 'color', 'custom_prompt'].includes(key)) {
      updates.push(`${key} = ?`)
      values.push(value)
    }
  }

  if (updates.length > 0) {
    updates.push("updated_at = datetime('now')")
    values.push(agentId, shopId)
    run(`UPDATE agents SET ${updates.join(', ')} WHERE id = ? AND shop_id = ?`, ...values)
  }

  const agent = get('SELECT * FROM agents WHERE id = ? AND shop_id = ?', agentId, shopId)
  return NextResponse.json(agent)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ shopId: string; agentId: string }> }) {
  const { shopId, agentId } = await params
  run('DELETE FROM agents WHERE id = ? AND shop_id = ? AND is_custom = 1', agentId, shopId)
  engine.removeAgent(shopId, agentId)
  return NextResponse.json({ success: true })
}
