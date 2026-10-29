import { EventEmitter } from 'events'

const globalForEvents = globalThis as unknown as { __fynnEvents: EventEmitter }

if (!globalForEvents.__fynnEvents) {
  globalForEvents.__fynnEvents = new EventEmitter()
  globalForEvents.__fynnEvents.setMaxListeners(100)
}

export const eventBus = globalForEvents.__fynnEvents

export type AgentEventType = 'status_change' | 'task_started' | 'task_progress' | 'task_completed' | 'task_failed' | 'activity' | 'metric_update'

export interface AgentEvent {
  shopId: string
  agentId: string
  type: AgentEventType
  data: Record<string, unknown>
  timestamp: string
}

export function emitAgentEvent(event: AgentEvent) {
  eventBus.emit('agent-event', event)
  eventBus.emit(`agent-event:${event.shopId}`, event)
}
