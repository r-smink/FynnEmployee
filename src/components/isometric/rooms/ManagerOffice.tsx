'use client'

export function ManagerOfficeFurniture() {
  return (
    <g>
      {/* Large desk */}
      <polygon points="-30,-5 0,-20 30,-5 0,10" fill="#302a10" fillOpacity={0.6} stroke="#ffe04a" strokeOpacity={0.3} strokeWidth={0.5} />

      {/* Overview board */}
      <rect x={-35} y={-30} width={20} height={16} rx={1} fill="#1a1a2e" fillOpacity={0.8} stroke="#ffe04a" strokeOpacity={0.3} strokeWidth={0.5} />
      {/* Board content - agent status dots */}
      <circle cx={-30} cy={-25} r={1.5} fill="#9e4aff" fillOpacity={0.6} />
      <circle cx={-25} cy={-25} r={1.5} fill="#4a9eff" fillOpacity={0.6} />
      <circle cx={-30} cy={-20} r={1.5} fill="#4aff9e" fillOpacity={0.6} />
      <circle cx={-25} cy={-20} r={1.5} fill="#ff9e4a" fillOpacity={0.6} />
      <circle cx={-22} cy={-25} r={1.5} fill="#ff4a9e" fillOpacity={0.6} />

      {/* Monitor */}
      <rect x={-6} y={-28} width={14} height={10} rx={1} fill="#1a1a2e" stroke="#ffe04a" strokeOpacity={0.4} strokeWidth={0.5} />

      {/* Coffee mug */}
      <rect x={15} y={-10} width={4} height={5} rx={1} fill="#ffe04a" fillOpacity={0.2} stroke="#ffe04a" strokeOpacity={0.3} strokeWidth={0.5} />
    </g>
  )
}
