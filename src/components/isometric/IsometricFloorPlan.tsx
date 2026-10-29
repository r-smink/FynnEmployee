'use client'

import { ROOMS, VIEW_WIDTH, VIEW_HEIGHT, VIEW_OFFSET_X } from './isometric-utils'
import { IsometricRoom } from './IsometricRoom'
import { IsometricAgent } from './IsometricAgent'
import { DesignStudioFurniture } from './rooms/DesignStudio'
import { ListingOfficeFurniture } from './rooms/ListingOffice'
import { FulfillmentRoomFurniture } from './rooms/FulfillmentRoom'
import { SupportDeskFurniture } from './rooms/SupportDesk'
import { AnalyticsLabFurniture } from './rooms/AnalyticsLab'
import { ManagerOfficeFurniture } from './rooms/ManagerOffice'
import type { AgentData } from '@/hooks/use-agents'

const FURNITURE: Record<string, React.FC> = {
  design: DesignStudioFurniture,
  listing: ListingOfficeFurniture,
  fulfillment: FulfillmentRoomFurniture,
  support: SupportDeskFurniture,
  analytics: AnalyticsLabFurniture,
  manager: ManagerOfficeFurniture,
}

interface Props {
  agents: AgentData[]
  onAgentClick?: (agent: AgentData) => void
  onRoomClick?: (roomId: string) => void
}

export function IsometricFloorPlan({ agents, onAgentClick, onRoomClick }: Props) {
  // Map agents to rooms by template_type
  const agentsByTemplate = new Map<string, AgentData>()
  for (const agent of agents) {
    agentsByTemplate.set(agent.template_type, agent)
  }

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
        className="w-full min-w-[700px] max-w-[1100px] mx-auto"
        style={{ height: 'auto' }}
      >
        {/* Background grid pattern */}
        <defs>
          <pattern id="iso-grid" width="40" height="20" patternUnits="userSpaceOnUse">
            <path d="M0 10 L20 0 L40 10 L20 20 Z" fill="none" stroke="rgba(42,42,74,0.3)" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width={VIEW_WIDTH} height={VIEW_HEIGHT} fill="transparent" />

        {/* Render rooms back to front for correct overlap (sort by row then col) */}
        {[...ROOMS]
          .sort((a, b) => (a.row + a.col) - (b.row + b.col))
          .map((room) => {
            const Furniture = FURNITURE[room.agentTemplate]
            const agent = agentsByTemplate.get(room.agentTemplate)

            return (
              <IsometricRoom
                key={room.id}
                room={room}
                onClick={() => onRoomClick?.(room.id)}
              >
                {/* Furniture */}
                {Furniture && <Furniture />}

                {/* Agent sprite */}
                {agent && (
                  <IsometricAgent
                    name={agent.name}
                    color={agent.color}
                    status={agent.status}
                    isManager={agent.is_manager === 1}
                    x={-15}
                    y={5}
                    onClick={() => onAgentClick?.(agent)}
                  />
                )}
              </IsometricRoom>
            )
          })}

        {/* Custom agents without rooms get placed in bottom area */}
        {agents
          .filter(a => a.is_custom === 1 && !ROOMS.some(r => r.agentTemplate === a.template_type))
          .map((agent, i) => {
            const x = VIEW_OFFSET_X - 100 + (i * 80)
            const y = VIEW_HEIGHT - 60
            return (
              <IsometricAgent
                key={agent.id}
                name={agent.name}
                color={agent.color}
                status={agent.status}
                x={x}
                y={y}
                onClick={() => onAgentClick?.(agent)}
              />
            )
          })}
      </svg>
    </div>
  )
}
