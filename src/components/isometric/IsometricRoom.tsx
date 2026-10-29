'use client'

import { useState } from 'react'
import type { Room } from '@/lib/office'
import { roomGeometry, type IsoLayout } from './isometric-utils'
import { RoomFurniture, Plant } from './RoomFurniture'

interface Props {
  room: Room
  layout: IsoLayout
  selected?: boolean
  editMode?: boolean
  onClick?: () => void
  children?: React.ReactNode
}

export function IsometricRoom({ room, layout, selected, editMode, onClick, children }: Props) {
  const [hovered, setHovered] = useState(false)
  const g = roomGeometry(layout, room)
  const c = room.color
  const lift = hovered || selected ? 1.5 : 1
  const big = room.width * room.depth > 1

  return (
    <g
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      <polygon points={g.leftWall} fill={c} fillOpacity={0.22 * lift} stroke={c} strokeOpacity={0.4} strokeWidth={1} />
      <polygon points={g.rightWall} fill={c} fillOpacity={0.13 * lift} stroke={c} strokeOpacity={0.4} strokeWidth={1} />
      <polygon points={g.floor} fill={c} fillOpacity={0.16 * lift} stroke={c} strokeOpacity={selected ? 1 : 0.5}
        strokeWidth={selected ? 3 : 1.5} strokeDasharray={selected && editMode ? '8 5' : undefined} />

      {/* Doorway on the open front: agents walk in and out here */}
      <polygon points={g.doorMat} fill={c} fillOpacity={0.35} />
      <polyline points={g.doorFrame} fill="none" stroke={c} strokeOpacity={0.85} strokeWidth={3} strokeLinejoin="round" />

      <text x={g.label.x} y={g.label.y} textAnchor="middle" fontSize={11} fontWeight={600} fill={c} fillOpacity={0.92}>
        {room.name}
      </text>

      {big && g.corners.map((p, i) => <Plant key={i} x={p.x} y={p.y - 6} />)}

      <g transform={`translate(${g.center.x.toFixed(1)},${g.center.y.toFixed(1)})`}>
        <RoomFurniture fn={room.function} c={c} />
        {children}
      </g>
    </g>
  )
}
