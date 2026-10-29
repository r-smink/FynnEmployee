'use client'

import { useState, use } from 'react'
import Link from 'next/link'
import { Users, Building2 } from 'lucide-react'
import { Topbar } from '@/components/layout/topbar'
import { PageBody } from '@/components/layout/app-shell'
import { MetricsBar } from '@/components/dashboard/metrics-bar'
import { AgentGrid } from '@/components/dashboard/agent-grid'
import { ActivityFeed } from '@/components/dashboard/activity-feed'
import { SlideOverPanel } from '@/components/panels/SlideOverPanel'
import { AgentPanel } from '@/components/panels/AgentPanel'
import { useAgents } from '@/hooks/use-agents'
import { useEventStream } from '@/hooks/use-event-stream'

export default function DashboardPage({ params }: { params: Promise<{ shopId: string }> }) {
  const { shopId } = use(params)
  const { agents, loading } = useAgents(shopId)
  const { connected, activities } = useEventStream(shopId)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selected = selectedId ? agents.find(a => a.id === selectedId) : undefined

  return (
    <>
      <Topbar title="Commandocentrum" subtitle="Monitor je AI-personeel in realtime" connected={connected} />
      <PageBody>
        <MetricsBar agents={agents} />

        <div className="flex items-center justify-between mb-3.5">
          <div className="flex items-center gap-[9px]">
            <Users className="w-[19px] h-[19px]" style={{ color: 'var(--fyn-purple)' }} />
            <h3 className="m-0 text-[17px] font-bold" style={{ color: 'var(--text-h)' }}>AI-personeel</h3>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-[12.5px]" style={{ color: 'var(--text-m)' }}>{agents.length} agents · realtime</span>
            <Link href={`/shops/${shopId}/office`} className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold">
              <Building2 className="w-3.5 h-3.5" /> Bekijk kantoor
            </Link>
          </div>
        </div>

        <div className="mb-[22px]">
          {loading ? (
            <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(248px,1fr))' }}>
              {[...Array(5)].map((_, i) => <div key={i} className="fynn-card h-44 animate-pulse" />)}
            </div>
          ) : (
            <AgentGrid agents={agents} onAgentClick={a => setSelectedId(a.id)} />
          )}
        </div>

        <ActivityFeed activities={activities} agents={agents} />
      </PageBody>

      <SlideOverPanel open={!!selected} onClose={() => setSelectedId(null)}
        title={selected?.name || ''} subtitle="Agent-details" color={selected?.color}>
        {selected && <AgentPanel agent={selected} />}
      </SlideOverPanel>
    </>
  )
}
