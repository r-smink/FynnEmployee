'use client'

import type { AgentData } from '@/hooks/use-agents'
import { AgentCard } from './agent-card'

export function AgentGrid({ agents }: { agents: AgentData[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
      {agents.map((agent) => (
        <AgentCard key={agent.id} agent={agent} />
      ))}
    </div>
  )
}
