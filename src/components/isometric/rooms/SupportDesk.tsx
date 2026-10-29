'use client'

export function SupportDeskFurniture() {
  return (
    <g>
      {/* Desk */}
      <polygon points="-25,-5 0,-17 25,-5 0,7" fill="#302010" fillOpacity={0.6} stroke="#ff9e4a" strokeOpacity={0.3} strokeWidth={0.5} />

      {/* Monitor with chat */}
      <rect x={-8} y={-28} width={16} height={12} rx={1} fill="#1a1a2e" stroke="#ff9e4a" strokeOpacity={0.4} strokeWidth={0.5} />
      {/* Chat bubbles */}
      <rect x={-5} y={-25} width={8} height={3} rx={1} fill="#ff9e4a" fillOpacity={0.2} />
      <rect x={-2} y={-21} width={6} height={3} rx={1} fill="#4a9eff" fillOpacity={0.2} />

      {/* Headset */}
      <path d="M25,-20 Q25,-28 30,-28 Q35,-28 35,-20" fill="none" stroke="#ff9e4a" strokeOpacity={0.4} strokeWidth={1} />
      <circle cx={25} cy={-19} r={2} fill="#ff9e4a" fillOpacity={0.3} />
      <circle cx={35} cy={-19} r={2} fill="#ff9e4a" fillOpacity={0.3} />
    </g>
  )
}
