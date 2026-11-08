'use client'

import { useRef, useState } from 'react'
import { GRID_LIMITS, ROOM_SIZE_MAX, fitsGrid, validatePlacement, type OfficeGrid, type Room } from '@/lib/office'
import type { AgentData } from '@/hooks/use-agents'
import { INSET, corridorFloor, corridorRoute, diamond, isoLayout, paintOrder, type Pt } from './isometric-utils'
import { IsometricRoom } from './IsometricRoom'
import { IsometricAgent } from './IsometricAgent'

export type RoomRect = Pick<Room, 'col' | 'row' | 'width' | 'depth'>

interface Props {
  grid: OfficeGrid
  rooms: Room[]
  agents: AgentData[]
  editMode?: boolean
  // 1 = fit the container width; above 1 the plan overflows and the container scrolls
  zoom?: number
  selectedRoomId?: string | null
  onAgentClick?: (agent: AgentData) => void
  onRoomClick?: (room: Room) => void
  onEmptyTileClick?: (col: number, row: number) => void
  // Edit mode: a room was dragged to a new spot or size, or the office corners were dragged
  onRoomChange?: (room: Room, rect: RoomRect) => void
  onGridChange?: (grid: OfficeGrid) => void
}

// Which corner is dragged: e grows the width (cols), w the depth (rows), s both
type Corner = 'e' | 'w' | 's'

type Drag =
  | { kind: 'room'; room: Room; corner: Corner | null; start: { col: number; row: number }; startPx: Pt; moved: boolean; rect: RoomRect }
  | { kind: 'grid'; corner: Corner; start: { col: number; row: number }; next: OfficeGrid }

// Tiles of space around the office while editing, and the most it grows in one drag
const EDIT_PAD = 2

const CORNER_CURSOR: Record<Corner, string> = { e: 'nwse-resize', w: 'nesw-resize', s: 'ns-resize' }
const CORNER_TITLE: Record<Corner, string> = { e: 'Sleep om breder of smaller te maken', w: 'Sleep om dieper of ondieper te maken', s: 'Sleep om groter of kleiner te maken' }

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v))
const rectOf = (r: RoomRect): RoomRect => ({ col: r.col, row: r.row, width: r.width, depth: r.depth })
const sameRect = (a: RoomRect, b: RoomRect) => a.col === b.col && a.row === b.row && a.width === b.width && a.depth === b.depth

// Walking figures go back and forth along a corridor route (screen points)
function Walker({ route, color, speed, name, onClick }: { route: Pt[]; color: string; speed: number; name?: string; onClick?: () => void }) {
  const pts = [...route, ...route.slice(0, -1).reverse()].map(p => `${p.x.toFixed(0)} ${(p.y + 18).toFixed(0)}`)
  let len = 0
  for (let i = 1; i < route.length; i++) len += Math.hypot(route[i].x - route[i - 1].x, route[i].y - route[i - 1].y)
  const path = `M ${pts.join(' L ')}`
  return (
    <g>
      <animateMotion path={path} dur={`${Math.max(6, (2 * len) / speed).toFixed(1)}s`} repeatCount="indefinite" />
      <IsometricAgent color={color} name={name} small onClick={onClick} />
    </g>
  )
}

function Handle({ p, corner, color, big, onPointerDown }: { p: Pt; corner: Corner; color: string; big?: boolean; onPointerDown: (e: React.PointerEvent) => void }) {
  const r = big ? 9 : 7
  return (
    <g onPointerDown={onPointerDown} style={{ cursor: CORNER_CURSOR[corner] }}>
      <title>{CORNER_TITLE[corner]}</title>
      {/* Bigger invisible target so the handle is easy to grab, also by finger */}
      <circle cx={p.x} cy={p.y} r={r + 9} fill="transparent" />
      {big
        ? <rect x={p.x - r} y={p.y - r} width={r * 2} height={r * 2} rx={3} fill={color} stroke="#fff" strokeWidth={2.5} />
        : <circle cx={p.x} cy={p.y} r={r} fill={color} stroke="#fff" strokeWidth={2.5} />}
    </g>
  )
}

export function IsometricFloorPlan({ grid, rooms, agents, editMode, zoom = 1, selectedRoomId, onAgentClick, onRoomClick, onEmptyTileClick, onRoomChange, onGridChange }: Props) {
  const L = isoLayout(grid, editMode ? EDIT_PAD : 0)
  const svgRef = useRef<SVGSVGElement>(null)
  const [hoverTile, setHoverTile] = useState<string | null>(null)
  const [hoverRoomId, setHoverRoomId] = useState<string | null>(null)
  const [drag, setDrag] = useState<Drag | null>(null)
  const agentById = new Map(agents.map(a => [a.id, a]))

  // What is on screen: the dragged room at its new spot, the office at its new size
  const shownRooms = drag?.kind === 'room' ? rooms.map(r => (r.id === drag.room.id ? { ...r, ...drag.rect } : r)) : rooms
  const shownGrid = drag?.kind === 'grid' ? drag.next : grid
  const roomValid = drag?.kind === 'room' ? validatePlacement({ ...drag.rect, id: drag.room.id }, rooms, grid) === null : true
  const gridValid = drag?.kind === 'grid' ? rooms.every(r => fitsGrid(r, drag.next)) : true

  const occupied = new Set<string>()
  for (const r of shownRooms) {
    for (let c = r.col; c < r.col + r.width; c++) for (let w = r.row; w < r.row + r.depth; w++) occupied.add(`${c},${w}`)
  }
  const emptyTiles: [number, number][] = []
  for (let row = 0; row < grid.rows; row++) for (let col = 0; col < grid.cols; col++) {
    if (!occupied.has(`${col},${row}`)) emptyTiles.push([col, row])
  }

  // Agents without a room walk around the office ("onderweg")
  const seated = new Set(rooms.map(r => r.agent_id).filter(Boolean))
  const wandering = agents.filter(a => !seated.has(a.id))
  const ordered = paintOrder(rooms)
  const route = (i: number): Pt[] => {
    const n = ordered.length
    const from = (i * 2) % n
    // offset in 1..n-1 so a walker never stands still
    const to = (from + 1 + ((i + Math.floor(n / 2)) % (n - 1))) % n
    return corridorRoute(rooms, grid, ordered[from], ordered[to]).map(([c, r]) => L.P(c, r))
  }

  // ─── Dragging (edit mode) ───────────────────────────────

  const gridPoint = (e: React.PointerEvent) => {
    const ctm = svgRef.current?.getScreenCTM()
    if (!ctm) return { col: 0, row: 0 }
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse())
    return L.fromScreen(p.x, p.y)
  }

  const begin = (e: React.PointerEvent, next: Drag) => {
    if (e.button !== 0) return
    e.stopPropagation()
    e.preventDefault()
    svgRef.current?.setPointerCapture(e.pointerId)
    setDrag(next)
  }

  const startRoom = (e: React.PointerEvent, room: Room, corner: Corner | null) =>
    begin(e, { kind: 'room', room, corner, start: gridPoint(e), startPx: { x: e.clientX, y: e.clientY }, moved: false, rect: rectOf(room) })

  const startGrid = (e: React.PointerEvent, corner: Corner) =>
    begin(e, { kind: 'grid', corner, start: gridPoint(e), next: grid })

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag) return
    const p = gridPoint(e)
    const dc = p.col - drag.start.col, dr = p.row - drag.start.row

    if (drag.kind === 'room') {
      const o = drag.room
      const moved = drag.moved || Math.hypot(e.clientX - drag.startPx.x, e.clientY - drag.startPx.y) > 4
      const rect = drag.corner === null
        ? { ...rectOf(o), col: clamp(Math.round(o.col + dc), 0, grid.cols - o.width), row: clamp(Math.round(o.row + dr), 0, grid.rows - o.depth) }
        : {
            ...rectOf(o),
            width: drag.corner === 'w' ? o.width : clamp(Math.round(o.width + dc), 1, Math.min(ROOM_SIZE_MAX, grid.cols - o.col)),
            depth: drag.corner === 'e' ? o.depth : clamp(Math.round(o.depth + dr), 1, Math.min(ROOM_SIZE_MAX, grid.rows - o.row)),
          }
      if (moved !== drag.moved || !sameRect(rect, drag.rect)) setDrag({ ...drag, moved, rect })
    } else {
      const size = (base: number, delta: number) => clamp(Math.round(base + delta), GRID_LIMITS.min, Math.min(GRID_LIMITS.max, base + EDIT_PAD))
      const next = {
        cols: drag.corner === 'w' ? grid.cols : size(grid.cols, dc),
        rows: drag.corner === 'e' ? grid.rows : size(grid.rows, dr),
      }
      if (next.cols !== drag.next.cols || next.rows !== drag.next.rows) setDrag({ ...drag, next })
    }
  }

  const onPointerUp = (e: React.PointerEvent) => {
    if (!drag) return
    if (svgRef.current?.hasPointerCapture(e.pointerId)) svgRef.current.releasePointerCapture(e.pointerId)
    setDrag(null)
    if (drag.kind === 'room') {
      // A press without moving is a click: open the room
      if (!drag.moved && drag.corner === null) onRoomClick?.(drag.room)
      else if (roomValid && !sameRect(drag.rect, drag.room)) onRoomChange?.(drag.room, drag.rect)
    } else if (gridValid && (drag.next.cols !== grid.cols || drag.next.rows !== grid.rows)) {
      onGridChange?.(drag.next)
    }
  }

  // Corner handles of the room under the mouse (or being edited); its floor corners in front
  const handleRoom = editMode && drag?.kind !== 'grid'
    ? shownRooms.find(r => r.id === (drag?.kind === 'room' ? drag.room.id : hoverRoomId ?? selectedRoomId))
    : undefined

  return (
    <svg ref={svgRef} viewBox={`0 0 ${L.width} ${L.height}`} className="h-auto block mx-auto select-none"
      style={{ width: `${zoom * 100}%`, maxWidth: 'none', touchAction: editMode ? 'none' : undefined }}
      role="img" aria-label="Isometrische kantoorplattegrond"
      onPointerMove={editMode ? onPointerMove : undefined}
      onPointerUp={editMode ? onPointerUp : undefined}
      onPointerCancel={() => setDrag(null)}
      onMouseLeave={() => setHoverRoomId(null)}>
      <defs>
        <pattern id="fn-iso" width="40" height="20" patternUnits="userSpaceOnUse">
          <path d="M0 10 L20 0 L40 10 L20 20 Z" fill="none" style={{ stroke: 'var(--divide)' }} strokeWidth={0.6} />
        </pattern>
      </defs>
      <rect x={0} y={0} width={L.width} height={L.height} fill="url(#fn-iso)" opacity={0.5} />

      {/* Corridor floor between the rooms */}
      <polygon points={corridorFloor(L, grid)} style={{ fill: 'var(--text-s)', stroke: 'var(--text-s)' }}
        fillOpacity={0.07} strokeOpacity={0.3} strokeWidth={1} />

      {/* Office footprint */}
      <polygon points={diamond(L, 0, 0, grid.cols, grid.rows)} fill="none" style={{ stroke: 'var(--text-s)' }}
        strokeOpacity={editMode ? 0.6 : 0.25} strokeWidth={1} strokeDasharray="4 4" />

      {/* New office size while dragging its corners */}
      {drag?.kind === 'grid' && (
        <polygon points={diamond(L, 0, 0, shownGrid.cols, shownGrid.rows)} fill={gridValid ? '#8F39AC' : '#dc2626'} fillOpacity={0.06}
          stroke={gridValid ? '#8F39AC' : '#dc2626'} strokeWidth={2.5} strokeDasharray="10 6" />
      )}

      {/* Empty tiles (clickable in edit mode) */}
      {emptyTiles.map(([col, row]) => {
        const key = `${col},${row}`
        const hot = editMode && !drag && hoverTile === key
        const C = L.P(col + 0.5, row + 0.5)
        return (
          <g key={key}
            onMouseEnter={() => setHoverTile(key)} onMouseLeave={() => setHoverTile(null)}
            onClick={editMode ? () => onEmptyTileClick?.(col, row) : undefined}
            style={{ cursor: editMode ? 'pointer' : 'default' }}>
            <polygon points={diamond(L, col, row)} fill="#8F39AC" fillOpacity={hot ? 0.18 : editMode ? 0.04 : 0}
              stroke="#8F39AC" strokeOpacity={editMode ? (hot ? 0.9 : 0.35) : 0.08} strokeWidth={1} strokeDasharray="6 4" />
            {editMode && (
              <text x={C.x} y={C.y + 5} textAnchor="middle" fontSize={hot ? 18 : 14} fontWeight={600} fill="#8F39AC" fillOpacity={hot ? 1 : 0.5}>+</text>
            )}
          </g>
        )
      })}

      {paintOrder(shownRooms).map((room) => {
        const agent = room.agent_id ? agentById.get(room.agent_id) : undefined
        const dragging = drag?.kind === 'room' && drag.room.id === room.id && (drag.moved || drag.corner !== null)
        return (
          <IsometricRoom key={room.id} room={room} layout={L} editMode={editMode}
            selected={selectedRoomId === room.id}
            dragging={dragging}
            invalid={dragging && !roomValid}
            onClick={!editMode && onRoomClick ? () => onRoomClick(room) : undefined}
            onPointerDown={editMode ? e => startRoom(e, rooms.find(r => r.id === room.id)!, null) : undefined}
            onHover={editMode ? h => h && !drag && setHoverRoomId(room.id) : undefined}>
            {agent && (
              <IsometricAgent
                name={agent.name}
                color={agent.color}
                status={agent.status}
                isManager={agent.is_manager === 1}
                x={-6} y={4}
                onClick={!editMode && onAgentClick ? () => onAgentClick(agent) : undefined}
              />
            )}
          </IsometricRoom>
        )
      })}

      {ordered.length >= 2 && (wandering.length > 0
        ? wandering.map((a, i) => (
            <Walker key={a.id} route={route(i)} color={a.color} name={a.name} speed={40 - (i % 3) * 6}
              onClick={!editMode && onAgentClick ? () => onAgentClick(a) : undefined} />
          ))
        : (['#8F39AC', '#379FD3'] as const).map((color, i) => (
            <Walker key={i} route={route(i)} color={color} speed={40 - i * 8} />
          )))}

      {/* Room resize handles: right corner = width, left corner = depth, front corner = both */}
      {handleRoom && (() => {
        const { col, row, width: w, depth: d } = handleRoom
        const original = rooms.find(r => r.id === handleRoom.id)!
        const color = drag?.kind === 'room' && !roomValid ? '#dc2626' : handleRoom.color
        const corners: [Corner, Pt][] = [
          ['e', L.P(col + w - INSET, row + INSET)],
          ['w', L.P(col + INSET, row + d - INSET)],
          ['s', L.P(col + w - INSET, row + d - INSET)],
        ]
        return (
          <g onMouseEnter={() => !drag && setHoverRoomId(handleRoom.id)}>
            {corners.map(([corner, p]) => (
              <Handle key={corner} p={p} corner={corner} color={color} onPointerDown={e => startRoom(e, original, corner)} />
            ))}
          </g>
        )
      })()}

      {/* Office resize handles on its outer corners */}
      {editMode && drag?.kind !== 'room' && (
        <g>
          {([['e', L.P(shownGrid.cols, 0)], ['w', L.P(0, shownGrid.rows)], ['s', L.P(shownGrid.cols, shownGrid.rows)]] as [Corner, Pt][]).map(([corner, p]) => (
            <Handle key={corner} p={p} corner={corner} big color={gridValid ? '#8F39AC' : '#dc2626'} onPointerDown={e => startGrid(e, corner)} />
          ))}
        </g>
      )}
    </svg>
  )
}
