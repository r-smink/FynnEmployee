'use client'

import type { AgentData } from '@/hooks/use-agents'
import { AgentCard } from './agent-card'

export function AgentGrid({ agents, onAgentClick }: { agents: AgentData[]; onAgentClick?: (agent: AgentData) => void }) {
  return (
    <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(248px,1fr))' }}>
      {agents.map((agent) => (
        <AgentCard key={agent.id} agent={agent} onClick={onAgentClick ? () => onAgentClick(agent) : undefined} />
      ))}
    </div>
  )
}
