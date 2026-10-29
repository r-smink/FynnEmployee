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

export function roomGeometry(L: IsoLayout, room: Pick<Room, 'col' | 'row' | 'width' | 'depth'>) {
  const { col, row, width: w, depth: d } = room
  const E = L.P(col + w, row), S = L.P(col + w, row + d), W = L.P(col, row + d)
  const C = L.P(col + w / 2, row + d / 2)
  return {
    floor: diamond(L, col, row, w, d),
    leftWall: `${pt(W)} ${pt(S)} ${up(S)} ${up(W)}`,
    rightWall: `${pt(S)} ${pt(E)} ${up(E)} ${up(S)}`,
    center: C,
    label: { x: C.x, y: S.y + 16 },
    // free floor spots for decoration in bigger rooms
    corners: [L.P(col + 0.3, row + d - 0.3), L.P(col + w - 0.3, row + 0.3)],
  }
}

// Back-to-front paint order
export function paintOrder<T extends Pick<Room, 'col' | 'row'>>(rooms: T[]): T[] {
  return [...rooms].sort((a, b) => (a.col + a.row) - (b.col + b.row) || a.col - b.col)
}
