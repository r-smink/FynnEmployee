'use client'

export function AnalyticsLabFurniture() {
  return (
    <g>
      {/* Desk */}
      <polygon points="-25,-5 0,-17 25,-5 0,7" fill="#2a1020" fillOpacity={0.6} stroke="#ff4a9e" strokeOpacity={0.3} strokeWidth={0.5} />

      {/* Dual monitors */}
      <rect x={-16} y={-28} width={13} height={10} rx={1} fill="#1a1a2e" stroke="#ff4a9e" strokeOpacity={0.4} strokeWidth={0.5} />
      <rect x={3} y={-28} width={13} height={10} rx={1} fill="#1a1a2e" stroke="#ff4a9e" strokeOpacity={0.4} strokeWidth={0.5} />

      {/* Bar chart on left monitor */}
      <rect x={-14} y={-24} width={2} height={4} fill="#ff4a9e" fillOpacity={0.3} />
      <rect x={-11} y={-26} width={2} height={6} fill="#ff4a9e" fillOpacity={0.4} />
      <rect x={-8} y={-23} width={2} height={3} fill="#ff4a9e" fillOpacity={0.25} />

      {/* Line chart on right monitor */}
      <polyline points="5,-23 8,-25 11,-22 14,-24" fill="none" stroke="#ff4a9e" strokeOpacity={0.4} strokeWidth={0.8} />
    </g>
  )
}
