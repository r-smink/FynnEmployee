import { NextRequest, NextResponse } from 'next/server'
import { createOrder, confirmOrder, getOrders, getOrder, isPrintfulConnected } from '@/integrations/printful/client'
import type { CreatePrintfulOrder } from '@/integrations/printful/client'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  if (!isPrintfulConnected()) {
    return NextResponse.json({ error: 'Printful not connected' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const orderId = searchParams.get('order_id')

    if (orderId) {
      const order = await getOrder(parseInt(orderId))
      return NextResponse.json(order)
    }

    const status = searchParams.get('status') || 'open'
    const limit = parseInt(searchParams.get('limit') || '25')
    const orders = await getOrders(status, limit)
    return NextResponse.json(orders)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch orders' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  if (!isPrintfulConnected()) {
    return NextResponse.json({ error: 'Printful not connected' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { confirm: shouldConfirm, ...orderData } = body as CreatePrintfulOrder & { confirm?: boolean }

    // Create draft order
    const order = await createOrder(orderData)

    // Auto-confirm if requested
    if (shouldConfirm && order.id) {
      const confirmed = await confirmOrder(order.id)
      return NextResponse.json(confirmed)
    }

    return NextResponse.json(order)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to create order' },
      { status: 500 }
    )
  }
}
