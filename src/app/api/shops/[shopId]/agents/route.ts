import { NextRequest, NextResponse } from 'next/server'
import { all, run, get } from '@/lib/db'
import { engine } from '@/agents/engine'
import { v4 as uuid } from 'uuid'

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ shopId: string }> }) {
  const { shopId } = await params
  engine.ensureShopStarted(shopId)

  const agents = all('SELECT * FROM agents WHERE shop_id = ? ORDER BY is_manager DESC, id', shopId)

  const enriched = (agents as any[]).map((agent) => {
    let currentTask = null
    if (agent.current_task_id) {
      currentTask = get('SELECT * FROM tasks WHERE id = ?', agent.current_task_id) || null
    }
    const recentActivity = all(
      'SELECT * FROM activity_log WHERE agent_id = ? AND shop_id = ? ORDER BY created_at DESC LIMIT 5',
      agent.id, shopId
    )
    return { ...agent, currentTask, recentActivity }
  })

  return NextResponse.json(enriched)
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ shopId: string }> }) {
  const { shopId } = await params
  const body = await request.json()
  const id = body.id || uuid().substring(0, 8)

  run(
    `INSERT INTO agents (id, shop_id, name, role, description, color, template_type, is_custom, custom_prompt, avatar_url)
     VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
    id, shopId, body.name, body.role || 'Custom Agent', body.description || '',
    body.color || '#8888aa', body.templateType || 'custom', body.customPrompt || null,
    `/agents/custom.svg`
  )

  const agent = get('SELECT * FROM agents WHERE id = ? AND shop_id = ?', id, shopId)

  // Add to running engine
  if (agent) {
    engine.addAgent(shopId, agent as any)
  }

  return NextResponse.json(agent)
}
