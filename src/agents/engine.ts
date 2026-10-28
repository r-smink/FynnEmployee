import { LunaAgent } from './luna'
import { MarcusAgent } from './marcus'
import { AriaAgent } from './aria'
import { RexAgent } from './rex'
import { NovaAgent } from './nova'
import { BaseAgent } from './base-agent'
import type { AgentId } from './types'

class AgentEngine {
  agents: Map<AgentId, BaseAgent> = new Map()
  private running = false
  private timers: NodeJS.Timeout[] = []

  constructor() {
    this.agents.set('luna', new LunaAgent())
    this.agents.set('marcus', new MarcusAgent())
    this.agents.set('aria', new AriaAgent())
    this.agents.set('rex', new RexAgent())
    this.agents.set('nova', new NovaAgent())
  }

  start() {
    if (this.running) return
    this.running = true

    // Start simulation loop - each agent gets its own cycle
    for (const [id, agent] of this.agents) {
      this.scheduleAgent(id, agent)
    }
  }

  private scheduleAgent(id: AgentId, agent: BaseAgent) {
    const minDelay = 8000  // 8 sec
    const maxDelay = 25000 // 25 sec
    const delay = minDelay + Math.random() * (maxDelay - minDelay)

    const timer = setTimeout(async () => {
      if (!this.running) return

      if (agent.status === 'idle') {
        try {
          const task = agent.createTask()
          await agent.processTask(task)
        } catch (e) {
          console.error(`Agent ${id} error:`, e)
        }
      }

      // Schedule next task
      if (this.running) {
        this.scheduleAgent(id, agent)
      }
    }, delay)

    this.timers.push(timer)
  }

  stop() {
    this.running = false
    this.timers.forEach(t => clearTimeout(t))
    this.timers = []
  }

  getAgent(id: AgentId): BaseAgent | undefined {
    return this.agents.get(id)
  }

  ensureStarted() {
    this.start()
  }
}

const globalForEngine = globalThis as unknown as { __fynnEngine: AgentEngine }
export const engine = globalForEngine.__fynnEngine || (globalForEngine.__fynnEngine = new AgentEngine())
