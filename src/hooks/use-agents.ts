'use client'

import { useState, useEffect, useCallback } from 'react'

export interface AgentData {
  id: string
  name: string
  role: string
  description: string
  avatar_url: string
  color: string
  status: string
  current_task_id: string | null
  tasks_completed: number
  currentTask: {
    id: string
    title: string
    type: string
    progress: number
    status: string
  } | null
  recentActivity: {
    id: number
    message: string
    type: string
    created_at: string
  }[]
}

export function useAgents() {
  const [agents, setAgents] = useState<AgentData[]>([])
  const [loading, setLoading] = useState(true)

  const fetchAgents = useCallback(async () => {
    try {
      const res = await fetch('/api/agents')
      if (res.ok) {
        const data = await res.json()
        setAgents(data)
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAgents()
    const interval = setInterval(fetchAgents, 3000)
    return () => clearInterval(interval)
  }, [fetchAgents])

  return { agents, loading, refresh: fetchAgents }
}
