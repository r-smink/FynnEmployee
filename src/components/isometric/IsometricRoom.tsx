'use client'

import { useState } from 'react'
import { TILE_WIDTH, TILE_HEIGHT, toIso, VIEW_OFFSET_X, VIEW_OFFSET_Y } from './isometric-utils'
import type { RoomDef } from './isometric-utils'

interface Props {
  room: RoomDef
  onClick?: () => void
  children?: React.ReactNode
}

const WALL_HEIGHT = 50

export function IsometricRoom({ room, onClick, children }: Props) {
  const [hovered, setHovered] = useState(false)
  const { x, y } = toIso(room.col, room.row)
  const sx = x + VIEW_OFFSET_X
  const sy = y + VIEW_OFFSET_Y

  const hw = TILE_WIDTH / 2  // half width = 100
  const hh = TILE_HEIGHT / 2 // half height = 50

  // Floor diamond points
  const floor = `${sx},${sy - hh} ${sx + hw},${sy} ${sx},${sy + hh} ${sx - hw},${sy}`

  // Left wall (bottom-left edge going up)
  const leftWall = `${sx - hw},${sy} ${sx},${sy + hh} ${sx},${sy + hh - WALL_HEIGHT} ${sx - hw},${sy - WALL_HEIGHT}`

  // Right wall (bottom-right edge going up)
  const rightWall = `${sx + hw},${sy} ${sx},${sy + hh} ${sx},${sy + hh - WALL_HEIGHT} ${sx + hw},${sy - WALL_HEIGHT}`

  const baseColor = room.color
  const floorOpacity = hovered ? 0.25 : 0.15
  const wallOpacity = hovered ? 0.35 : 0.2

  return (
    <g
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      {/* Left wall */}
      <polygon
        points={leftWall}
        fill={baseColor}
        fillOpacity={wallOpacity}
        stroke={baseColor}
        strokeOpacity={0.4}
        strokeWidth={1}
      />
      {/* Right wall */}
      <polygon
        points={rightWall}
        fill={baseColor}
        fillOpacity={wallOpacity * 0.7}
        stroke={baseColor}
        strokeOpacity={0.4}
        strokeWidth={1}
      />
      {/* Floor */}
      <polygon
        points={floor}
        fill={baseColor}
        fillOpacity={floorOpacity}
        stroke={baseColor}
        strokeOpacity={0.5}
        strokeWidth={1.5}
      />

      {/* Room label */}
      <text
        x={sx}
        y={sy + hh + 16}
        textAnchor="middle"
        fontSize={9}
        fontWeight={600}
        fill={baseColor}
        fillOpacity={0.8}
      >
        {room.name}
      </text>

      {/* Children (furniture + agents) positioned relative to room center */}
      <g transform={`translate(${sx}, ${sy})`}>
        {children}
      </g>
    </g>
  )
}
