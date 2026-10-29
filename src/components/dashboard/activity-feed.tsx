'use client'

import { formatDistanceToNow } from 'date-fns'
import { nl } from 'date-fns/locale'
import { Rss } from 'lucide-react'
import type { ActivityItem } from '@/hooks/use-event-stream'
import type { AgentData } from '@/hooks/use-agents'
import { DEFAULT_AGENT_TEMPLATES } from '@/agents/types'
import { ACTIVITY_COLORS, alpha } from '@/lib/labels'

// Resolve name/color from live agents, falling back to the default templates
// (agent ids in non-default shops are prefixed with the shop id)
function resolveAgent(agentId: string, agents?: AgentData[]) {
  const live = agents?.find(a => a.id === agentId)
  if (live) return { name: live.name, color: live.color }
  const key = Object.keys(DEFAULT_AGENT_TEMPLATES).find(k => agentId === k || agentId.endsWith(`-${k}`))
  if (key) return { name: DEFAULT_AGENT_TEMPLATES[key].name, color: DEFAULT_AGENT_TEMPLATES[key].color }
  return { name: agentId, color: '#8f87a3' }
}

export function ActivityFeed({ activities, agents }: { activities: ActivityItem[]; agents?: AgentData[] }) {
  return (
    <div className="fynn-card overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--divide)' }}>
        <div className="flex items-center gap-[9px]">
          <Rss className="w-[17px] h-[17px]" style={{ color: 'var(--fyn-purple)' }} />
          <h3 className="fynn-section-title">Live activiteit</h3>
        </div>
        <span className="inline-flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-m)' }}>
          <span className="w-[7px] h-[7px] rounded-full animate-fynn-pulse" style={{ background: '#10b981' }} />
          Streaming
        </span>
      </div>

      {activities.length === 0 ? (
        <div className="px-5 py-10 text-center">
          <p className="text-[13px]" style={{ color: 'var(--text-m)' }}>Wachten op activiteit van agents…</p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-s)' }}>De agents gaan zo aan de slag</p>
        </div>
      ) : (
        <div className="max-h-[360px] overflow-y-auto">
          {activities.map((item) => {
            const { name, color } = resolveAgent(item.agentId, agents)
            let timeAgo = 'nu'
            try { timeAgo = formatDistanceToNow(new Date(item.timestamp), { addSuffix: true, locale: nl }) } catch {}

            return (
              <div key={item.id} className="flex items-start gap-3 px-5 py-[13px] animate-fade-in" style={{ borderBottom: '1px solid var(--divide)' }}>
                <div className="w-[30px] h-[30px] rounded-full flex items-center justify-center text-xs font-bold flex-none"
                  style={{ background: alpha(color, '22'), color }}>
                  {name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[12.5px] font-bold" style={{ color }}>{name}</span>
                    <span className="w-[3px] h-[3px] rounded-full" style={{ background: 'var(--text-s)' }} />
                    <span className="text-[11.5px]" style={{ color: 'var(--text-s)' }}>{timeAgo}</span>
                  </div>
                  <div className="text-[13px] leading-[1.45]" style={{ color: 'var(--text-b)' }}>{item.message}</div>
                </div>
                <span className="w-2 h-2 rounded-full flex-none mt-1.5" style={{ background: ACTIVITY_COLORS[item.type] || ACTIVITY_COLORS.info }} />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
