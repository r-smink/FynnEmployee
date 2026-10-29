import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuid } from 'uuid'
import { get, run } from '@/lib/db'
import { ensureRooms, getGrid, getRooms, getRoom, releaseAgent, setGrid } from '@/lib/rooms'
import { ROOM_FUNCTIONS, isRoomFunction, validatePlacement } from '@/lib/office'

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ shopId: string }> }) {
  const { shopId } = await params
  ensureRooms(shopId)
  return NextResponse.json({ grid: getGrid(shopId), rooms: getRooms(shopId) })
}

// Create a room
export async function POST(request: NextRequest, { params }: { params: Promise<{ shopId: string }> }) {
  const { shopId } = await params
  const body = await request.json()
  const fn: unknown = body.function
  if (!isRoomFunction(fn)) {
    return NextResponse.json({ error: 'Onbekende kamerfunctie' }, { status: 400 })
  }
  const def = ROOM_FUNCTIONS[fn]
  const room = {
    id: uuid(),
    name: (typeof body.name === 'string' && body.name.trim()) || def.label,
    color: typeof body.color === 'string' && body.color ? body.color : def.color,
    col: Number(body.col), row: Number(body.row),
    width: Number(body.width ?? 1), depth: Number(body.depth ?? 1),
    agent_id: typeof body.agent_id === 'string' && body.agent_id ? body.agent_id : null,
  }

  const error = validatePlacement(room, getRooms(shopId), getGrid(shopId))
  if (error) return NextResponse.json({ error }, { status: 400 })
  if (room.agent_id && !get('SELECT id FROM agents WHERE id = ? AND shop_id = ?', room.agent_id, shopId)) {
    return NextResponse.json({ error: 'Agent niet gevonden' }, { status: 400 })
  }

  if (room.agent_id) releaseAgent(shopId, room.agent_id)
  run(
    `INSERT INTO rooms (id, shop_id, name, function, color, col, row, width, depth, agent_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    room.id, shopId, room.name, fn, room.color, room.col, room.row, room.width, room.depth, room.agent_id
  )
  return NextResponse.json(getRoom(shopId, room.id))
}

// Resize the office grid
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ shopId: string }> }) {
  const { shopId } = await params
  const body = await request.json()
  const error = setGrid(shopId, { cols: Number(body.cols), rows: Number(body.rows) })
  if (error) return NextResponse.json({ error }, { status: 400 })
  return NextResponse.json({ grid: getGrid(shopId), rooms: getRooms(shopId) })
}
