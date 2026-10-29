'use client'

import { ROOMS } from '@/components/isometric/isometric-utils'

const roomDescriptions: Record<string, { title: string; description: string; dataType: string }> = {
  manager: { title: 'Manager Office', description: 'Fynn coordinates all agents from here', dataType: 'Team overview' },
  design: { title: 'Design Studio', description: 'Where creative magic happens', dataType: 'Draft designs & concepts' },
  listing: { title: 'Listing Office', description: 'Etsy listing optimization HQ', dataType: 'Active & draft listings' },
  fulfillment: { title: 'Fulfillment Room', description: 'Order processing & shipping', dataType: 'Pending & shipped orders' },
  support: { title: 'Support Desk', description: 'Customer communication center', dataType: 'Open tickets & reviews' },
  analytics: { title: 'Analytics Lab', description: 'Data-driven decision making', dataType: 'Reports & insights' },
}

export function RoomPanel({ roomId }: { roomId: string }) {
  const room = ROOMS.find(r => r.id === roomId)
  const info = roomDescriptions[roomId]

  if (!room || !info) return null

  return (
    <div className="space-y-5">
      {/* Room icon */}
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-lg flex items-center justify-center"
          style={{ background: `${room.color}15`, border: `2px solid ${room.color}33` }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <polygon points="12,2 22,8 22,16 12,22 2,16 2,8" fill={room.color} fillOpacity={0.3} stroke={room.color} strokeWidth={1.5} />
          </svg>
        </div>
        <div>
          <h4 className="text-base font-semibold" style={{ color: room.color }}>{info.title}</h4>
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{info.description}</p>
        </div>
      </div>

      {/* Data type */}
      <div className="glass-card p-4">
        <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>This room handles</p>
        <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{info.dataType}</p>
      </div>

      {/* Placeholder for real data */}
      <div className="glass-card p-4 text-center">
        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
          Click on the agent in this room to see their live stats
        </p>
      </div>
    </div>
  )
}
