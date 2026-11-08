import { v4 as uuid } from 'uuid'
import { all, get, run, db } from './db'
import { getShopSetting, setShopSetting } from './shop-settings'
import { DEFAULT_GRID, DEFAULT_LAYOUT, GRID_LIMITS, ROOM_FUNCTIONS, fitsGrid } from './office'
import type { OfficeGrid, Room } from './office'

export function getGrid(shopId: string): OfficeGrid {
  const cols = parseInt(getShopSetting(shopId, 'office_cols') || '', 10)
  const rows = parseInt(getShopSetting(shopId, 'office_rows') || '', 10)
  return {
    cols: Number.isInteger(cols) ? cols : DEFAULT_GRID.cols,
    rows: Number.isInteger(rows) ? rows : DEFAULT_GRID.rows,
  }
}

// Returns an error message when rooms would no longer fit
export function setGrid(shopId: string, grid: OfficeGrid): string | null {
  const { cols, rows } = grid
  const valid = [cols, rows].every(n => Number.isInteger(n) && n >= GRID_LIMITS.min && n <= GRID_LIMITS.max)
  if (!valid) return `Kantoorgrootte moet tussen ${GRID_LIMITS.min} en ${GRID_LIMITS.max} tegels liggen`
  if (getRooms(shopId).some(r => !fitsGrid(r, grid))) return 'Er staan kamers buiten dit formaat — verplaats of verklein die eerst'
  setShopSetting(shopId, 'office_cols', String(cols))
  setShopSetting(shopId, 'office_rows', String(rows))
  return null
}

type RoomRow = Omit<Room, 'agent_ids'>

// Agents of a room in a fixed order: the manager first, then by name
function withAgents(shopId: string, rows: RoomRow[]): Room[] {
  const agents = all<{ id: string; room_id: string }>(
    'SELECT id, room_id FROM agents WHERE shop_id = ? AND room_id IS NOT NULL ORDER BY is_manager DESC, name', shopId
  )
  return rows.map(r => ({ ...r, agent_ids: agents.filter(a => a.room_id === r.id).map(a => a.id) }))
}

export function getRooms(shopId: string): Room[] {
  return withAgents(shopId, all<RoomRow>('SELECT id, shop_id, name, function, color, col, row, width, depth FROM rooms WHERE shop_id = ? ORDER BY row, col', shopId))
}

export function getRoom(shopId: string, roomId: string): Room | undefined {
  const row = get<RoomRow>('SELECT id, shop_id, name, function, color, col, row, width, depth FROM rooms WHERE id = ? AND shop_id = ?', roomId, shopId)
  return row && withAgents(shopId, [row])[0]
}

// Lazily seed the default layout the first time a shop's office is opened
export function ensureRooms(shopId: string) {
  const { count } = get<{ count: number }>('SELECT COUNT(*) as count FROM rooms WHERE shop_id = ?', shopId)!
  if (count > 0) return

  const agents = all<{ id: string; template_type: string }>('SELECT id, template_type FROM agents WHERE shop_id = ?', shopId)
  const insert = db.prepare(
    `INSERT INTO rooms (id, shop_id, name, function, color, col, row, width, depth)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
  db.transaction(() => {
    for (const r of DEFAULT_LAYOUT) {
      const def = ROOM_FUNCTIONS[r.function]
      const roomId = uuid()
      insert.run(roomId, shopId, def.label, r.function, def.color, r.col, r.row, r.width, r.depth)
      const agent = def.agentTemplate ? agents.find(a => a.template_type === def.agentTemplate) : undefined
      if (agent) run('UPDATE agents SET room_id = ? WHERE id = ? AND shop_id = ?', roomId, agent.id, shopId)
    }
  })()
  setShopSetting(shopId, 'office_cols', String(DEFAULT_GRID.cols))
  setShopSetting(shopId, 'office_rows', String(DEFAULT_GRID.rows))
}

// Puts exactly these agents in the room; they leave any other room. Returns an error message or null.
export function setRoomAgents(shopId: string, roomId: string, agentIds: string[]): string | null {
  const ids = [...new Set(agentIds)]
  const known = all<{ id: string }>('SELECT id FROM agents WHERE shop_id = ?', shopId).map(a => a.id)
  if (ids.some(id => !known.includes(id))) return 'Agent niet gevonden'
  db.transaction(() => {
    run('UPDATE agents SET room_id = NULL WHERE shop_id = ? AND room_id = ?', shopId, roomId)
    for (const id of ids) run('UPDATE agents SET room_id = ? WHERE id = ? AND shop_id = ?', roomId, id, shopId)
  })()
  return null
}

// Reads agent_ids from a request body: a list of ids, or undefined when the body leaves it out
export function parseAgentIds(value: unknown): string[] | undefined | null {
  if (value === undefined) return undefined
  if (!Array.isArray(value) || value.some(v => typeof v !== 'string')) return null
  return value
}
