import { BaseAgent } from './base-agent'
import type { AgentConfig, Task, SimulationStep, TaskType } from './types'

export class NovaAgent extends BaseAgent {
  constructor(config: AgentConfig) {
    super(config)
  }

  getSystemPrompt(): string {
    return `You are Nova, a data analytics AI agent for an Etsy print-on-demand store.
You analyze sales data, market trends, and competitor strategies to provide actionable insights.
Your responses should include:
- Key metrics and findings
- Trend identification with data points
- Actionable recommendations (2-3 specific actions)
- Risk factors or opportunities to watch
Keep responses under 200 words. Be data-driven and specific with numbers.`
  }

  getTaskPrompt(task: Task): string {
    if (task.type === 'analytics_report') {
      return `Generate a daily performance report for our Etsy print-on-demand store. Include revenue trends, top-selling products, conversion rates, and 3 recommendations for tomorrow.`
    }
    if (task.type === 'analytics_trend') {
      return `Analyze trending product categories on Etsy right now. Which niches are growing? What seasonal opportunities are coming up? Suggest 3 design directions we should pursue.`
    }
    return `Conduct a competitor pricing analysis for print-on-demand products on Etsy. Compare our pricing strategy, identify gaps, and suggest pricing adjustments for maximum margin.`
  }

  generateTask(): { type: TaskType; title: string; description: string } {
    const types: TaskType[] = ['analytics_report', 'analytics_trend', 'analytics_competitor']
    const type = types[Math.floor(Math.random() * types.length)]

    const titles: Record<string, string> = {
      analytics_report: 'Generate daily performance report',
      analytics_trend: 'Analyze trending product categories',
      analytics_competitor: 'Competitor pricing analysis',
    }

    const descs: Record<string, string> = {
      analytics_report: 'Compiling sales, revenue, and traffic metrics',
      analytics_trend: 'Identifying emerging trends and opportunities',
      analytics_competitor: 'Reviewing competitor pricing strategies',
    }

    return { type, title: titles[type], description: descs[type] }
  }

  getSimulationSteps(task: Task): SimulationStep[] {
    if (task.type === 'analytics_report') {
      return [
        { message: 'Collecting sales data from all channels...', type: 'info', progress: 10, durationMs: 2000 },
        { message: 'Calculating revenue and profit margins...', type: 'thinking', progress: 30, durationMs: 2500 },
        { message: 'Analyzing conversion rates...', type: 'info', progress: 50, durationMs: 2000 },
        { message: 'Generating charts and visualizations...', type: 'info', progress: 70, durationMs: 3000 },
        { message: 'Compiling executive summary...', type: 'thinking', progress: 90, durationMs: 2000 },
        { message: 'Daily report published!', type: 'success', progress: 100, durationMs: 1000 },
      ]
    }
    if (task.type === 'analytics_trend') {
      return [
        { message: 'Scanning marketplace trend data...', type: 'thinking', progress: 20, durationMs: 2500 },
        { message: 'Identifying rising product categories...', type: 'info', progress: 45, durationMs: 3000 },
        { message: 'Correlating with seasonal patterns...', type: 'thinking', progress: 70, durationMs: 2500 },
        { message: 'Trend analysis complete', type: 'success', progress: 100, durationMs: 1000 },
      ]
    }
    return [
      { message: 'Scanning competitor Etsy stores...', type: 'thinking', progress: 15, durationMs: 2000 },
      { message: 'Comparing pricing across categories...', type: 'info', progress: 40, durationMs: 2500 },
      { message: 'Identifying pricing opportunities...', type: 'thinking', progress: 65, durationMs: 2500 },
      { message: 'Generating pricing recommendations...', type: 'info', progress: 85, durationMs: 2000 },
      { message: 'Competitor analysis finalized', type: 'success', progress: 100, durationMs: 1000 },
    ]
  }
}
