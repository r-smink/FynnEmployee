'use client'

import { formatDistanceToNow } from 'date-fns'
import { nl } from 'date-fns/locale'
import type { AgentData } from '@/hooks/use-agents'
import { AgentAvatar, AgentStatusPill } from '@/components/dashboard/agent-card'
import { ACTIVITY_COLORS, agentRole } from '@/lib/labels'

export function AgentPanel({ agent, roomName }: { agent: AgentData; roomName?: string | null }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <AgentAvatar agent={agent} size={56} />
        <div className="min-w-0">
          <h4 className="text-base font-bold" style={{ color: 'var(--text-h)' }}>{agent.name}</h4>
          <p className="text-xs" style={{ color: 'var(--text-m)' }}>{agentRole(agent)}</p>
          {agent.description && <p className="text-xs mt-0.5" style={{ color: 'var(--text-s)' }}>{agent.description}</p>}
        </div>
      </div>

      <div className="fynn-well p-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold" style={{ color: 'var(--text-m)' }}>Status</span>
          <AgentStatusPill agent={agent} />
        </div>
        {agent.currentTask && (
          <div className="mt-3">
            <p className="text-[13px] font-semibold mb-2" style={{ color: 'var(--text-h)' }}>{agent.currentTask.title}</p>
            <div className="h-[7px] rounded-full overflow-hidden" style={{ background: 'var(--track)' }}>
              <div className="h-full rounded-full transition-all duration-500"
                style={{ width: `${agent.currentTask.progress}%`, background: `linear-gradient(90deg,${agent.color},#379FD3)` }} />
            </div>
            <p className="text-[11.5px] mt-1.5" style={{ color: 'var(--text-m)' }}>{agent.currentTask.progress}% voltooid</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="fynn-well p-3 text-center">
          <p className="text-lg font-bold" style={{ color: agent.color }}>{agent.tasks_completed}</p>
          <p className="text-[11.5px]" style={{ color: 'var(--text-m)' }}>Taken voltooid</p>
        </div>
        <div className="fynn-well p-3 text-center">
          <p className="text-[13px] font-bold truncate leading-7" style={{ color: 'var(--text-h)' }}>{roomName || '—'}</p>
          <p className="text-[11.5px]" style={{ color: 'var(--text-m)' }}>Werkplek</p>
        </div>
      </div>

      <div className="fynn-well p-3 flex items-center justify-between gap-3">
        <span className="text-[11.5px] flex-none" style={{ color: 'var(--text-m)' }}>AI-model</span>
        <code className="text-[12px] truncate" style={{ color: agent.model ? 'var(--fyn-blue)' : 'var(--text-s)' }}>{agent.model || 'standaard'}</code>
      </div>

      <div>
        <h4 className="text-xs font-bold uppercase tracking-[.05em] mb-2" style={{ color: 'var(--text-m)' }}>Recente activiteit</h4>
        <div className="space-y-1">
          {agent.recentActivity.map((item) => {
            let timeAgo = 'nu'
            try { timeAgo = formatDistanceToNow(new Date(/[zT]/i.test(item.created_at) ? item.created_at : item.created_at.replace(' ', 'T') + 'Z'), { addSuffix: true, locale: nl }) } catch {}
            return (
              <div key={item.id} className="flex items-start gap-2.5 py-1.5">
                <span className="w-2 h-2 rounded-full mt-1.5 flex-none" style={{ background: ACTIVITY_COLORS[item.type] || ACTIVITY_COLORS.info }} />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] leading-[1.45]" style={{ color: 'var(--text-b)' }}>{item.message}</p>
                  <p className="text-[11.5px]" style={{ color: 'var(--text-s)' }}>{timeAgo}</p>
                </div>
              </div>
            )
          })}
          {agent.recentActivity.length === 0 && (
            <p className="text-[13px]" style={{ color: 'var(--text-m)' }}>Nog geen activiteit</p>
          )}
        </div>
      </div>
    </div>
  )
}
