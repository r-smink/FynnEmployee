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

export function getRooms(shopId: string): Room[] {
  return all<Room>('SELECT * FROM rooms WHERE shop_id = ? ORDER BY row, col', shopId)
}

export function getRoom(shopId: string, roomId: string): Room | undefined {
  return get<Room>('SELECT * FROM rooms WHERE id = ? AND shop_id = ?', roomId, shopId)
}

// Lazily seed the default layout the first time a shop's office is opened
export function ensureRooms(shopId: string) {
  const { count } = get<{ count: number }>('SELECT COUNT(*) as count FROM rooms WHERE shop_id = ?', shopId)!
  if (count > 0) return

  const agents = all<{ id: string; template_type: string }>('SELECT id, template_type FROM agents WHERE shop_id = ?', shopId)
  const insert = db.prepare(
    `INSERT INTO rooms (id, shop_id, name, function, color, col, row, width, depth, agent_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
  db.transaction(() => {
    for (const r of DEFAULT_LAYOUT) {
      const def = ROOM_FUNCTIONS[r.function]
      const agent = def.agentTemplate ? agents.find(a => a.template_type === def.agentTemplate) : undefined
      insert.run(uuid(), shopId, def.label, r.function, def.color, r.col, r.row, r.width, r.depth, agent?.id ?? null)
    }
  })()
  setShopSetting(shopId, 'office_cols', String(DEFAULT_GRID.cols))
  setShopSetting(shopId, 'office_rows', String(DEFAULT_GRID.rows))
}

// An agent works in at most one room
export function releaseAgent(shopId: string, agentId: string, exceptRoomId?: string) {
  run(
    `UPDATE rooms SET agent_id = NULL, updated_at = datetime('now') WHERE shop_id = ? AND agent_id = ? AND id != ?`,
    shopId, agentId, exceptRoomId ?? ''
  )
}
