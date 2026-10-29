import { BaseAgent } from './base-agent'
import type { AgentConfig, Task, SimulationStep, TaskType } from './types'

const CUSTOMER_TOPICS = [
  'sizing question', 'shipping timeframe', 'custom design request', 'return policy',
  'bulk order inquiry', 'color options', 'gift wrapping', 'international shipping',
  'design modification', 'order status update', 'product care instructions', 'discount inquiry',
]

export class RexAgent extends BaseAgent {
  constructor(config: AgentConfig) {
    super(config)
  }

  getSystemPrompt(): string {
    return `You are Rex, a friendly and professional customer support AI agent for an Etsy print-on-demand store.
You handle customer messages, review responses, and follow-ups with warmth and efficiency.
Your responses should:
- Address the customer's concern directly
- Be warm, professional, and helpful
- Include specific details (timelines, policies, options)
- End with a clear next step or offer of further help
Keep responses under 150 words. Sound human and caring, not robotic.`
  }

  getTaskPrompt(task: Task): string {
    if (task.type === 'support_reply') {
      return `Draft a customer reply for: ${task.title}. The customer is asking about ${task.description}. Write a friendly, helpful response that addresses their concern.`
    }
    if (task.type === 'support_review') {
      return `Analyze customer feedback for our store. Categorize sentiment (positive/neutral/negative), identify common themes, and suggest 2-3 actionable improvements.`
    }
    return `Draft a follow-up message for: ${task.title}. Check in on their previous ${task.description} inquiry. Be warm and proactive.`
  }

  generateTask(): { type: TaskType; title: string; description: string } {
    const topic = CUSTOMER_TOPICS[Math.floor(Math.random() * CUSTOMER_TOPICS.length)]
    const types: TaskType[] = ['support_reply', 'support_review', 'support_followup']
    const type = types[Math.floor(Math.random() * types.length)]

    const titles: Record<string, string> = {
      support_reply: `Reply to customer about ${topic}`,
      support_review: `Review new customer feedback`,
      support_followup: `Follow up on ${topic}`,
    }

    return {
      type,
      title: titles[type],
      description: `Handling customer ${topic}`,
    }
  }

  getSimulationSteps(task: Task): SimulationStep[] {
    if (task.type === 'support_reply') {
      return [
        { message: 'Reading customer message...', type: 'thinking', progress: 15, durationMs: 1500 },
        { message: 'Checking order history and product details...', type: 'info', progress: 35, durationMs: 2000 },
        { message: 'Drafting personalized response...', type: 'thinking', progress: 60, durationMs: 2500 },
        { message: 'Reviewing tone and helpfulness...', type: 'info', progress: 80, durationMs: 1500 },
        { message: 'Response sent to customer!', type: 'success', progress: 100, durationMs: 1000 },
      ]
    }
    if (task.type === 'support_review') {
      return [
        { message: 'Scanning new customer reviews...', type: 'thinking', progress: 20, durationMs: 2000 },
        { message: 'Categorizing feedback sentiment...', type: 'info', progress: 50, durationMs: 2000 },
        { message: 'Flagging items needing response...', type: 'info', progress: 75, durationMs: 1500 },
        { message: 'Review analysis complete', type: 'success', progress: 100, durationMs: 1000 },
      ]
    }
    return [
      { message: 'Checking previous conversation context...', type: 'thinking', progress: 25, durationMs: 1500 },
      { message: 'Drafting follow-up message...', type: 'info', progress: 55, durationMs: 2000 },
      { message: 'Follow-up sent successfully', type: 'success', progress: 100, durationMs: 1000 },
    ]
  }
}
