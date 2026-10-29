import type { OfficeGrid, Room } from '@/lib/office'

// Half tile size in screen units; a tile is a 200×100 diamond
export const HW = 100
export const HH = 50
export const WALL = 54
const MARGIN_X = 50
const MARGIN_TOP = WALL + 14
const MARGIN_BOTTOM = 44

export interface Pt { x: number; y: number }

export interface IsoLayout {
  width: number
  height: number
  // grid node (col,row) -> screen point
  P: (col: number, row: number) => Pt
}

export function isoLayout(grid: OfficeGrid): IsoLayout {
  const offX = grid.rows * HW + MARGIN_X
  const offY = MARGIN_TOP
  return {
    width: (grid.cols + grid.rows) * HW + MARGIN_X * 2,
    height: (grid.cols + grid.rows) * HH + MARGIN_TOP + MARGIN_BOTTOM,
    P: (col, row) => ({ x: (col - row) * HW + offX, y: (col + row) * HH + offY }),
  }
}

const pt = (p: Pt) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`
const up = (p: Pt) => `${p.x.toFixed(1)},${(p.y - WALL).toFixed(1)}`

export function diamond(L: IsoLayout, col: number, row: number, w = 1, d = 1): string {
  return `${pt(L.P(col, row))} ${pt(L.P(col + w, row))} ${pt(L.P(col + w, row + d))} ${pt(L.P(col, row + d))}`
}

// Rooms are inset inside their tiles so corridors run between them (2×INSET wide)
export const INSET = 0.12
const DOOR_HALF = 0.17
const DOOR_H = 36

type Rect = Pick<Room, 'col' | 'row' | 'width' | 'depth'>

export function roomGeometry(L: IsoLayout, room: Rect) {
  const { col, row, width: w, depth: d } = room
  const c0 = col + INSET, r0 = row + INSET, c1 = col + w - INSET, r1 = row + d - INSET
  const N = L.P(c0, r0), E = L.P(c1, r0), S = L.P(c1, r1), W = L.P(c0, r1)
  const C = L.P(col + w / 2, row + d / 2)
  // Doorway in the open front-right (south-east) side, centered on the room's depth
  const dm = row + d / 2
  const D1 = L.P(c1, dm + DOOR_HALF), D2 = L.P(c1, dm - DOOR_HALF)
  const doorUp = (p: Pt) => `${p.x.toFixed(1)},${(p.y - DOOR_H).toFixed(1)}`
  return {
    floor: diamond(L, c0, r0, c1 - c0, r1 - r0),
    // Walls stand on the back edges so the front of every room is open
    leftWall: `${pt(W)} ${pt(N)} ${up(N)} ${up(W)}`,
    rightWall: `${pt(N)} ${pt(E)} ${up(E)} ${up(N)}`,
    // Door frame (post, lintel, post) and a doormat in front of it
    doorFrame: `${pt(D1)} ${doorUp(D1)} ${doorUp(D2)} ${pt(D2)}`,
    doorMat: diamond(L, c1, dm - DOOR_HALF, 2 * INSET * 0.8, 2 * DOOR_HALF),
    center: C,
    label: { x: C.x, y: S.y + 16 },
    // free floor spots for decoration in bigger rooms
    corners: [L.P(c0 + 0.22, r1 - 0.22), L.P(c1 - 0.22, r0 + 0.22)],
  }
}

// Corridor floor: the whole office grown by INSET so the outer corridor is as wide as the inner ones
export function corridorFloor(L: IsoLayout, grid: OfficeGrid): string {
  return diamond(L, -INSET, -INSET, grid.cols + 2 * INSET, grid.rows + 2 * INSET)
}

// Grid point just outside a room's door, in the middle of the corridor
function doorway(r: Rect): [number, number] {
  return [r.col + r.width, r.row + r.depth / 2]
}

// A corridor segment on a grid line is blocked when a room spans across that line
function blocked(rooms: Rect[], vertical: boolean, line: number, from: number): boolean {
  return rooms.some(r => vertical
    ? r.col < line && line < r.col + r.width && r.row <= from && from + 1 <= r.row + r.depth
    : r.row < line && line < r.row + r.depth && r.col <= from && from + 1 <= r.col + r.width)
}

// Walking route (grid coords) from room a to room b: center → door → corridors → door → center
export function corridorRoute(rooms: Rect[], grid: OfficeGrid, a: Rect, b: Rect): [number, number][] {
  const [ax, ay] = doorway(a), [bx, by] = doorway(b)
  const key = (c: number, r: number) => r * (grid.cols + 1) + c
  const starts = [...new Set([Math.floor(ay), Math.ceil(ay)])]
  const goals = new Set([Math.floor(by), Math.ceil(by)].map(r => key(bx, r)))

  // BFS over grid nodes along free corridor segments
  const prev = new Map<number, number>()
  const queue: number[] = []
  for (const r of starts) { const k = key(ax, r); prev.set(k, -1); queue.push(k) }
  let end = -1
  while (queue.length) {
    const k = queue.shift()!
    if (goals.has(k)) { end = k; break }
    const c = k % (grid.cols + 1), r = Math.floor(k / (grid.cols + 1))
    const next: [number, number, boolean][] = [
      [c + 1, r, c < grid.cols && !blocked(rooms, false, r, c)],
      [c - 1, r, c > 0 && !blocked(rooms, false, r, c - 1)],
      [c, r + 1, r < grid.rows && !blocked(rooms, true, c, r)],
      [c, r - 1, r > 0 && !blocked(rooms, true, c, r - 1)],
    ]
    for (const [nc, nr, ok] of next) {
      const nk = key(nc, nr)
      if (ok && !prev.has(nk)) { prev.set(nk, k); queue.push(nk) }
    }
  }

  const middle: [number, number][] = []
  for (let k = end; k >= 0; k = prev.get(k)!) middle.unshift([k % (grid.cols + 1), Math.floor(k / (grid.cols + 1))])
  return [
    [a.col + a.width / 2, a.row + a.depth / 2], [ax, ay],
    ...middle,
    [bx, by], [b.col + b.width / 2, b.row + b.depth / 2],
  ]
}

// Back-to-front paint order
export function paintOrder<T extends Pick<Room, 'col' | 'row'>>(rooms: T[]): T[] {
  return [...rooms].sort((a, b) => (a.col + a.row) - (b.col + b.row) || a.col - b.col)
}
