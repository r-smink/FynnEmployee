import { NextRequest, NextResponse } from 'next/server'
import { get, run } from '@/lib/db'
import { getGrid, getRoom, getRooms, releaseAgent } from '@/lib/rooms'
import { isRoomFunction, validatePlacement } from '@/lib/office'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ shopId: string; roomId: string }> }

export async function PATCH(request: NextRequest, { params }: Params) {
  const { shopId, roomId } = await params
  const current = getRoom(shopId, roomId)
  if (!current) return NextResponse.json({ error: 'Kamer niet gevonden' }, { status: 404 })

  const body = await request.json()
  if (body.function !== undefined && !isRoomFunction(body.function)) {
    return NextResponse.json({ error: 'Onbekende kamerfunctie' }, { status: 400 })
  }

  const next = {
    ...current,
    name: typeof body.name === 'string' && body.name.trim() ? body.name.trim() : current.name,
    function: body.function ?? current.function,
    color: typeof body.color === 'string' && body.color ? body.color : current.color,
    col: body.col !== undefined ? Number(body.col) : current.col,
    row: body.row !== undefined ? Number(body.row) : current.row,
    width: body.width !== undefined ? Number(body.width) : current.width,
    depth: body.depth !== undefined ? Number(body.depth) : current.depth,
    agent_id: body.agent_id !== undefined ? (body.agent_id || null) : current.agent_id,
  }

  const error = validatePlacement(next, getRooms(shopId), getGrid(shopId))
  if (error) return NextResponse.json({ error }, { status: 400 })
  if (next.agent_id && !get('SELECT id FROM agents WHERE id = ? AND shop_id = ?', next.agent_id, shopId)) {
    return NextResponse.json({ error: 'Agent niet gevonden' }, { status: 400 })
  }

  if (next.agent_id) releaseAgent(shopId, next.agent_id, roomId)
  run(
    `UPDATE rooms SET name = ?, function = ?, color = ?, col = ?, row = ?, width = ?, depth = ?, agent_id = ?,
     updated_at = datetime('now') WHERE id = ? AND shop_id = ?`,
    next.name, next.function, next.color, next.col, next.row, next.width, next.depth, next.agent_id, roomId, shopId
  )
  return NextResponse.json(getRoom(shopId, roomId))
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { shopId, roomId } = await params
  run('DELETE FROM rooms WHERE id = ? AND shop_id = ?', roomId, shopId)
  return NextResponse.json({ success: true })
}
