import { BaseAgent } from './base-agent'
import { all } from '@/lib/db'
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
      return `Review overall store performance. How are the agents performing? Any bottlenecks? Provide a brief performance summary with 2-3 actionable recommendations.`
    }
    return `Analyze the workforce and suggest optimizations. Are there efficiency improvements? Should we adjust task scheduling? Provide 3 specific optimization ideas.`
  }

  generateTask(): { type: TaskType; title: string; description: string } {
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
