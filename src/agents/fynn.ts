import { BaseAgent } from './base-agent'
import { all, get } from '@/lib/db'
import { isAiEnabled } from '@/lib/ai'
import type { AgentConfig, Task, SimulationStep, TaskType, Agent } from './types'

export class FynnAgent extends BaseAgent {
  constructor(config: AgentConfig) {
    super(config)
  }

  getSystemPrompt(): string {
    return `You are Fynn, the AI manager of an Etsy print-on-demand store workforce.
You oversee a team of specialized AI agents: Luna (design), Marcus (listings), Aria (fulfillment), Rex (support), and Nova (analytics).
Your job is to:
- Monitor productivity and identify bottlenecks
- Suggest task priorities and delegation strategies
- Ensure smooth workflow between agents
- Report on overall store performance
Keep responses under 200 words. Be decisive and leadership-oriented.`
  }

  getTaskPrompt(task: Task): string {
    if (task.type === 'manager_delegate') {
      return `Review the current workforce status and delegate tasks. Which agents are idle? What tasks should be prioritized? Provide 3 specific delegation instructions.`
    }
    if (task.type === 'manager_review') {
      return `Review the store using only the figures given below; do not invent numbers, products or orders. Where is work stuck, what should the owner do first, and which agent is failing? Give a short summary and 2-3 concrete actions. Answer in Dutch.`
    }
    return `Analyze the workforce and suggest optimizations. Are there efficiency improvements? Should we adjust task scheduling? Provide 3 specific optimization ideas.`
  }

  // Live: one review an hour, with real numbers from the shop
  hasRealWork(): boolean {
    return !this.workedWithin(60)
  }

  protected async getTaskContext(task: Task): Promise<string | null> {
    if (task.type !== 'manager_review') return null
    const n = (sql: string) => get<{ n: number }>(sql, this.shopId)?.n ?? 0
    const perAgent = all<{ name: string; done: number; failed: number }>(
      `SELECT a.name,
         SUM(CASE WHEN t.status = 'completed' THEN 1 ELSE 0 END) AS done,
         SUM(CASE WHEN t.status = 'failed' THEN 1 ELSE 0 END) AS failed
       FROM agents a LEFT JOIN tasks t ON t.agent_id = a.id AND t.shop_id = a.shop_id AND t.demo = 0
         AND t.completed_at >= datetime('now', '-1 day')
       WHERE a.shop_id = ? GROUP BY a.id ORDER BY a.name`,
      this.shopId
    )
    return [
      'Figures for this shop right now:',
      `- Designs waiting for the owner to review: ${n("SELECT COUNT(*) AS n FROM products WHERE shop_id = ? AND status = 'review'")}`,
      `- Approved designs failed to reach Etsy: ${n("SELECT COUNT(*) AS n FROM products WHERE shop_id = ? AND publish_status = 'failed'")}`,
      `- Products on Etsy (draft or live): ${n("SELECT COUNT(*) AS n FROM products WHERE shop_id = ? AND publish_status IN ('etsy_draft', 'etsy_live')")}`,
      `- Orders in the last 7 days: ${n("SELECT COUNT(*) AS n FROM orders WHERE shop_id = ? AND created_at >= datetime('now', '-7 days')")}`,
      `- Printful drafts waiting for the owner to confirm: ${n("SELECT COUNT(*) AS n FROM orders WHERE shop_id = ? AND fulfillment_status = 'draft' AND status = 'processing'")}`,
      `- Orders with an error: ${n("SELECT COUNT(*) AS n FROM orders WHERE shop_id = ? AND fulfill_error IS NOT NULL")}`,
      'Agent tasks in the last 24 hours (done / failed):',
      ...perAgent.map(a => `- ${a.name}: ${a.done ?? 0} / ${a.failed ?? 0}`),
    ].join('\n')
  }

  generateTask(): { type: TaskType; title: string; description: string } {
    if (isAiEnabled()) {
      return { type: 'manager_review', title: 'Overzicht van de winkel', description: 'Wat staat vast en wat moet de eigenaar eerst doen' }
    }
    const types: TaskType[] = ['manager_delegate', 'manager_review', 'manager_optimize']
    const type = types[Math.floor(Math.random() * types.length)]

    const titles: Record<string, string> = {
      manager_delegate: 'Delegate tasks to idle agents',
      manager_review: 'Review workforce performance',
      manager_optimize: 'Optimize workflow efficiency',
    }

    const descs: Record<string, string> = {
      manager_delegate: 'Checking agent availability and assigning priority tasks',
      manager_review: 'Evaluating team productivity and store metrics',
      manager_optimize: 'Identifying bottlenecks and improving processes',
    }

    return { type, title: titles[type], description: descs[type] }
  }

  getSimulationSteps(task: Task): SimulationStep[] {
    if (task.type === 'manager_delegate') {
      return [
        { message: 'Scanning workforce status...', type: 'thinking', progress: 15, durationMs: 2000 },
        { message: 'Identifying idle agents...', type: 'info', progress: 35, durationMs: 2000 },
        { message: 'Prioritizing pending tasks...', type: 'thinking', progress: 55, durationMs: 2500 },
        { message: 'Delegating tasks to team members...', type: 'info', progress: 80, durationMs: 2000 },
        { message: 'Delegation complete, all agents assigned', type: 'success', progress: 100, durationMs: 1000 },
      ]
    }
    if (task.type === 'manager_review') {
      return [
        { message: 'Collecting performance metrics...', type: 'info', progress: 20, durationMs: 2000 },
        { message: 'Evaluating agent productivity...', type: 'thinking', progress: 45, durationMs: 2500 },
        { message: 'Analyzing task completion rates...', type: 'info', progress: 70, durationMs: 2000 },
        { message: 'Performance review complete', type: 'success', progress: 100, durationMs: 1000 },
      ]
    }
    return [
      { message: 'Analyzing current workflow patterns...', type: 'thinking', progress: 20, durationMs: 2500 },
      { message: 'Identifying bottlenecks...', type: 'info', progress: 40, durationMs: 2000 },
      { message: 'Simulating alternative task distributions...', type: 'thinking', progress: 65, durationMs: 3000 },
      { message: 'Generating optimization recommendations...', type: 'info', progress: 85, durationMs: 2000 },
      { message: 'Workflow optimization plan ready', type: 'success', progress: 100, durationMs: 1000 },
    ]
  }
}
