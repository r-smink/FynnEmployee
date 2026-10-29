// Convert grid coordinates to isometric screen coordinates
export const TILE_WIDTH = 200
export const TILE_HEIGHT = 100

export function toIso(col: number, row: number): { x: number; y: number } {
  return {
    x: (col - row) * (TILE_WIDTH / 2),
    y: (col + row) * (TILE_HEIGHT / 2),
  }
}

// Room definitions with grid positions
export interface RoomDef {
  id: string
  name: string
  agentTemplate: string  // which agent template_type belongs here
  col: number
  row: number
  color: string
}

export const ROOMS: RoomDef[] = [
  { id: 'manager',     name: 'Manager Office',    agentTemplate: 'manager',     col: 1, row: 0, color: '#ffe04a' },
  { id: 'design',      name: 'Design Studio',     agentTemplate: 'design',      col: 0, row: 1, color: '#9e4aff' },
  { id: 'listing',     name: 'Listing Office',    agentTemplate: 'listing',     col: 2, row: 1, color: '#4a9eff' },
  { id: 'analytics',   name: 'Analytics Lab',     agentTemplate: 'analytics',   col: 0, row: 2, color: '#ff4a9e' },
  { id: 'fulfillment', name: 'Fulfillment Room',  agentTemplate: 'fulfillment', col: 1, row: 2, color: '#4aff9e' },
  { id: 'support',     name: 'Support Desk',      agentTemplate: 'support',     col: 2, row: 2, color: '#ff9e4a' },
]

// Get center position for a room in screen coords
export function getRoomCenter(room: RoomDef): { x: number; y: number } {
  const iso = toIso(room.col, room.row)
  return { x: iso.x, y: iso.y }
}

// SVG viewBox dimensions to fit all rooms
export const VIEW_WIDTH = 900
export const VIEW_HEIGHT = 500
export const VIEW_OFFSET_X = VIEW_WIDTH / 2
export const VIEW_OFFSET_Y = 60
