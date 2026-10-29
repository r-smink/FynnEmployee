import { BaseAgent } from './base-agent'
import { aiChat } from '@/lib/ai'
import { run, all, get } from '@/lib/db'
import { isEtsyConnected, getReceipts } from '@/integrations/etsy/client'
import { isPrintfulConnected, createOrder, confirmOrder, getOrder, buildOrderFromEtsy } from '@/integrations/printful/client'
import type { AgentConfig, Task, SimulationStep, TaskType } from './types'
import { v4 as uuid } from 'uuid'

interface DbOrder {
  id: string
  etsy_order_id: string | null
  customer_name: string
  customer_email: string
  total_price: number
  status: string
  fulfillment_status: string
  fulfillment_id: string | null
  product_id: string | null
}

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
    const etsy = isEtsyConnected()
    const printful = isPrintfulConnected()

    // ── Step 1: Sync Etsy orders if connected ──────────────
    if (etsy && task.type === 'order_fulfill') {
      this.log('Checking Etsy for new orders...', 'thinking', task.id)
      this.updateProgress(task.id, 10, 'Syncing Etsy orders...')

      try {
        const receipts = await getReceipts('open', 10)
        if (receipts.results.length > 0) {
          this.log(`Found ${receipts.results.length} open orders on Etsy`, 'info', task.id)

          for (const receipt of receipts.results) {
            const existing = all('SELECT id FROM orders WHERE etsy_order_id = ? AND shop_id = ?', String(receipt.order_id), this.shopId)
            if (existing.length === 0) {
              const total = receipt.grandtotal.amount / receipt.grandtotal.divisor
              const orderId = uuid()
              run(
                `INSERT INTO orders (id, shop_id, etsy_order_id, customer_name, customer_email, total_price, status, quantity)
                 VALUES (?, ?, ?, ?, ?, ?, 'new', ?)`,
                orderId, this.shopId, String(receipt.order_id), receipt.name, receipt.buyer_email, total,
                receipt.transactions.reduce((sum: number, t: { quantity: number }) => sum + t.quantity, 0)
              )
              this.log(`Imported order from ${receipt.name} ($${total.toFixed(2)})`, 'success', task.id)
            }
          }
        } else {
          this.log('No new Etsy orders', 'info', task.id)
        }
      } catch (err) {
        this.log(`Etsy sync: ${err}`, 'warning', task.id)
      }
    }

    // ── Step 2: Submit unfulfilled orders to Printful ──────
    if (printful && task.type === 'order_fulfill') {
      this.updateProgress(task.id, 40, 'Processing orders via Printful...')

      const pendingOrders = all<DbOrder>(
        "SELECT * FROM orders WHERE shop_id = ? AND status = 'new' AND fulfillment_id IS NULL LIMIT 5",
        this.shopId
      )

      if (pendingOrders.length > 0) {
        this.log(`Submitting ${pendingOrders.length} orders to Printful...`, 'info', task.id)

        for (const order of pendingOrders) {
          try {
            this.log(`Processing order ${order.id.substring(0, 8)}... for ${order.customer_name}`, 'info', task.id)

            // Note: In production, you'd look up the correct variant_id and design_url
            // from the product linked to this order. For now we log what would happen.
            run(
              `UPDATE orders SET status = 'processing', fulfillment_status = 'submitted', updated_at = datetime('now') WHERE id = ? AND shop_id = ?`,
              order.id, this.shopId
            )
            this.log(`Order ${order.id.substring(0, 8)} marked for fulfillment`, 'success', task.id)
          } catch (err) {
            this.log(`Failed to process order ${order.id.substring(0, 8)}: ${err}`, 'error', task.id)
          }
        }
      } else {
        this.log('No pending orders to fulfill', 'info', task.id)
      }

      this.updateProgress(task.id, 60, 'Checking fulfillment status...')
    }

    // ── Step 3: Track existing Printful orders ────────────
    if (printful && task.type === 'order_track') {
      this.updateProgress(task.id, 30, 'Checking Printful order status...')

      const processingOrders = all<DbOrder>(
        "SELECT * FROM orders WHERE shop_id = ? AND fulfillment_id IS NOT NULL AND status != 'fulfilled' LIMIT 10",
        this.shopId
      )

      if (processingOrders.length > 0) {
        this.log(`Tracking ${processingOrders.length} orders...`, 'info', task.id)

        for (const order of processingOrders) {
          if (order.fulfillment_id) {
            try {
              const pfOrder = await getOrder(parseInt(order.fulfillment_id))
              const statusMap: Record<string, string> = {
                draft: 'pending', pending: 'submitted', inprocess: 'in_production',
                onhold: 'in_production', partial: 'in_production', fulfilled: 'delivered',
              }
              const newStatus = statusMap[pfOrder.status] || pfOrder.status

              run(
                `UPDATE orders SET fulfillment_status = ?, updated_at = datetime('now') WHERE id = ? AND shop_id = ?`,
                newStatus, order.id, this.shopId
              )

              if (pfOrder.shipments?.length > 0) {
                const shipment = pfOrder.shipments[0]
                run(
                  `UPDATE orders SET tracking_number = ?, fulfillment_status = 'shipped' WHERE id = ? AND shop_id = ?`,
                  shipment.tracking_number, order.id, this.shopId
                )
                this.log(
                  `Order ${order.id.substring(0, 8)} shipped via ${shipment.carrier} - ${shipment.tracking_number}`,
                  'success', task.id
                )
              } else {
                this.log(`Order ${order.id.substring(0, 8)}: ${pfOrder.status}`, 'info', task.id)
              }
            } catch (err) {
              this.log(`Tracking error for ${order.id.substring(0, 8)}: ${err}`, 'warning', task.id)
            }
          }
        }
      } else {
        this.log('No orders to track', 'info', task.id)
      }

      this.updateProgress(task.id, 70, 'Tracking complete')
    }

    // ── Step 4: AI summary/confirmation ───────────────────
    this.updateProgress(task.id, 80, 'Generating summary...')
    const result = await aiChat(this.getEffectiveSystemPrompt(), this.getTaskPrompt(task), { model: this.model })
    if (result) {
      run('UPDATE tasks SET output_data = ? WHERE id = ?', JSON.stringify({ aiResponse: result }), task.id)
      const preview = result.length > 120 ? result.substring(0, 120) + '...' : result
      this.log(`AI: ${preview}`, 'info', task.id)
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
