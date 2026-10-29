import { BaseAgent } from './base-agent'
import type { AgentConfig, Task, SimulationStep, TaskType } from './types'

export class CustomAgent extends BaseAgent {
  constructor(config: AgentConfig) {
    super(config)
  }

  getSystemPrompt(): string {
    return this.customPrompt || `You are ${this.name}, a custom AI agent for an Etsy print-on-demand store. Complete assigned tasks efficiently and report results concisely.`
  }

  getTaskPrompt(task: Task): string {
    return `Complete this task: ${task.title}. ${task.description || ''} Provide a concise result.`
  }

  generateTask(): { type: TaskType; title: string; description: string } {
    return {
      type: 'custom_task',
      title: `${this.name}: General task`,
      description: `${this.name} performing assigned work`,
    }
  }

  getSimulationSteps(task: Task): SimulationStep[] {
    return [
      { message: 'Analyzing task requirements...', type: 'thinking', progress: 20, durationMs: 2000 },
      { message: 'Processing...', type: 'info', progress: 50, durationMs: 3000 },
      { message: 'Finalizing results...', type: 'info', progress: 80, durationMs: 2000 },
      { message: 'Task complete', type: 'success', progress: 100, durationMs: 1000 },
    ]
  }
}
