export type AgentId = 'luna' | 'marcus' | 'aria' | 'rex' | 'nova'
export type AgentStatus = 'idle' | 'working' | 'paused' | 'error'
export type TaskStatus = 'queued' | 'in_progress' | 'completed' | 'failed'
export type ActivityType = 'info' | 'success' | 'warning' | 'error' | 'thinking'

export type TaskType =
  | 'design_generate' | 'design_curate' | 'design_trending'
  | 'listing_create' | 'listing_optimize' | 'listing_refresh'
  | 'order_fulfill' | 'order_track' | 'order_confirm'
  | 'support_reply' | 'support_review' | 'support_followup'
  | 'analytics_report' | 'analytics_trend' | 'analytics_competitor'

export interface Agent {
  id: AgentId
  name: string
  role: string
  description: string
  avatar_url: string
  color: string
  status: AgentStatus
  current_task_id: string | null
  tasks_completed: number
  created_at: string
  updated_at: string
}

export interface Task {
  id: string
  agent_id: AgentId
  type: TaskType
  title: string
  description: string | null
  status: TaskStatus
  priority: number
  input_data: string | null
  output_data: string | null
  progress: number
  started_at: string | null
  completed_at: string | null
  created_at: string
}

export interface ActivityEntry {
  id: number
  agent_id: AgentId
  task_id: string | null
  message: string
  type: ActivityType
  metadata: string | null
  created_at: string
}

export interface SimulationStep {
  message: string
  type: ActivityType
  progress: number
  durationMs: number
}

export const AGENT_PROFILES: Record<AgentId, { name: string; role: string; description: string; color: string }> = {
  luna: { name: 'Luna', role: 'Design Agent', description: 'Creates stunning custom designs', color: '#9e4aff' },
  marcus: { name: 'Marcus', role: 'Listing Agent', description: 'Optimizes Etsy listings', color: '#4a9eff' },
  aria: { name: 'Aria', role: 'Fulfillment Agent', description: 'Manages order fulfillment', color: '#4aff9e' },
  rex: { name: 'Rex', role: 'Support Agent', description: 'Handles customer support', color: '#ff9e4a' },
  nova: { name: 'Nova', role: 'Analytics Agent', description: 'Analyzes sales trends', color: '#ff4a9e' },
}
