'use client'

import type { AgentData } from '@/hooks/use-agents'

const statusConfig: Record<string, { label: string; bgColor: string; textColor: string; glow: boolean }> = {
  idle: { label: 'Idle', bgColor: 'rgba(136, 136, 170, 0.15)', textColor: 'var(--text-secondary)', glow: false },
  working: { label: 'Working', bgColor: 'rgba(74, 158, 255, 0.15)', textColor: 'var(--accent-blue)', glow: true },
  paused: { label: 'Paused', bgColor: 'rgba(255, 224, 74, 0.15)', textColor: 'var(--accent-yellow)', glow: false },
  error: { label: 'Error', bgColor: 'rgba(255, 74, 74, 0.15)', textColor: '#ff4a4a', glow: false },
}

export function AgentCard({ agent }: { agent: AgentData }) {
  const config = statusConfig[agent.status] || statusConfig.idle
  const lastActivity = agent.recentActivity?.[0]

  return (
    <div
      className="glass-card p-5 transition-all duration-300"
      style={config.glow ? { boxShadow: `0 0 20px ${agent.color}22, 0 0 60px ${agent.color}11` } : undefined}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full flex items-center justify-center text-lg font-bold"
            style={{ background: `${agent.color}22`, color: agent.color, border: `2px solid ${agent.color}44` }}>
            {agent.name[0]}
          </div>
          <div>
            <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{agent.name}</h3>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{agent.role}</p>
          </div>
        </div>
        <span className="px-2.5 py-1 rounded-full text-xs font-medium"
          style={{ background: config.bgColor, color: config.textColor }}>
          {agent.status === 'working' && <span className="inline-block w-1.5 h-1.5 rounded-full mr-1.5 animate-pulse" style={{ background: config.textColor }} />}
          {config.label}
        </span>
      </div>

      {agent.status === 'working' && agent.currentTask && (
        <div className="mb-3">
          <p className="text-xs font-medium mb-2 truncate" style={{ color: 'var(--text-primary)' }}>
            {agent.currentTask.title}
          </p>
          <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${agent.currentTask.progress}%`, background: agent.color }}
            />
          </div>
          <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
            {agent.currentTask.progress}% complete
          </p>
        </div>
      )}

      {agent.status === 'idle' && lastActivity && (
        <p className="text-xs truncate mb-3" style={{ color: 'var(--text-secondary)' }}>
          Last: {lastActivity.message}
        </p>
      )}

      <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
        <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
          Tasks completed
        </span>
        <span className="text-sm font-semibold" style={{ color: agent.color }}>
          {agent.tasks_completed}
        </span>
      </div>
    </div>
  )
}
