'use client'

export function DesignStudioFurniture() {
  return (
    <g>
      {/* Desk - isometric rectangle */}
      <polygon points="-25,-5 0,-17 25,-5 0,7" fill="#2a2040" fillOpacity={0.6} stroke="#9e4aff" strokeOpacity={0.3} strokeWidth={0.5} />

      {/* Monitor */}
      <rect x={-8} y={-28} width={16} height={12} rx={1} fill="#1a1a2e" stroke="#9e4aff" strokeOpacity={0.4} strokeWidth={0.5} />
      <rect x={-6} y={-26} width={12} height={8} rx={0.5} fill="#9e4aff" fillOpacity={0.15} />

      {/* Drawing tablet */}
      <polygon points="-20,-2 -8,-8 2,-2 -10,4" fill="#1a1a2e" fillOpacity={0.8} stroke="#9e4aff" strokeOpacity={0.3} strokeWidth={0.5} />

      {/* Color swatches on wall */}
      <rect x={30} y={-25} width={4} height={4} rx={0.5} fill="#ff4a9e" fillOpacity={0.6} />
      <rect x={30} y={-19} width={4} height={4} rx={0.5} fill="#4a9eff" fillOpacity={0.6} />
      <rect x={30} y={-13} width={4} height={4} rx={0.5} fill="#4aff9e" fillOpacity={0.6} />
    </g>
  )
}
