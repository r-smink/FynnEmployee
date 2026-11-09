import { all, run } from '@/lib/db'
import { createAgentFromRecord } from './agent-factory'
import { BaseAgent } from './base-agent'
import type { Agent } from './types'
import { purgeDemoDataIfLive } from '@/lib/demo-data'
import { startOrderLoop } from '@/lib/orders'
import { isAiEnabled } from '@/lib/ai'
import { nextQueuedTask } from '@/lib/agent-queue'

class AgentEngine {
  shops: Map<string, Map<string, BaseAgent>> = new Map()
  private running: Map<string, boolean> = new Map()
  private timers: NodeJS.Timeout[] = []

  loadShop(shopId: string): Map<string, BaseAgent> {
    if (this.shops.has(shopId)) return this.shops.get(shopId)!

    const records = all<Agent>('SELECT * FROM agents WHERE shop_id = ?', shopId)
    const agentMap = new Map<string, BaseAgent>()

    for (const record of records) {
      const agent = createAgentFromRecord(record)
      agentMap.set(record.id, agent)
    }

    this.shops.set(shopId, agentMap)
    return agentMap
  }

  startShop(shopId: string) {
    if (this.running.get(shopId)) return
    // Leftovers from demo mode or older versions must not show up as real work after a restart
    if (this.running.size === 0) {
      purgeDemoDataIfLive()
      // Queued work that was running when the app stopped starts over instead of looking busy forever
      run("UPDATE tasks SET status = 'queued', progress = 0 WHERE status = 'in_progress' AND priority > 0")
    }
    // Etsy orders go to Printful whether or not the agents work with AI
    startOrderLoop()

    const agents = this.loadShop(shopId)
    this.running.set(shopId, true)

    for (const [id, agent] of agents) {
      this.scheduleAgent(shopId, id, agent)
    }
  }

  private scheduleAgent(shopId: string, id: string, agent: BaseAgent, soon = false) {
    // Manager agent (Fynn) runs less frequently
    const isManager = agent.constructor.name === 'FynnAgent'
    const minDelay = isManager ? 15000 : 8000
    const maxDelay = isManager ? 40000 : 25000
    // Straight after queued work, look for the next queued task quickly
    const delay = soon ? 1000 : minDelay + Math.random() * (maxDelay - minDelay)

    const timer = setTimeout(async () => {
      if (!this.running.get(shopId)) return

      let didQueued = false
      if (agent.enabled && agent.status === 'idle') {
        try {
          // Queued work (owner assignments, fixes) goes first; otherwise in AI Live only real work
          const queued = nextQueuedTask(shopId, id)
          if (queued) {
            didQueued = true
            await agent.processTask(queued)
          } else if (!isAiEnabled() || agent.hasRealWork()) {
            await agent.processTask(agent.createTask())
          }
        } catch (e) {
          console.error(`Agent ${id} (shop ${shopId}) error:`, e)
        }
      }

      if (this.running.get(shopId)) {
        this.scheduleAgent(shopId, id, agent, didQueued)
      }
    }, delay)

    this.timers.push(timer)
  }

  // Starts queued work right away instead of at the agent's next turn. A busy agent picks it up when done.
  wake(shopId: string, agentId?: string) {
    this.startShop(shopId)
    for (const [id, agent] of this.loadShop(shopId)) {
      if (agentId && id !== agentId) continue
      if (!agent.enabled || agent.status !== 'idle') continue
      const queued = nextQueuedTask(shopId, id)
      if (!queued) continue
      agent.processTask(queued).catch(e => console.error(`Agent ${id} (shop ${shopId}) error:`, e))
    }
  }

  stopShop(shopId: string) {
    this.running.set(shopId, false)
    // Note: timers are shared pool, individual shop stop just prevents re-scheduling
  }

  stopAll() {
    for (const shopId of this.running.keys()) {
      this.running.set(shopId, false)
    }
    this.timers.forEach(t => clearTimeout(t))
    this.timers = []
  }

  getAgent(shopId: string, agentId: string): BaseAgent | undefined {
    return this.shops.get(shopId)?.get(agentId)
  }

  getShopAgents(shopId: string): Map<string, BaseAgent> {
    return this.loadShop(shopId)
  }

  ensureShopStarted(shopId: string) {
    this.startShop(shopId)
  }

  addAgent(shopId: string, record: Agent): BaseAgent {
    const agents = this.loadShop(shopId)
    const agent = createAgentFromRecord(record)
    agents.set(record.id, agent)
    if (this.running.get(shopId)) {
      this.scheduleAgent(shopId, record.id, agent)
    }
    return agent
  }

  removeAgent(shopId: string, agentId: string) {
    this.shops.get(shopId)?.delete(agentId)
  }
}

const globalForEngine = globalThis as unknown as { __fynnEngine: AgentEngine }
export const engine = globalForEngine.__fynnEngine || (globalForEngine.__fynnEngine = new AgentEngine())
