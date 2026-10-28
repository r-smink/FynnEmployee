import { NextRequest, NextResponse } from 'next/server'
import { run, get } from '@/lib/db'
import { emitAgentEvent } from '@/lib/events'

export const dynamic = 'force-dynamic'

// Printful sends webhook POSTs for order status changes
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, data } = body

    switch (type) {
      case 'package_shipped': {
        const { order, shipment } = data
        if (order?.external_id) {
          // Update our order record
          run(
            `UPDATE orders SET
              fulfillment_status = 'shipped',
              tracking_number = ?,
              status = 'fulfilled',
              updated_at = datetime('now')
            WHERE id = ? OR etsy_order_id = ?`,
            shipment?.tracking_number || null,
            order.external_id,
            order.external_id
          )

          emitAgentEvent({
            agentId: 'aria',
            type: 'activity',
            data: {
              message: `Order ${order.external_id} shipped! Tracking: ${shipment?.tracking_number || 'pending'}`,
              activityType: 'success',
            },
            timestamp: new Date().toISOString(),
          })
        }
        break
      }

      case 'order_updated': {
        const { order } = data
        if (order?.external_id) {
          const statusMap: Record<string, string> = {
            draft: 'pending',
            pending: 'processing',
            inprocess: 'processing',
            onhold: 'processing',
            partial: 'processing',
            fulfilled: 'fulfilled',
            canceled: 'cancelled',
            failed: 'cancelled',
          }

          run(
            `UPDATE orders SET
              fulfillment_status = ?,
              status = ?,
              updated_at = datetime('now')
            WHERE id = ? OR etsy_order_id = ?`,
            order.status,
            statusMap[order.status] || 'processing',
            order.external_id,
            order.external_id
          )

          emitAgentEvent({
            agentId: 'aria',
            type: 'activity',
            data: {
              message: `Order ${order.external_id} status: ${order.status}`,
              activityType: 'info',
            },
            timestamp: new Date().toISOString(),
          })
        }
        break
      }

      case 'order_failed': {
        const { order, reason } = data
        emitAgentEvent({
          agentId: 'aria',
          type: 'activity',
          data: {
            message: `Order ${order?.external_id || 'unknown'} failed: ${reason || 'unknown reason'}`,
            activityType: 'error',
          },
          timestamp: new Date().toISOString(),
        })
        break
      }
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Printful webhook error:', err)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}
