'use client'

import { Topbar } from '@/components/layout/topbar'
import { MetricsBar } from '@/components/dashboard/metrics-bar'
import { AgentGrid } from '@/components/dashboard/agent-grid'
import { ActivityFeed } from '@/components/dashboard/activity-feed'
import { useAgents } from '@/hooks/use-agents'
import { useEventStream } from '@/hooks/use-event-stream'

export default function DashboardPage() {
  const { agents, loading } = useAgents('default')
  const { connected, activities } = useEventStream('default')

  return (
    <>
      <Topbar title="Command Center" subtitle="Monitor your AI workforce in real-time" connected={connected} />
      <div className="p-6 space-y-6">
        <MetricsBar agents={agents} />

        <div>
          <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Agent Workforce</h3>
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="glass-card p-5 h-48 animate-pulse" />
              ))}
            </div>
          ) : (
            <AgentGrid agents={agents} />
          )}
        </div>

        <ActivityFeed activities={activities} />
      </div>
    </>
  )
}
