'use client'

export function ListingOfficeFurniture() {
  return (
    <g>
      {/* Desk */}
      <polygon points="-25,-5 0,-17 25,-5 0,7" fill="#1a2040" fillOpacity={0.6} stroke="#4a9eff" strokeOpacity={0.3} strokeWidth={0.5} />

      {/* Monitor showing grid (Etsy listings) */}
      <rect x={-8} y={-28} width={16} height={12} rx={1} fill="#1a1a2e" stroke="#4a9eff" strokeOpacity={0.4} strokeWidth={0.5} />
      {/* Grid lines on monitor */}
      <line x1={-5} y1={-22} x2={5} y2={-22} stroke="#4a9eff" strokeOpacity={0.2} strokeWidth={0.3} />
      <line x1={0} y1={-26} x2={0} y2={-18} stroke="#4a9eff" strokeOpacity={0.2} strokeWidth={0.3} />

      {/* SEO board */}
      <rect x={-35} y={-28} width={18} height={14} rx={1} fill="#1a1a2e" fillOpacity={0.8} stroke="#4a9eff" strokeOpacity={0.3} strokeWidth={0.5} />
      <line x1={-33} y1={-24} x2={-20} y2={-24} stroke="#4a9eff" strokeOpacity={0.3} strokeWidth={0.5} />
      <line x1={-33} y1={-20} x2={-23} y2={-20} stroke="#4a9eff" strokeOpacity={0.2} strokeWidth={0.5} />
    </g>
  )
}
