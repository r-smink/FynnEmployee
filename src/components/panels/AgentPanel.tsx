'use client'

import { formatDistanceToNow } from 'date-fns'
import type { AgentData } from '@/hooks/use-agents'

const activityColors: Record<string, string> = {
  info: 'var(--accent-blue)',
  success: 'var(--accent-green)',
  warning: 'var(--accent-yellow)',
  error: '#ff4a4a',
  thinking: 'var(--accent-purple)',
}

export function AgentPanel({ agent }: { agent: AgentData }) {
  return (
    <div className="space-y-5">
      {/* Profile */}
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold"
          style={{ background: `${agent.color}22`, color: agent.color, border: `2px solid ${agent.color}44` }}>
          {agent.name[0]}
        </div>
        <div>
          <h4 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>{agent.name}</h4>
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{agent.role}</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{agent.description}</p>
        </div>
      </div>

      {/* Status */}
      <div className="glass-card p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Status</span>
          <span className="px-2 py-0.5 rounded-full text-xs font-medium"
            style={{
              background: agent.status === 'working' ? `${agent.color}22` : 'rgba(136,136,170,0.15)',
              color: agent.status === 'working' ? agent.color : 'var(--text-secondary)',
            }}>
            {agent.status === 'working' && <span className="inline-block w-1.5 h-1.5 rounded-full mr-1 animate-pulse" style={{ background: agent.color }} />}
            {agent.status.charAt(0).toUpperCase() + agent.status.slice(1)}
          </span>
        </div>

        {agent.currentTask && (
          <div className="mt-3">
            <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-primary)' }}>{agent.currentTask.title}</p>
            <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
              <div className="h-full rounded-full transition-all duration-500"
                style={{ width: `${agent.currentTask.progress}%`, background: agent.color }} />
            </div>
            <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>{agent.currentTask.progress}%</p>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="glass-card p-3 text-center">
          <p className="text-lg font-bold" style={{ color: agent.color }}>{agent.tasks_completed}</p>
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Tasks Done</p>
        </div>
        <div className="glass-card p-3 text-center">
          <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{agent.template_type}</p>
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Type</p>
        </div>
      </div>

      {/* Recent Activity */}
      <div>
        <h4 className="text-xs font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>Recent Activity</h4>
        <div className="space-y-2">
          {agent.recentActivity.map((item) => {
            let timeAgo = ''
            try { timeAgo = formatDistanceToNow(new Date(item.created_at), { addSuffix: true }) } catch { timeAgo = 'just now' }
            return (
              <div key={item.id} className="flex items-start gap-2 py-1.5">
                <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0"
                  style={{ background: activityColors[item.type] || activityColors.info }} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--text-primary)' }}>{item.message}</p>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{timeAgo}</p>
                </div>
              </div>
            )
          })}
          {agent.recentActivity.length === 0 && (
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>No recent activity</p>
          )}
        </div>
      </div>
    </div>
  )
}
