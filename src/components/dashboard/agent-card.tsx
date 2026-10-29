'use client'

import type { AgentData } from '@/hooks/use-agents'
import { AGENT_STATUS, agentRole, alpha } from '@/lib/labels'
import { AgentToggle } from '@/components/agents/AgentToggle'

export function AgentAvatar({ agent, size = 46 }: { agent: Pick<AgentData, 'name' | 'color'>; size?: number }) {
  return (
    <div className="rounded-full flex items-center justify-center font-bold flex-none"
      style={{
        width: size, height: size, fontSize: Math.round(size * 0.39),
        background: alpha(agent.color, '22'), color: agent.color, border: `2px solid ${alpha(agent.color, '55')}`,
      }}>
      {agent.name[0]}
    </div>
  )
}

export function AgentStatusPill({ agent }: { agent: Pick<AgentData, 'status' | 'color'> }) {
  const working = agent.status === 'working'
  const error = agent.status === 'error'
  return (
    <span className="fynn-pill" style={{
      background: working ? alpha(agent.color, '1e') : error ? 'var(--fyn-danger-light)' : 'var(--track)',
      color: working ? agent.color : error ? '#b91c1c' : 'var(--text-m)',
    }}>
      {working && <span className="w-1.5 h-1.5 rounded-full animate-fynn-pulse" style={{ background: agent.color }} />}
      {AGENT_STATUS[agent.status] || agent.status}
    </span>
  )
}

export function AgentCard({ agent, onClick }: { agent: AgentData; onClick?: () => void }) {
  const working = agent.status === 'working'
  const off = agent.enabled === 0
  const lastActivity = agent.recentActivity?.[0]

  return (
    <div
      onClick={onClick}
      className="p-[18px] rounded-[15px] transition-all duration-300"
      style={{
        background: 'var(--card)',
        border: `1px solid ${working ? alpha(agent.color, '55') : 'var(--card-border)'}`,
        boxShadow: working ? `0 0 0 1px ${alpha(agent.color, '33')}, 0 10px 30px -10px ${alpha(agent.color, '55')}` : 'var(--chip-shadow)',
        cursor: onClick ? 'pointer' : 'default',
        opacity: off && !working ? 0.6 : 1,
      }}
    >
      <div className="flex items-start justify-between mb-3.5">
        <div className="flex items-center gap-3 min-w-0">
          <AgentAvatar agent={agent} />
          <div className="min-w-0">
            <div className="text-[14.5px] font-bold truncate" style={{ color: 'var(--text-h)' }}>{agent.name}</div>
            <div className="text-xs truncate" style={{ color: 'var(--text-m)' }}>{agentRole(agent)}</div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-none">
          <AgentStatusPill agent={agent} />
          <AgentToggle agent={agent} />
        </div>
      </div>

      {working && agent.currentTask ? (
        <div className="mb-3.5">
          <div className="text-[13px] font-semibold mb-2 truncate" style={{ color: 'var(--text-h)' }}>{agent.currentTask.title}</div>
          <div className="h-[7px] rounded-full overflow-hidden" style={{ background: 'var(--track)' }}>
            <div className="h-full rounded-full transition-all duration-500"
              style={{ width: `${agent.currentTask.progress}%`, background: `linear-gradient(90deg,${agent.color},#379FD3)` }} />
          </div>
          <div className="text-[11.5px] mt-1.5" style={{ color: 'var(--text-m)' }}>{agent.currentTask.progress}% voltooid</div>
        </div>
      ) : (
        <div className="text-[12.5px] mb-3.5 truncate" style={{ color: 'var(--text-m)' }}>
          {lastActivity ? `Laatst: ${lastActivity.message}` : 'Nog geen activiteit'}
        </div>
      )}

      <div className="flex items-center justify-between pt-[13px]" style={{ borderTop: '1px solid var(--divide)' }}>
        <span className="text-xs" style={{ color: 'var(--text-m)' }}>Taken voltooid</span>
        <span className="text-[15px] font-bold" style={{ color: agent.color }}>{agent.tasks_completed}</span>
      </div>
    </div>
  )
}
