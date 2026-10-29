'use client'

import { useState, useEffect, useRef } from 'react'

export interface StreamEvent {
  agentId: string
  type: string
  data: Record<string, unknown>
  timestamp: string
}

export interface ActivityItem {
  id: string
  agentId: string
  message: string
  type: string
  timestamp: string
  taskId?: string
}

export function useEventStream(shopId: string) {
  const [connected, setConnected] = useState(false)
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [agentUpdates, setAgentUpdates] = useState<Map<string, StreamEvent>>(new Map())
  const eventSourceRef = useRef<EventSource | null>(null)
  const activityIdRef = useRef(0)

  useEffect(() => {
    const es = new EventSource(`/api/shops/${shopId}/stream`)
    eventSourceRef.current = es

    es.onopen = () => setConnected(true)
    es.onerror = () => setConnected(false)

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as StreamEvent
        if (data.type === 'connected') {
          setConnected(true)
          return
        }

        // Update agent state
        if (data.agentId) {
          setAgentUpdates(prev => {
            const next = new Map(prev)
            next.set(data.agentId, data)
            return next
          })
        }

        // Add to activity feed for relevant events
        if (data.type === 'activity' || data.type === 'task_started' || data.type === 'task_completed' || data.type === 'task_failed') {
          const message = (data.data?.message as string) ||
            (data.type === 'task_started' ? `Gestart: ${data.data?.title}` : '') ||
            (data.type === 'task_completed' ? `Voltooid: ${data.data?.title}` : '') ||
            (data.type === 'task_failed' ? `Mislukt: ${data.data?.error}` : '')

          if (message) {
            setActivities(prev => [{
              id: `activity-${++activityIdRef.current}`,
              agentId: data.agentId,
              message,
              type: (data.data?.activityType as string) || (data.type === 'task_completed' ? 'success' : data.type === 'task_failed' ? 'error' : 'info'),
              timestamp: data.timestamp,
              taskId: data.data?.taskId as string | undefined,
            }, ...prev].slice(0, 100))
          }
        }
      } catch {
        // Ignore parse errors
      }
    }

    return () => {
      es.close()
      eventSourceRef.current = null
    }
  }, [shopId])

  return { connected, activities, agentUpdates }
}
