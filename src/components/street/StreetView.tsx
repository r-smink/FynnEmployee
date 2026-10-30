'use client'

import { useState } from 'react'
import type { StreetShop } from '@/app/api/street/route'
import { IsometricAgent } from '@/components/isometric/IsometricAgent'
import { Plant } from '@/components/isometric/RoomFurniture'

// Same 200×100 tile diamond as the office floor plan
const HW = 100
const HH = 50
const BH = 150           // building height
const SHOP_W = 1.1       // facade width in tiles
const PITCH = 1.5        // distance between shop fronts
const START = 0.45
const MARGIN = 40
// Street cross-section, in rows: buildings 0..1, sidewalk, road, far sidewalk
const SIDEWALK = [1, 1.4]
const ROAD = [1.4, 2.5]
const FAR = [2.5, 2.9]
const DEPTH = FAR[1]

export const SHOP_COLORS = ['#8F39AC', '#379FD3', '#ff9e4a', '#2fb37a', '#ff4a9e', '#d4a20a', '#22a3b8', '#6366f1']

export function shopColor(id: string): string {
  let h = 0
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return SHOP_COLORS[h % SHOP_COLORS.length]
}

interface Pt { x: number; y: number }
const s = (p: Pt) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`
const lerp = (a: Pt, b: Pt, t: number): Pt => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t })
const lift = (p: Pt, h: number): Pt => ({ x: p.x, y: p.y - h })

function layout(slots: number) {
  const cols = START * 2 + slots * PITCH - (PITCH - SHOP_W)
  const offX = DEPTH * HW + MARGIN
  const offY = BH + 80
  const P = (c: number, r: number): Pt => ({ x: (c - r) * HW + offX, y: (c + r) * HH + offY })
  return { cols, P, width: (cols + DEPTH) * HW + MARGIN * 2, height: (cols + DEPTH) * HH + offY + 50 }
}

type L = ReturnType<typeof layout>

const quad = (L: L, c0: number, r0: number, c1: number, r1: number) =>
  [L.P(c0, r0), L.P(c1, r0), L.P(c1, r1), L.P(c0, r1)].map(s).join(' ')

function Storefront({ L, shop, c0, onOpen }: { L: L; shop: StreetShop; c0: number; onOpen: () => void }) {
  const [hover, setHover] = useState(false)
  const color = shopColor(shop.id)
  const c1 = c0 + SHOP_W
  const N = L.P(c0, 0), E = L.P(c1, 0), S = L.P(c1, 1), W = L.P(c0, 1)
  // point on the front facade: u along the width (0..1), v height in px
  const f = (u: number, v: number) => lift(lerp(W, S, u), v)
  const face = (u0: number, u1: number, v0: number, v1: number) => [f(u0, v0), f(u1, v0), f(u1, v1), f(u0, v1)].map(s).join(' ')
  // awning sticks out towards the street (+row)
  const out = (p: Pt): Pt => ({ x: p.x - 0.13 * HW, y: p.y + 0.13 * HH + 6 })
  const signMid = f(0.5, 99)
  const name = shop.name.length > 16 ? shop.name.slice(0, 15) + '…' : shop.name
  const upper = [[0.08, 0.3], [0.39, 0.61], [0.7, 0.92]]

  return (
    <g onClick={onOpen} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} style={{ cursor: 'pointer' }}
      role="link" aria-label={`Open ${shop.name}`}>
      {/* side wall, roof, facade */}
      <polygon points={[S, E, lift(E, BH), lift(S, BH)].map(s).join(' ')} style={{ fill: 'var(--iso-desk)' }} stroke={color} strokeOpacity={0.35} strokeWidth={1} />
      <polygon points={[S, E, lift(E, BH), lift(S, BH)].map(s).join(' ')} fill={color} fillOpacity={0.14} />
      <polygon points={[N, E, S, W].map(p => s(lift(p, BH))).join(' ')} fill={color} fillOpacity={hover ? 0.5 : 0.36} stroke={color} strokeOpacity={0.6} strokeWidth={1} />
      <polygon points={[W, S, lift(S, BH), lift(W, BH)].map(s).join(' ')} style={{ fill: 'var(--card)' }} stroke={color} strokeOpacity={hover ? 0.9 : 0.5} strokeWidth={hover ? 2 : 1} />
      <polygon points={[W, S, lift(S, BH), lift(W, BH)].map(s).join(' ')} fill={color} fillOpacity={hover ? 0.2 : 0.1} />

      {/* rooftop unit */}
      <polygon points={quad({ ...L, P: (c, r) => lift(L.P(c, r), BH) }, c0 + 0.6, 0.2, c0 + 0.9, 0.45)} fill={color} fillOpacity={0.55} />

      {/* upper floor windows, lit by working agents */}
      {upper.map(([u0, u1], i) => {
        const agentColor = shop.workingColors[i]
        return (
          <g key={i}>
            <polygon points={face(u0, u1, 112, 140)} fill={agentColor ? '#fde68a' : 'var(--iso-screen)'} fillOpacity={agentColor ? 0.85 : 0.9}
              stroke={color} strokeOpacity={0.5} strokeWidth={0.8} />
            {agentColor && (() => { const m = f((u0 + u1) / 2, 118); return <circle cx={m.x} cy={m.y} r={4} fill={agentColor} /> })()}
          </g>
        )
      })}

      {/* sign */}
      <polygon points={face(0.05, 0.95, 88, 108)} fill={color} fillOpacity={0.92} />
      <text x={signMid.x} y={signMid.y + 4} textAnchor="middle" fontSize={12} fontWeight={600} fill="#fff"
        transform={`skewY(26.565) translate(0 ${(-signMid.x * 0.5).toFixed(1)})`}>
        {name}
      </text>

      {/* awning */}
      <polygon points={[f(0.03, 82), f(0.97, 82), out(f(0.97, 70)), out(f(0.03, 70))].map(s).join(' ')} fill={color} fillOpacity={0.75} />
      {[0.2, 0.4, 0.6, 0.8].map(u => (
        <line key={u} x1={f(u, 82).x} y1={f(u, 82).y} x2={out(f(u, 70)).x} y2={out(f(u, 70)).y} stroke="#fff" strokeOpacity={0.5} strokeWidth={4} />
      ))}

      {/* shop windows and door */}
      <polygon points={face(0.07, 0.38, 12, 62)} style={{ fill: 'var(--iso-screen)' }} stroke={color} strokeOpacity={0.6} strokeWidth={1} />
      <polygon points={face(0.62, 0.93, 12, 62)} style={{ fill: 'var(--iso-screen)' }} stroke={color} strokeOpacity={0.6} strokeWidth={1} />
      <polygon points={face(0.43, 0.57, 0, 64)} fill={color} fillOpacity={0.55} stroke={color} strokeOpacity={0.8} strokeWidth={1} />
      {[[0.12, 0.2], [0.26, 0.33], [0.67, 0.76], [0.81, 0.88]].map(([u0, u1], i) => (
        <polygon key={i} points={face(u0, u1, 16, 16 + 10 + (i % 2) * 8)} fill={SHOP_COLORS[(i + 2) % SHOP_COLORS.length]} fillOpacity={0.55} />
      ))}

      {/* name and live status above the roof */}
      {(() => {
        const p = lift(L.P(c0 + SHOP_W / 2, 0.5), BH)
        const top = Math.min(lift(N, BH).y, p.y) - 40
        return (
          <g>
            <text x={p.x} y={top} textAnchor="middle" fontSize={13} fontWeight={600} style={{ fill: 'var(--text-h)' }}>{shop.name}</text>
            <text x={p.x} y={top + 16} textAnchor="middle" fontSize={11} style={{ fill: 'var(--text-m)' }}>
              {shop.working}/{shop.agents} aan het werk{shop.newOrders > 0 ? ` · ${shop.newOrders} nieuwe orders` : ''}
            </text>
          </g>
        )
      })()}
    </g>
  )
}

function EmptyLot({ L, c0, onCreate }: { L: L; c0: number; onCreate: () => void }) {
  const [hover, setHover] = useState(false)
  const C = L.P(c0 + SHOP_W / 2, 0.5)
  return (
    <g onClick={onCreate} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} style={{ cursor: 'pointer' }} role="link" aria-label="Nieuwe winkel">
      <polygon points={quad(L, c0, 0, c0 + SHOP_W, 1)} fill="#8F39AC" fillOpacity={hover ? 0.16 : 0.05}
        stroke="#8F39AC" strokeOpacity={hover ? 0.9 : 0.45} strokeWidth={1.5} strokeDasharray="7 5" />
      <text x={C.x} y={C.y + 2} textAnchor="middle" fontSize={26} fontWeight={600} fill="#8F39AC" fillOpacity={hover ? 1 : 0.6}>+</text>
      <text x={C.x} y={C.y + 22} textAnchor="middle" fontSize={11} fontWeight={600} fill="#8F39AC" fillOpacity={hover ? 1 : 0.7}>Nieuwe winkel</text>
    </g>
  )
}

function Lamp({ p }: { p: Pt }) {
  return (
    <g>
      <line x1={p.x} y1={p.y} x2={p.x} y2={p.y - 58} style={{ stroke: 'var(--text-s)' }} strokeWidth={2.5} />
      <circle cx={p.x} cy={p.y - 60} r={5} fill="#fde68a" />
      <circle cx={p.x} cy={p.y - 60} r={11} fill="#fde68a" fillOpacity={0.18} />
    </g>
  )
}

function Car({ L, cols, color, row, dur, reverse }: { L: L; cols: number; color: string; row: number; dur: number; reverse?: boolean }) {
  const a = L.P(-0.3, row), b = L.P(cols + 0.3, row)
  const [from, to] = reverse ? [b, a] : [a, b]
  return (
    <g>
      <animateMotion path={`M ${s(from)} L ${s(to)}`} dur={`${dur}s`} repeatCount="indefinite" />
      <polygon points="-20,0 0,-10 20,0 0,10" fill={color} fillOpacity={0.85} />
      <polygon points="-11,-6 1,-12 11,-7 -1,-1" fill="#fff" fillOpacity={0.55} />
      <circle cx={-12} cy={4} r={3} style={{ fill: 'var(--iso-wheel)' }} />
      <circle cx={12} cy={4} r={3} style={{ fill: 'var(--iso-wheel)' }} />
    </g>
  )
}

interface Props {
  shops: StreetShop[]
  onOpenShop: (id: string) => void
  onCreateShop: () => void
}

export function StreetView({ shops, onOpenShop, onCreateShop }: Props) {
  const slots = shops.length + 1
  const L = layout(slots)
  const cx = (i: number) => START + i * PITCH
  const walkRow = (SIDEWALK[0] + SIDEWALK[1]) / 2 + 0.05
  const walkers = shops.flatMap(sh => sh.workingColors.slice(3).map(c => c)).concat(['#8F39AC', '#379FD3']).slice(0, 4)

  return (
    <svg viewBox={`0 0 ${L.width.toFixed(0)} ${L.height.toFixed(0)}`} className="w-full h-auto block" role="img" aria-label="Winkelstraat met al je winkels">
      {/* ground: plaza behind the shops, sidewalks and road */}
      <polygon points={quad(L, 0, 0, L.cols, SIDEWALK[0])} style={{ fill: 'var(--text-s)' }} fillOpacity={0.06} />
      <polygon points={quad(L, 0, SIDEWALK[0], L.cols, SIDEWALK[1])} style={{ fill: 'var(--text-s)' }} fillOpacity={0.14} />
      <polygon points={quad(L, 0, ROAD[0], L.cols, ROAD[1])} fill="#475569" fillOpacity={0.55} />
      <polygon points={quad(L, 0, FAR[0], L.cols, FAR[1])} style={{ fill: 'var(--text-s)' }} fillOpacity={0.14} />
      {(() => {
        const mid = (ROAD[0] + ROAD[1]) / 2
        const a = L.P(0, mid), b = L.P(L.cols, mid)
        return <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#fff" strokeOpacity={0.7} strokeWidth={2} strokeDasharray="16 14" />
      })()}

      {shops.map((sh, i) => <Storefront key={sh.id} L={L} shop={sh} c0={cx(i)} onOpen={() => onOpenShop(sh.id)} />)}
      <EmptyLot L={L} c0={cx(shops.length)} onCreate={onCreateShop} />

      {/* street furniture */}
      {/* lamps and trees on the far sidewalk, where they never cover a shop */}
      {Array.from({ length: slots }, (_, i) => <Lamp key={i} p={L.P(cx(i) + SHOP_W / 2, (FAR[0] + FAR[1]) / 2)} />)}
      {Array.from({ length: slots + 1 }, (_, i) => { const p = L.P(cx(i) - (PITCH - SHOP_W) / 2, (FAR[0] + FAR[1]) / 2); return <Plant key={i} x={p.x} y={p.y - 6} /> })}

      {walkers.map((color, i) => {
        const a = L.P(0.2, walkRow), b = L.P(L.cols - 0.2, walkRow)
        const path = i % 2 ? `M ${s(b)} L ${s(a)} L ${s(b)}` : `M ${s(a)} L ${s(b)} L ${s(a)}`
        return (
          <g key={i}>
            <animateMotion path={path} dur={`${(L.cols * 9 + i * 7).toFixed(0)}s`} begin={`${-i * 6}s`} repeatCount="indefinite" />
            <IsometricAgent color={color} small />
          </g>
        )
      })}
      <Car L={L} cols={L.cols} color="#ff9e4a" row={ROAD[0] + 0.3} dur={Math.max(8, L.cols * 2.2)} />
      <Car L={L} cols={L.cols} color="#379FD3" row={ROAD[1] - 0.3} dur={Math.max(10, L.cols * 2.8)} reverse />
    </svg>
  )
}
