'use client'

import type { RoomFunction } from '@/lib/office'

// Themed fills (desk/screen) come from CSS variables so furniture works in light and dark mode
const desk = { fill: 'var(--iso-desk)', fillOpacity: 0.85 }
const screen = { fill: 'var(--iso-screen)' }
const wheel = { fill: 'var(--iso-wheel)' }

function Desk({ c, points = '-26,-4 0,-17 26,-4 0,9' }: { c: string; points?: string }) {
  return <polygon points={points} style={desk} stroke={c} strokeOpacity={0.35} strokeWidth={0.6} />
}

function Monitor({ c, x, y, w, h }: { c: string; x: number; y: number; w: number; h: number }) {
  return <rect x={x} y={y} width={w} height={h} rx={1} style={screen} stroke={c} strokeOpacity={0.5} strokeWidth={0.6} />
}

export function RoomFurniture({ fn, c }: { fn: RoomFunction; c: string }) {
  switch (fn) {
    case 'manager':
      return (
        <g>
          <Desk c={c} points="-32,-4 0,-19 32,-4 0,11" />
          <rect x={-37} y={-33} width={21} height={16} rx={1.5} style={screen} stroke={c} strokeOpacity={0.45} strokeWidth={0.6} />
          <circle cx={-32} cy={-28} r={1.5} fill="#9e4aff" /><circle cx={-27} cy={-28} r={1.5} fill="#4a9eff" /><circle cx={-22} cy={-28} r={1.5} fill="#ff9e4a" />
          <circle cx={-32} cy={-23} r={1.5} fill="#2fb37a" /><circle cx={-27} cy={-23} r={1.5} fill="#ff4a9e" />
          <Monitor c={c} x={-7} y={-31} w={15} h={11} /><rect x={-5} y={-29} width={11} height={7} fill={c} fillOpacity={0.2} />
          <rect x={16} y={-13} width={5} height={6} rx={1} fill={c} fillOpacity={0.3} stroke={c} strokeOpacity={0.4} strokeWidth={0.5} />
        </g>
      )
    case 'design':
      return (
        <g>
          <Desk c={c} />
          <Monitor c={c} x={-9} y={-31} w={18} h={13} /><rect x={-7} y={-29} width={14} height={9} fill={c} fillOpacity={0.22} />
          <polygon points="-24,-2 -12,-8 -2,-2 -14,4" style={screen} fillOpacity={0.85} stroke={c} strokeOpacity={0.35} strokeWidth={0.5} />
          <rect x={27} y={-27} width={4.5} height={4.5} rx={0.5} fill="#ff4a9e" fillOpacity={0.7} />
          <rect x={27} y={-21} width={4.5} height={4.5} rx={0.5} fill="#4a9eff" fillOpacity={0.7} />
          <rect x={27} y={-15} width={4.5} height={4.5} rx={0.5} fill="#2fb37a" fillOpacity={0.7} />
        </g>
      )
    case 'listing':
      return (
        <g>
          <Desk c={c} />
          <Monitor c={c} x={-8} y={-31} w={17} h={13} />
          <line x1={-4} y1={-28} x2={-4} y2={-21} stroke={c} strokeOpacity={0.4} strokeWidth={0.5} />
          <line x1={1} y1={-28} x2={1} y2={-21} stroke={c} strokeOpacity={0.4} strokeWidth={0.5} />
          <line x1={-8} y1={-25} x2={9} y2={-25} stroke={c} strokeOpacity={0.4} strokeWidth={0.5} />
          <rect x={-35} y={-29} width={18} height={14} rx={1} style={screen} fillOpacity={0.85} stroke={c} strokeOpacity={0.35} strokeWidth={0.5} />
          <line x1={-33} y1={-25} x2={-20} y2={-25} stroke={c} strokeOpacity={0.4} strokeWidth={0.6} />
          <line x1={-33} y1={-22} x2={-24} y2={-22} stroke={c} strokeOpacity={0.3} strokeWidth={0.6} />
        </g>
      )
    case 'analytics':
      return (
        <g>
          <Desk c={c} />
          <Monitor c={c} x={-17} y={-31} w={14} h={11} /><Monitor c={c} x={3} y={-31} w={14} h={11} />
          <rect x={-15} y={-25} width={2} height={4} fill={c} fillOpacity={0.5} />
          <rect x={-12} y={-27} width={2} height={6} fill={c} fillOpacity={0.6} />
          <rect x={-9} y={-24} width={2} height={3} fill={c} fillOpacity={0.4} />
          <polyline points="5,-23 8,-26 12,-23 15,-26" fill="none" stroke={c} strokeOpacity={0.6} strokeWidth={0.9} />
        </g>
      )
    case 'support':
      return (
        <g>
          <Desk c={c} />
          <Monitor c={c} x={-9} y={-31} w={18} h={13} />
          <rect x={-6} y={-28} width={9} height={3} rx={1.5} fill={c} fillOpacity={0.3} />
          <rect x={-3} y={-24} width={7} height={3} rx={1.5} fill="#4a9eff" fillOpacity={0.35} />
          <path d="M24,-20 Q24,-29 30,-29 Q36,-29 36,-20" fill="none" stroke={c} strokeOpacity={0.5} strokeWidth={1} />
          <circle cx={24} cy={-19} r={2} fill={c} fillOpacity={0.45} /><circle cx={36} cy={-19} r={2} fill={c} fillOpacity={0.45} />
        </g>
      )
    case 'rnd':
      return (
        <g>
          <Desk c={c} />
          <polygon points="-16,-19 -16,-25 -12,-25 -12,-19 -7,-10 -21,-10" fill={c} fillOpacity={0.2} stroke={c} strokeOpacity={0.55} strokeWidth={0.7} />
          <circle cx={-14} cy={-13} r={1} fill={c} /><circle cx={-11} cy={-15} r={0.8} fill={c} />
          <circle cx={12} cy={-24} r={4.5} fill={c} fillOpacity={0.25} stroke={c} strokeOpacity={0.55} strokeWidth={0.7} />
          <rect x={10} y={-20} width={4} height={2.5} rx={0.5} fill={c} fillOpacity={0.6} />
          <line x1={12} y1={-32} x2={12} y2={-30} stroke={c} strokeOpacity={0.5} strokeWidth={0.7} />
          <line x1={18} y1={-27} x2={20} y2={-28} stroke={c} strokeOpacity={0.5} strokeWidth={0.7} />
        </g>
      )
    case 'packaging':
      return (
        <g>
          <Desk c={c} points="-30,-4 0,-18 30,-4 0,10" />
          <polygon points="-14,-11 0,-18 14,-11 0,-4" fill={c} fillOpacity={0.18} stroke={c} strokeOpacity={0.5} strokeWidth={0.7} />
          <polygon points="-14,-11 -20,-16 -6,-23 0,-18" fill={c} fillOpacity={0.1} stroke={c} strokeOpacity={0.4} strokeWidth={0.6} />
          <polygon points="14,-11 20,-16 6,-23 0,-18" fill={c} fillOpacity={0.12} stroke={c} strokeOpacity={0.4} strokeWidth={0.6} />
          <circle cx={22} cy={-9} r={4} fill="none" stroke={c} strokeOpacity={0.5} strokeWidth={1.5} />
          <circle cx={22} cy={-9} r={1.3} fill={c} fillOpacity={0.5} />
          <circle cx={-24} cy={-10} r={1} fill={c} fillOpacity={0.4} /><circle cx={-21} cy={-12} r={1} fill={c} fillOpacity={0.4} />
          <circle cx={-24} cy={-13} r={1} fill={c} fillOpacity={0.4} /><circle cx={-21} cy={-9} r={1} fill={c} fillOpacity={0.4} />
        </g>
      )
    case 'fulfillment':
      return (
        <g>
          <Desk c={c} points="-30,-4 0,-19 30,-4 0,10" />
          <rect x={18} y={-16} width={11} height={9} rx={1} fill={c} fillOpacity={0.16} stroke={c} strokeOpacity={0.45} strokeWidth={0.6} />
          <rect x={20} y={-24} width={9} height={8} rx={1} fill={c} fillOpacity={0.11} stroke={c} strokeOpacity={0.35} strokeWidth={0.6} />
          <rect x={-22} y={-13} width={9} height={6} rx={0.5} fill="#fff" fillOpacity={0.14} stroke={c} strokeOpacity={0.35} strokeWidth={0.5} />
          <line x1={-20} y1={-11} x2={-15} y2={-11} stroke={c} strokeOpacity={0.4} strokeWidth={0.5} />
          <rect x={-6} y={-13} width={8} height={6} rx={0.5} fill={c} fillOpacity={0.12} stroke={c} strokeOpacity={0.4} strokeWidth={0.5} />
        </g>
      )
    case 'shipping':
      return (
        <g>
          <Desk c={c} points="-28,-4 0,-16 28,-4 0,8" />
          <rect x={-20} y={-24} width={24} height={14} rx={2} style={screen} stroke={c} strokeOpacity={0.5} strokeWidth={0.7} />
          <rect x={4} y={-21} width={11} height={11} rx={1.5} style={screen} stroke={c} strokeOpacity={0.5} strokeWidth={0.7} />
          <rect x={6} y={-19} width={7} height={5} fill={c} fillOpacity={0.25} />
          <circle cx={-12} cy={-9} r={3} style={wheel} stroke={c} strokeOpacity={0.5} strokeWidth={0.8} />
          <circle cx={7} cy={-9} r={3} style={wheel} stroke={c} strokeOpacity={0.5} strokeWidth={0.8} />
          <rect x={-16} y={-20} width={8} height={7} rx={0.5} fill={c} fillOpacity={0.2} />
        </g>
      )
    case 'meeting':
      return (
        <g>
          {/* oval table with chairs */}
          <ellipse cx={0} cy={-4} rx={26} ry={11} style={desk} stroke={c} strokeOpacity={0.4} strokeWidth={0.7} />
          {[[-22, -14], [-8, -18], [8, -18], [22, -14], [-22, 6], [-8, 9], [8, 9], [22, 6]].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r={2.6} fill={c} fillOpacity={0.35} stroke={c} strokeOpacity={0.5} strokeWidth={0.5} />
          ))}
          <rect x={-10} y={-36} width={20} height={13} rx={1} style={screen} stroke={c} strokeOpacity={0.5} strokeWidth={0.6} />
          <polyline points="-7,-27 -2,-31 3,-28 7,-32" fill="none" stroke={c} strokeOpacity={0.6} strokeWidth={0.8} />
        </g>
      )
    case 'lounge':
      return (
        <g>
          {/* sofa, coffee table, plant */}
          <polygon points="-30,-6 -6,-18 -2,-16 -26,-4" fill={c} fillOpacity={0.35} stroke={c} strokeOpacity={0.5} strokeWidth={0.6} />
          <polygon points="-26,-4 -2,-16 -2,-10 -26,2" fill={c} fillOpacity={0.22} stroke={c} strokeOpacity={0.4} strokeWidth={0.6} />
          <polygon points="0,-2 12,-8 24,-2 12,4" style={desk} stroke={c} strokeOpacity={0.4} strokeWidth={0.6} />
          <rect x={10} y={-8} width={4} height={4} rx={1} fill={c} fillOpacity={0.5} />
          <Plant x={26} y={-14} />
        </g>
      )
  }
}

export function Plant({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <path d="M-4,0 L4,0 L3,6 L-3,6 Z" fill="#a16207" fillOpacity={0.7} />
      <circle cx={0} cy={-4} r={4.5} fill="#22c55e" fillOpacity={0.55} />
      <circle cx={-3} cy={-1} r={3} fill="#16a34a" fillOpacity={0.6} />
      <circle cx={3} cy={-1.5} r={3} fill="#15803d" fillOpacity={0.6} />
    </g>
  )
}
