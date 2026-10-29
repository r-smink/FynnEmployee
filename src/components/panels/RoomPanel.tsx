'use client'

import { ROOM_FUNCTIONS, type Room } from '@/lib/office'
import type { AgentData } from '@/hooks/use-agents'
import { AgentAvatar, AgentStatusPill } from '@/components/dashboard/agent-card'
import { agentRole, alpha } from '@/lib/labels'

export function RoomPanel({ room, agent, onAgentClick }: { room: Room; agent?: AgentData; onAgentClick?: (a: AgentData) => void }) {
  const fn = ROOM_FUNCTIONS[room.function]

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-[13px] flex items-center justify-center flex-none"
          style={{ background: alpha(room.color, '1e'), border: `2px solid ${alpha(room.color, '44')}` }}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
            <polygon points="12,3 22,8 12,13 2,8" fill={room.color} fillOpacity={0.35} stroke={room.color} strokeWidth={1.4} />
            <polygon points="2,8 12,13 12,21 2,16" fill={room.color} fillOpacity={0.2} stroke={room.color} strokeWidth={1.4} />
            <polygon points="22,8 12,13 12,21 22,16" fill={room.color} fillOpacity={0.12} stroke={room.color} strokeWidth={1.4} />
          </svg>
        </div>
        <div className="min-w-0">
          <h4 className="text-base font-bold" style={{ color: room.color }}>{room.name}</h4>
          <p className="text-xs" style={{ color: 'var(--text-m)' }}>{fn.description}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="fynn-well p-3">
          <p className="text-[11.5px]" style={{ color: 'var(--text-m)' }}>Functie</p>
          <p className="text-[13px] font-bold" style={{ color: 'var(--text-h)' }}>{fn.label}</p>
        </div>
        <div className="fynn-well p-3">
          <p className="text-[11.5px]" style={{ color: 'var(--text-m)' }}>Grootte</p>
          <p className="text-[13px] font-bold" style={{ color: 'var(--text-h)' }}>{room.width} × {room.depth} tegels</p>
        </div>
      </div>

      <div className="fynn-well p-4">
        <p className="text-[11.5px] mb-1" style={{ color: 'var(--text-m)' }}>Deze kamer behandelt</p>
        <p className="text-[13px] font-bold" style={{ color: 'var(--text-h)' }}>{fn.handles}</p>
      </div>

      <div>
        <h4 className="text-xs font-bold uppercase tracking-[.05em] mb-2" style={{ color: 'var(--text-m)' }}>Medewerker</h4>
        {agent ? (
          <button onClick={() => onAgentClick?.(agent)} className="fynn-well w-full p-3 flex items-center gap-3 text-left cursor-pointer">
            <AgentAvatar agent={agent} size={38} />
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-bold truncate" style={{ color: 'var(--text-h)' }}>{agent.name}</div>
              <div className="text-[11.5px] truncate" style={{ color: 'var(--text-m)' }}>
                {agent.currentTask ? agent.currentTask.title : agentRole(agent)}
              </div>
            </div>
            <AgentStatusPill agent={agent} />
          </button>
        ) : (
          <p className="text-[13px]" style={{ color: 'var(--text-m)' }}>
            Nog niemand aan het werk — wijs een agent toe via &lsquo;Kantoor bewerken&rsquo;.
          </p>
        )}
      </div>
    </div>
  )
}
