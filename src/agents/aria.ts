import { BaseAgent } from './base-agent'
import { aiChat } from '@/lib/ai'
import { run, all } from '@/lib/db'
import { isEtsyConnected, getReceipts } from '@/integrations/etsy/client'
import type { Task, SimulationStep, TaskType } from './types'
import { v4 as uuid } from 'uuid'

export class AriaAgent extends BaseAgent {
  constructor() {
    super('aria', 'Aria')
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
    // If Etsy is connected and this is a sync task, pull real orders
    if (isEtsyConnected() && task.type === 'order_fulfill') {
      this.log('Checking Etsy for new orders...', 'thinking', task.id)
      this.updateProgress(task.id, 20, 'Syncing Etsy orders...')

      try {
        const receipts = await getReceipts('open', 10)
        if (receipts.results.length > 0) {
          this.log(`Found ${receipts.results.length} open orders on Etsy`, 'info', task.id)
          this.updateProgress(task.id, 40, 'Processing orders...')

          for (const receipt of receipts.results) {
            // Check if we already have this order
            const existing = all('SELECT id FROM orders WHERE etsy_order_id = ?', String(receipt.order_id))
            if (existing.length === 0) {
              const total = receipt.grandtotal.amount / receipt.grandtotal.divisor
              const orderId = uuid()
              run(
                `INSERT INTO orders (id, etsy_order_id, customer_name, customer_email, total_price, status, quantity)
                 VALUES (?, ?, ?, ?, ?, 'new', ?)`,
                orderId,
                String(receipt.order_id),
                receipt.name,
                receipt.buyer_email,
                total,
                receipt.transactions.reduce((sum, t) => sum + t.quantity, 0)
              )
              this.log(`Imported order from ${receipt.name} ($${total.toFixed(2)})`, 'success', task.id)
            }
          }
          this.updateProgress(task.id, 70, 'Orders synced')
        } else {
          this.log('No new open orders found', 'info', task.id)
        }
      } catch (err) {
        this.log(`Etsy sync error: ${err}`, 'warning', task.id)
      }
    }

    // Now use AI for the actual task work
    this.log('Consulting AI for fulfillment strategy...', 'thinking', task.id)
    this.updateProgress(task.id, 80, 'AI processing...')

    const result = await aiChat(this.getSystemPrompt(), this.getTaskPrompt(task))
    if (result) {
      run('UPDATE tasks SET output_data = ? WHERE id = ?', JSON.stringify({ aiResponse: result }), task.id)
      const preview = result.length > 120 ? result.substring(0, 120) + '...' : result
      this.log(`AI result: ${preview}`, 'info', task.id)
    }

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
