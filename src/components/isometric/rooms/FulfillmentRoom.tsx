'use client'

export function FulfillmentRoomFurniture() {
  return (
    <g>
      {/* Packing table */}
      <polygon points="-30,-5 0,-20 30,-5 0,10" fill="#1a3020" fillOpacity={0.6} stroke="#4aff9e" strokeOpacity={0.3} strokeWidth={0.5} />

      {/* Stacked boxes */}
      <rect x={20} y={-15} width={10} height={8} rx={1} fill="#4aff9e" fillOpacity={0.15} stroke="#4aff9e" strokeOpacity={0.3} strokeWidth={0.5} />
      <rect x={22} y={-22} width={8} height={7} rx={1} fill="#4aff9e" fillOpacity={0.1} stroke="#4aff9e" strokeOpacity={0.2} strokeWidth={0.5} />

      {/* Shipping label */}
      <rect x={-20} y={-12} width={8} height={5} rx={0.5} fill="#fff" fillOpacity={0.15} stroke="#4aff9e" strokeOpacity={0.2} strokeWidth={0.5} />

      {/* Small box on table */}
      <rect x={-5} y={-12} width={7} height={5} rx={0.5} fill="#4aff9e" fillOpacity={0.1} stroke="#4aff9e" strokeOpacity={0.3} strokeWidth={0.5} />
    </g>
  )
}
