'use client'

import { DollarSign, ShoppingBag, Users, CheckCircle2 } from 'lucide-react'
import type { AgentData } from '@/hooks/use-agents'

interface MetricsBarProps {
  agents: AgentData[]
}

export function MetricsBar({ agents }: MetricsBarProps) {
  const activeAgents = agents.filter(a => a.status === 'working').length
  const totalTasks = agents.reduce((sum, a) => sum + a.tasks_completed, 0)

  const metrics = [
    { label: 'Total Revenue', value: '$4,827.50', icon: DollarSign, color: 'var(--accent-green)' },
    { label: 'Orders Today', value: '23', icon: ShoppingBag, color: 'var(--accent-blue)' },
    { label: 'Active Agents', value: `${activeAgents} / ${agents.length}`, icon: Users, color: 'var(--accent-purple)' },
    { label: 'Tasks Completed', value: totalTasks.toString(), icon: CheckCircle2, color: 'var(--accent-orange)' },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {metrics.map((metric) => (
        <div key={metric.label} className="glass-card px-5 py-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>{metric.label}</p>
              <p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{metric.value}</p>
            </div>
            <div className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ background: `${metric.color}15` }}>
              <metric.icon className="w-5 h-5" style={{ color: metric.color }} />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
