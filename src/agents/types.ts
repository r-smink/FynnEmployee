export type AgentStatus = 'idle' | 'working' | 'paused' | 'error'
export type TaskStatus = 'queued' | 'in_progress' | 'completed' | 'failed'
export type ActivityType = 'info' | 'success' | 'warning' | 'error' | 'thinking'

export type AgentTemplate = 'design' | 'listing' | 'fulfillment' | 'support' | 'analytics' | 'manager' | 'custom'

export type TaskType =
  | 'design_generate' | 'design_curate' | 'design_trending'
  | 'listing_create' | 'listing_optimize' | 'listing_refresh'
  | 'order_fulfill' | 'order_track' | 'order_confirm'
  | 'support_reply' | 'support_review' | 'support_followup'
  | 'analytics_report' | 'analytics_trend' | 'analytics_competitor'
  | 'manager_delegate' | 'manager_review' | 'manager_optimize'
  | 'custom_task'

export interface AgentConfig {
  id: string
  shopId: string
  name: string
  templateType: AgentTemplate
  customPrompt?: string
  model?: string
  color?: string
  enabled?: boolean
}

export interface Agent {
  id: string
  shop_id: string
  name: string
  role: string
  description: string
  avatar_url: string
  color: string
  status: AgentStatus
  current_task_id: string | null
  tasks_completed: number
  template_type: AgentTemplate
  is_custom: number
  is_manager: number
  custom_prompt: string | null
  model: string | null
  enabled: number
  position_x: number
  position_y: number
  created_at: string
  updated_at: string
}

export interface Task {
  id: string
  shop_id: string
  agent_id: string
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
  shop_id: string
  agent_id: string
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

export const DEFAULT_AGENT_TEMPLATES: Record<string, {
  id: string; name: string; role: string; description: string; color: string; templateType: AgentTemplate; isManager?: boolean
}> = {
  luna: { id: 'luna', name: 'Luna', role: 'Design Agent', description: 'Creates stunning custom designs and artwork', color: '#9e4aff', templateType: 'design' },
  marcus: { id: 'marcus', name: 'Marcus', role: 'Listing Agent', description: 'Optimizes and manages Etsy listings', color: '#4a9eff', templateType: 'listing' },
  aria: { id: 'aria', name: 'Aria', role: 'Fulfillment Agent', description: 'Manages order fulfillment and shipping', color: '#4aff9e', templateType: 'fulfillment' },
  rex: { id: 'rex', name: 'Rex', role: 'Support Agent', description: 'Handles customer support and reviews', color: '#ff9e4a', templateType: 'support' },
  nova: { id: 'nova', name: 'Nova', role: 'Analytics Agent', description: 'Analyzes sales trends and performance', color: '#ff4a9e', templateType: 'analytics' },
  fynn: { id: 'fynn', name: 'Fynn', role: 'Manager Agent', description: 'Oversees and coordinates the entire workforce', color: '#ffe04a', templateType: 'manager', isManager: true },
}
