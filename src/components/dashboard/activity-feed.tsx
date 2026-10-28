'use client'

import { formatDistanceToNow } from 'date-fns'
import type { ActivityItem } from '@/hooks/use-event-stream'

const typeColors: Record<string, string> = {
  info: 'var(--accent-blue)',
  success: 'var(--accent-green)',
  warning: 'var(--accent-yellow)',
  error: '#ff4a4a',
  thinking: 'var(--accent-purple)',
}

const agentColors: Record<string, string> = {
  luna: '#9e4aff',
  marcus: '#4a9eff',
  aria: '#4aff9e',
  rex: '#ff9e4a',
  nova: '#ff4a9e',
}
const agentNames: Record<string, string> = {
  luna: 'Luna',
  marcus: 'Marcus',
  aria: 'Aria',
  rex: 'Rex',
  nova: 'Nova',
}

export function ActivityFeed({ activities }: { activities: ActivityItem[] }) {
  if (activities.length === 0) {
    return (
      <div className="glass-card p-6 text-center">
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Waiting for agent activity...
        </p>
        <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
          Agents will start working shortly
        </p>
      </div>
    )
  }

  return (
    <div className="glass-card overflow-hidden">
      <div className="px-5 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
        <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Live Activity Feed</h3>
      </div>
      <div className="max-h-96 overflow-y-auto divide-y" style={{ borderColor: 'var(--border)' }}>
        {activities.map((item) => {
          const color = agentColors[item.agentId] || 'var(--text-secondary)'
          const name = agentNames[item.agentId] || item.agentId
          const typeColor = typeColors[item.type] || typeColors.info
          let timeAgo = ''
          try {
            timeAgo = formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })
          } catch {
            timeAgo = 'just now'
          }

          return (
            <div key={item.id} className="flex items-start gap-3 px-5 py-3 animate-fade-in"
              style={{ borderColor: 'var(--border)' }}>
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5"
                style={{ background: `${color}22`, color }}>
                {name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-semibold" style={{ color }}>{name}</span>
                  <span className="w-1 h-1 rounded-full" style={{ background: 'var(--border)' }} />
                  <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{timeAgo}</span>
                </div>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-primary)' }}>{item.message}</p>
              </div>
              <div className="w-1.5 h-1.5 rounded-full shrink-0 mt-2" style={{ background: typeColor }} />
            </div>
          )
        })}
      </div>
    </div>
  )
}
