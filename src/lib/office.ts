// Shared (client + server) office model: room functions, layout validation and defaults.

export type RoomFunction =
  | 'manager' | 'design' | 'listing' | 'analytics' | 'support'
  | 'rnd' | 'packaging' | 'fulfillment' | 'shipping'
  | 'meeting' | 'lounge'
  | 'photo' | 'warehouse' | 'marketing' | 'canteen'

export interface Room {
  id: string
  shop_id: string
  name: string
  function: RoomFunction
  color: string
  col: number
  row: number
  width: number
  depth: number
  agent_id: string | null
}

export interface OfficeGrid {
  cols: number
  rows: number
}

export interface RoomFunctionDef {
  label: string
  color: string
  description: string
  handles: string
  // Agent template that is placed in this room by default
  agentTemplate: string | null
}

export const ROOM_FUNCTIONS: Record<RoomFunction, RoomFunctionDef> = {
  manager:     { label: 'Manager Office', color: '#ffd84a', description: 'Fynn coördineert hier het hele team', handles: 'Teamoverzicht & planning', agentTemplate: 'manager' },
  design:      { label: 'Design Studio',  color: '#9e4aff', description: 'Waar de creatieve magie gebeurt', handles: 'Conceptontwerpen & collecties', agentTemplate: 'design' },
  listing:     { label: 'Listing Office', color: '#4a9eff', description: 'Hoofdkwartier voor Etsy-listings', handles: 'Actieve & concept-listings', agentTemplate: 'listing' },
  analytics:   { label: 'Analytics Lab',  color: '#ff4a9e', description: 'Datagedreven beslissingen', handles: 'Rapporten & inzichten', agentTemplate: 'analytics' },
  support:     { label: 'Support Desk',   color: '#ff9e4a', description: 'Communicatiecentrum met klanten', handles: 'Open tickets & reviews', agentTemplate: 'support' },
  rnd:         { label: 'R&D Lab',        color: '#22d3ee', description: 'Experimenten met nieuwe producten en niches', handles: 'Productonderzoek & prototypes', agentTemplate: null },
  packaging:   { label: 'Verpakking',     color: '#a3e635', description: 'Bestellingen netjes ingepakt', handles: 'Verpakkingsorders', agentTemplate: null },
  fulfillment: { label: 'Fulfillment',    color: '#2fb37a', description: 'Orderverwerking & productie', handles: 'Openstaande & verzonden orders', agentTemplate: 'fulfillment' },
  shipping:    { label: 'Verzending',     color: '#818cf8', description: 'Pakketten op weg naar de klant', handles: 'Zendingen & tracking', agentTemplate: null },
  meeting:     { label: 'Vergaderruimte', color: '#94a3b8', description: 'Overleg en dagelijkse stand-ups', handles: 'Teamoverleg', agentTemplate: null },
  lounge:      { label: 'Lounge',         color: '#f472b6', description: 'Pauzeplek voor het team', handles: 'Ontspanning', agentTemplate: null },
  photo:       { label: 'Fotostudio',     color: '#facc15', description: "Productfoto's en mockups voor listings", handles: "Foto's & mockups", agentTemplate: null },
  warehouse:   { label: 'Magazijn',       color: '#b45309', description: 'Voorraad en materialen', handles: 'Voorraadbeheer', agentTemplate: null },
  marketing:   { label: 'Marketing',      color: '#ef4444', description: 'Campagnes, social media en advertenties', handles: 'Campagnes & ads', agentTemplate: null },
  canteen:     { label: 'Kantine',        color: '#14b8a6', description: 'Lunch en koffie voor het hele team', handles: 'Lunchpauze', agentTemplate: null },
}

export const ROOM_FUNCTION_IDS = Object.keys(ROOM_FUNCTIONS) as RoomFunction[]

export const GRID_LIMITS = { min: 2, max: 14 }
export const ROOM_SIZE_MAX = 6
export const DEFAULT_GRID: OfficeGrid = { cols: 4, rows: 3 }

// Default 4x3 layout from the design
export const DEFAULT_LAYOUT: Pick<Room, 'function' | 'col' | 'row' | 'width' | 'depth'>[] = [
  { function: 'rnd',         col: 0, row: 0, width: 1, depth: 2 },
  { function: 'manager',     col: 1, row: 0, width: 2, depth: 1 },
  { function: 'design',      col: 3, row: 0, width: 1, depth: 1 },
  { function: 'listing',     col: 1, row: 1, width: 1, depth: 1 },
  { function: 'analytics',   col: 2, row: 1, width: 1, depth: 1 },
  { function: 'support',     col: 3, row: 1, width: 1, depth: 1 },
  { function: 'packaging',   col: 0, row: 2, width: 1, depth: 1 },
  { function: 'fulfillment', col: 1, row: 2, width: 2, depth: 1 },
  { function: 'shipping',    col: 3, row: 2, width: 1, depth: 1 },
]

type Rect = Pick<Room, 'col' | 'row' | 'width' | 'depth'>

export function roomsOverlap(a: Rect, b: Rect): boolean {
  return a.col < b.col + b.width && b.col < a.col + a.width &&
    a.row < b.row + b.depth && b.row < a.row + a.depth
}

export function fitsGrid(r: Rect, grid: OfficeGrid): boolean {
  return r.col >= 0 && r.row >= 0 && r.width >= 1 && r.depth >= 1 &&
    r.col + r.width <= grid.cols && r.row + r.depth <= grid.rows
}

// Returns a Dutch error message, or null when the room can be placed
export function validatePlacement(room: Rect & { id?: string }, others: (Rect & { id: string })[], grid: OfficeGrid): string | null {
  const ints = [room.col, room.row, room.width, room.depth].every(Number.isInteger)
  if (!ints) return 'Positie en grootte moeten hele getallen zijn'
  if (room.width > ROOM_SIZE_MAX || room.depth > ROOM_SIZE_MAX) return `Een kamer is maximaal ${ROOM_SIZE_MAX}×${ROOM_SIZE_MAX} tegels`
  if (!fitsGrid(room, grid)) return 'De kamer valt buiten het kantoor'
  const hit = others.find(o => o.id !== room.id && roomsOverlap(room, o))
  if (hit) return 'De kamer overlapt met een andere kamer'
  return null
}

// First free top-left position where a w×d room fits, or null
export function findFreeSpot(rooms: Rect[], grid: OfficeGrid, width = 1, depth = 1): { col: number; row: number } | null {
  for (let row = 0; row + depth <= grid.rows; row++) {
    for (let col = 0; col + width <= grid.cols; col++) {
      const cand = { col, row, width, depth }
      if (!rooms.some(r => roomsOverlap(cand, r))) return { col, row }
    }
  }
  return null
}

export function isRoomFunction(v: unknown): v is RoomFunction {
  return typeof v === 'string' && v in ROOM_FUNCTIONS
}
