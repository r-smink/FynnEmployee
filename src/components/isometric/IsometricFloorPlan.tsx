'use client'

import { useState } from 'react'
import type { OfficeGrid, Room } from '@/lib/office'
import type { AgentData } from '@/hooks/use-agents'
import { diamond, isoLayout, paintOrder, roomGeometry, type Pt } from './isometric-utils'
import { IsometricRoom } from './IsometricRoom'
import { IsometricAgent } from './IsometricAgent'

interface Props {
  grid: OfficeGrid
  rooms: Room[]
  agents: AgentData[]
  editMode?: boolean
  selectedRoomId?: string | null
  onAgentClick?: (agent: AgentData) => void
  onRoomClick?: (room: Room) => void
  onEmptyTileClick?: (col: number, row: number) => void
}

// Walking figures loop between two room centers
function Walker({ from, to, color, dur, name, onClick }: { from: Pt; to: Pt; color: string; dur: number; name?: string; onClick?: () => void }) {
  const a = `${from.x.toFixed(0)} ${(from.y + 18).toFixed(0)}`
  const b = `${to.x.toFixed(0)} ${(to.y + 18).toFixed(0)}`
  return (
    <g>
      <animateTransform attributeName="transform" type="translate" values={`${a};${b};${a}`} dur={`${dur}s`} repeatCount="indefinite"
        calcMode="spline" keySplines="0.45 0 0.55 1;0.45 0 0.55 1" />
      <IsometricAgent color={color} name={name} small onClick={onClick} />
    </g>
  )
}

export function IsometricFloorPlan({ grid, rooms, agents, editMode, selectedRoomId, onAgentClick, onRoomClick, onEmptyTileClick }: Props) {
  const L = isoLayout(grid)
  const [hoverTile, setHoverTile] = useState<string | null>(null)
  const agentById = new Map(agents.map(a => [a.id, a]))

  const occupied = new Set<string>()
  for (const r of rooms) {
    for (let c = r.col; c < r.col + r.width; c++) for (let w = r.row; w < r.row + r.depth; w++) occupied.add(`${c},${w}`)
  }
  const emptyTiles: [number, number][] = []
  for (let row = 0; row < grid.rows; row++) for (let col = 0; col < grid.cols; col++) {
    if (!occupied.has(`${col},${row}`)) emptyTiles.push([col, row])
  }

  // Agents without a room walk around the office ("onderweg")
  const seated = new Set(rooms.map(r => r.agent_id).filter(Boolean))
  const wandering = agents.filter(a => !seated.has(a.id))
  const centers = paintOrder(rooms).map(r => roomGeometry(L, r).center)
  const route = (i: number): [Pt, Pt] => {
    const n = centers.length
    const from = (i * 2) % n
    // offset in 1..n-1 so a walker never stands still
    return [centers[from], centers[(from + 1 + ((i + Math.floor(n / 2)) % (n - 1))) % n]]
  }

  return (
    <svg viewBox={`0 0 ${L.width} ${L.height}`} className="w-full h-auto block" role="img" aria-label="Isometrische kantoorplattegrond">
      <defs>
        <pattern id="fn-iso" width="40" height="20" patternUnits="userSpaceOnUse">
          <path d="M0 10 L20 0 L40 10 L20 20 Z" fill="none" style={{ stroke: 'var(--divide)' }} strokeWidth={0.6} />
        </pattern>
      </defs>
      <rect x={0} y={0} width={L.width} height={L.height} fill="url(#fn-iso)" opacity={0.5} />

      {/* Office footprint */}
      <polygon points={diamond(L, 0, 0, grid.cols, grid.rows)} fill="none" style={{ stroke: 'var(--text-s)' }}
        strokeOpacity={editMode ? 0.6 : 0.25} strokeWidth={1} strokeDasharray="4 4" />

      {/* Empty tiles (clickable in edit mode) */}
      {emptyTiles.map(([col, row]) => {
        const key = `${col},${row}`
        const hot = editMode && hoverTile === key
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

      {paintOrder(rooms).map((room) => {
        const agent = room.agent_id ? agentById.get(room.agent_id) : undefined
        return (
          <IsometricRoom key={room.id} room={room} layout={L} editMode={editMode}
            selected={selectedRoomId === room.id}
            onClick={onRoomClick ? () => onRoomClick(room) : undefined}>
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

      {centers.length >= 2 && (wandering.length > 0
        ? wandering.map((a, i) => {
            const [from, to] = route(i)
            return <Walker key={a.id} from={from} to={to} color={a.color} name={a.name} dur={10 + i * 3}
              onClick={!editMode && onAgentClick ? () => onAgentClick(a) : undefined} />
          })
        : [['#8F39AC', 10], ['#379FD3', 13]].map(([color, dur], i) => {
            const [from, to] = route(i)
            return <Walker key={i} from={from} to={to} color={color as string} dur={dur as number} />
          }))}
    </svg>
  )
}
