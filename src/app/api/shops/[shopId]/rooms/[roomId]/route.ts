import { NextRequest, NextResponse } from 'next/server'
import { run } from '@/lib/db'
import { getGrid, getRoom, getRooms, parseAgentIds, setRoomAgents } from '@/lib/rooms'
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
  }

  const error = validatePlacement(next, getRooms(shopId), getGrid(shopId))
  if (error) return NextResponse.json({ error }, { status: 400 })
  const agentIds = parseAgentIds(body.agent_ids)
  if (agentIds === null) return NextResponse.json({ error: 'agent_ids moet een lijst zijn' }, { status: 400 })
  if (agentIds) {
    const agentError = setRoomAgents(shopId, roomId, agentIds)
    if (agentError) return NextResponse.json({ error: agentError }, { status: 400 })
  }

  run(
    `UPDATE rooms SET name = ?, function = ?, color = ?, col = ?, row = ?, width = ?, depth = ?,
     updated_at = datetime('now') WHERE id = ? AND shop_id = ?`,
    next.name, next.function, next.color, next.col, next.row, next.width, next.depth, roomId, shopId
  )
  return NextResponse.json(getRoom(shopId, roomId))
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { shopId, roomId } = await params
  run('DELETE FROM rooms WHERE id = ? AND shop_id = ?', roomId, shopId)
  // Its agents go back to walking the corridors
  run('UPDATE agents SET room_id = NULL WHERE shop_id = ? AND room_id = ?', shopId, roomId)
  return NextResponse.json({ success: true })
}
