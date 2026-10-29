'use client'

import { useState, use } from 'react'
import { Topbar } from '@/components/layout/topbar'
import { MetricsBar } from '@/components/dashboard/metrics-bar'
import { AgentGrid } from '@/components/dashboard/agent-grid'
import { ActivityFeed } from '@/components/dashboard/activity-feed'
import { ViewToggle } from '@/components/dashboard/ViewToggle'
import { IsometricFloorPlan } from '@/components/isometric/IsometricFloorPlan'
import { SlideOverPanel } from '@/components/panels/SlideOverPanel'
import { AgentPanel } from '@/components/panels/AgentPanel'
import { RoomPanel } from '@/components/panels/RoomPanel'
import { useAgents } from '@/hooks/use-agents'
import { useEventStream } from '@/hooks/use-event-stream'
import type { AgentData } from '@/hooks/use-agents'

export default function DashboardPage({ params }: { params: Promise<{ shopId: string }> }) {
  const { shopId } = use(params)
  const { agents, loading } = useAgents(shopId)
  const { connected, activities } = useEventStream(shopId)
  const [viewMode, setViewMode] = useState<'cards' | 'isometric'>('isometric')
  const [selectedAgent, setSelectedAgent] = useState<AgentData | null>(null)
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null)

  const handleAgentClick = (agent: AgentData) => {
    setSelectedRoom(null)
    setSelectedAgent(agent)
  }

  const handleRoomClick = (roomId: string) => {
    setSelectedAgent(null)
    setSelectedRoom(roomId)
  }

  const closePanel = () => {
    setSelectedAgent(null)
    setSelectedRoom(null)
  }

  // Keep selected agent data fresh
  const freshAgent = selectedAgent ? agents.find(a => a.id === selectedAgent.id) || selectedAgent : null

  return (
    <>
      <Topbar title="Command Center" subtitle="Monitor your AI workforce in real-time" connected={connected} />
      <div className="p-6 space-y-6">
        <MetricsBar agents={agents} />

        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Agent Workforce</h3>
            <ViewToggle view={viewMode} onViewChange={setViewMode} />
          </div>

          {loading ? (
            <div className="glass-card p-12 text-center">
              <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mx-auto mb-3"
                style={{ borderColor: 'var(--accent-blue)', borderTopColor: 'transparent' }} />
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Loading agents...</p>
            </div>
          ) : viewMode === 'isometric' ? (
            <div className="glass-card p-4">
              <IsometricFloorPlan
                agents={agents}
                onAgentClick={handleAgentClick}
                onRoomClick={handleRoomClick}
              />
            </div>
          ) : (
            <AgentGrid agents={agents} />
          )}
        </div>

        <ActivityFeed activities={activities} />
      </div>

      {/* Agent Panel */}
      <SlideOverPanel
        open={!!freshAgent}
        onClose={closePanel}
        title={freshAgent?.name || ''}
        subtitle={freshAgent?.role}
        color={freshAgent?.color}
      >
        {freshAgent && <AgentPanel agent={freshAgent} />}
      </SlideOverPanel>

      {/* Room Panel */}
      <SlideOverPanel
        open={!!selectedRoom}
        onClose={closePanel}
        title={selectedRoom ? selectedRoom.charAt(0).toUpperCase() + selectedRoom.slice(1) : ''}
        subtitle="Room Details"
      >
        {selectedRoom && <RoomPanel roomId={selectedRoom} />}
      </SlideOverPanel>
    </>
  )
}
