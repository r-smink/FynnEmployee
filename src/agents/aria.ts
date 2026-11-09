import { BaseAgent } from './base-agent'
import { isAiEnabled } from '@/lib/ai'
import { checkOrders, msSinceLastCheck, openOrderCount, retryOrder, type OrderRow } from '@/lib/orders'
import { get } from '@/lib/db'
import { isEtsyConnected } from '@/integrations/etsy/client'
import { isPrintfulConnected } from '@/integrations/printful/client'
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

  // Live: only while there are real orders to send or follow, and not more often than every 2 minutes
  hasRealWork(): boolean {
    return isEtsyConnected() && isPrintfulConnected() && openOrderCount(this.shopId) > 0 && msSinceLastCheck() > 2 * 60_000
  }

  // Live work is the real check: send waiting orders to Printful and pass shipments on to Etsy. No AI text.
  async processWithAi(task: Task): Promise<void> {
    if (task.type === 'owner_task') return super.processWithAi(task)
    if (task.type === 'fix_order') return this.fixOrder(task)
    this.updateProgress(task.id, 20, 'Bestellingen controleren...')
    const r = await checkOrders()
    this.log(
      r.sent + r.shipped + r.failed === 0
        ? 'Nog niets veranderd bij Printful'
        : `${r.sent} naar Printful gestuurd, ${r.shipped} verzonden${r.failed ? `, ${r.failed} met een fout (zie Bestellingen > Fouten)` : ''}`,
      r.failed ? 'warning' : 'info', task.id
    )
    this.updateProgress(task.id, 95, 'Bestellingen gecontroleerd')
  }

  generateTask(): { type: TaskType; title: string; description: string } {
    if (isAiEnabled()) {
      const open = openOrderCount(this.shopId)
      return {
        type: 'order_track',
        title: `${open} open bestelling${open === 1 ? '' : 'en'} bijwerken`,
        description: 'Wachtende bestellingen naar Printful sturen en verzendingen doorgeven aan Etsy',
      }
    }
    // Demo mode: made-up orders, clearly shown as demo
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

  // Sends an order that failed to Printful again; the task fails with Printful's reason when it still doesn't work
  private async fixOrder(task: Task): Promise<void> {
    const { orderId } = JSON.parse(task.input_data || '{}') as { orderId?: string }
    const find = () => get<OrderRow>('SELECT * FROM orders WHERE id = ? AND shop_id = ?', orderId, this.shopId)
    const order = find()
    if (!order) throw new Error('Deze bestelling bestaat niet meer')
    if (!order.fulfill_error) {
      this.log(`Bestelling ${order.etsy_order_id} heeft geen fout meer`, 'info', task.id)
      return
    }

    this.log(`Probeert bestelling ${order.etsy_order_id} opnieuw naar Printful te sturen...`, 'thinking', task.id)
    this.updateProgress(task.id, 30, 'Opnieuw naar Printful...')
    retryOrder(order, false)
    await checkOrders()
    // A check that was already running may have started before the retry; then one more
    let after = find()
    if (after && !after.fulfill_error && !after.fulfillment_id && after.status === 'new') {
      await checkOrders()
      after = find()
    }
    if (after?.fulfill_error) throw new Error(after.fulfill_error)
    this.log(`Bestelling ${order.etsy_order_id} is weer op weg`, 'success', task.id)
    this.updateProgress(task.id, 95, 'Opgelost')
  }
}
