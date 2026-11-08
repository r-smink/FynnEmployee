import { BaseAgent } from './base-agent'
import { askAi } from '@/lib/ai'
import { run } from '@/lib/db'
import { checkOrders } from '@/lib/orders'
import type { AgentConfig, Task, SimulationStep, TaskType } from './types'

export class AriaAgent extends BaseAgent {
  constructor(config: AgentConfig) {
    super(config)
  }

  private orderNum(): string {
    return `#${1000 + Math.floor(Math.random() * 9000)}`
  }

  getSystemPrompt(): string {
    return `You are Aria, a fulfillment and logistics AI agent for an Etsy print-on-demand store using Printful.
You handle order processing, shipping logistics, and fulfillment tracking.
Your responses should be concise operational updates including:
- Order processing steps taken
- Fulfillment partner status
- Estimated timeline
- Any issues or flags to address
Keep responses under 150 words. Be precise and action-oriented.`
  }

  getTaskPrompt(task: Task): string {
    if (task.type === 'order_fulfill') {
      return `Process fulfillment for: ${task.title}. Walk through the steps: verify order details, prepare print files, submit to Printful, and confirm submission.`
    }
    if (task.type === 'order_track') {
      return `Generate a tracking update for: ${task.title}. Include current shipment status, estimated delivery, and any notes for the customer.`
    }
    return `Draft an order confirmation message for: ${task.title}. Include order summary, expected timeline, and a friendly thank-you note.`
  }

  async processWithAi(task: Task): Promise<void> {
    // Sending orders and tracking shipments runs on its own every few minutes; Aria checks right away
    if (task.type === 'order_fulfill' || task.type === 'order_track') {
      this.updateProgress(task.id, 20, 'Bestellingen controleren...')
      try {
        const r = await checkOrders()
        this.log(
          r.imported + r.sent + r.shipped + r.failed === 0
            ? 'Geen nieuwe bestellingen of verzendingen'
            : `Bestellingen: ${r.imported} nieuw, ${r.sent} naar Printful, ${r.shipped} verzonden, ${r.failed} fout`,
          r.failed ? 'warning' : 'info', task.id
        )
      } catch (err) {
        this.log(`Bestellingen controleren lukte niet: ${err instanceof Error ? err.message : err}`, 'warning', task.id)
      }
      this.updateProgress(task.id, 70, 'Bestellingen gecontroleerd')
    }

    // ── AI summary/confirmation ───────────────────────────
    this.updateProgress(task.id, 80, 'Generating summary...')
    const result = await askAi(this.getEffectiveSystemPrompt(), this.getTaskPrompt(task), { model: this.model })
    run('UPDATE tasks SET output_data = ? WHERE id = ?', JSON.stringify({ aiResponse: result }), task.id)
    const preview = result.length > 120 ? result.substring(0, 120) + '...' : result
    this.log(`AI: ${preview}`, 'info', task.id)

    this.updateProgress(task.id, 95, 'Finalizing...')
    await new Promise(r => setTimeout(r, 500))
  }

  generateTask(): { type: TaskType; title: string; description: string } {
    const types: TaskType[] = ['order_fulfill', 'order_track', 'order_confirm']
    const type = types[Math.floor(Math.random() * types.length)]
    const orderNum = this.orderNum()

    const titles: Record<string, string> = {
      order_fulfill: `Fulfill order ${orderNum}`,
      order_track: `Track shipment for order ${orderNum}`,
      order_confirm: `Send confirmation for order ${orderNum}`,
    }

    return {
      type,
      title: titles[type],
      description: `Processing order ${orderNum} through fulfillment pipeline`,
    }
  }

  getSimulationSteps(task: Task): SimulationStep[] {
    if (task.type === 'order_fulfill') {
      return [
        { message: 'Retrieving order details from Etsy...', type: 'info', progress: 10, durationMs: 1500 },
        { message: 'Validating shipping address...', type: 'thinking', progress: 25, durationMs: 1500 },
        { message: 'Preparing design files for print...', type: 'info', progress: 45, durationMs: 2000 },
        { message: 'Submitting to Printful for production...', type: 'info', progress: 70, durationMs: 2500 },
        { message: 'Order submitted to fulfillment partner!', type: 'success', progress: 100, durationMs: 1000 },
      ]
    }
    if (task.type === 'order_track') {
      return [
        { message: 'Checking fulfillment partner status...', type: 'info', progress: 20, durationMs: 1500 },
        { message: 'Retrieving tracking information...', type: 'info', progress: 50, durationMs: 2000 },
        { message: 'Updating order tracking in system...', type: 'info', progress: 80, durationMs: 1500 },
        { message: 'Tracking info updated', type: 'success', progress: 100, durationMs: 1000 },
      ]
    }
    return [
      { message: 'Generating order confirmation email...', type: 'thinking', progress: 30, durationMs: 2000 },
      { message: 'Including tracking details and ETA...', type: 'info', progress: 60, durationMs: 1500 },
      { message: 'Confirmation sent to customer', type: 'success', progress: 100, durationMs: 1000 },
    ]
  }
}
