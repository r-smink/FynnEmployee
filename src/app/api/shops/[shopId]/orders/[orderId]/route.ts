import { NextRequest, NextResponse } from 'next/server'
import { get } from '@/lib/db'
import { checkOrders, confirmDraft, markHandled, retryOrder, type OrderRow } from '@/lib/orders'

export const dynamic = 'force-dynamic'

// confirm: confirm a Printful draft (Printful charges and starts printing)
// retry:   try again after an error, or send a manual order through the app after all
// handled: the owner did it in Printful and on Etsy; the app leaves it alone
export async function POST(request: NextRequest, { params }: { params: Promise<{ shopId: string; orderId: string }> }) {
  const { shopId, orderId } = await params
  const order = get<OrderRow>('SELECT * FROM orders WHERE id = ? AND shop_id = ?', orderId, shopId)
  if (!order) return NextResponse.json({ error: 'Bestelling niet gevonden' }, { status: 404 })

  const { action } = await request.json().catch(() => ({}))
  try {
    if (action === 'confirm') {
      await confirmDraft(order)
    } else if (action === 'retry') {
      retryOrder(order)
      await checkOrders()
    } else if (action === 'handled') {
      markHandled(order)
    } else {
      return NextResponse.json({ error: 'Onbekende actie' }, { status: 400 })
    }
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Mislukt' }, { status: 502 })
  }
  return NextResponse.json(get('SELECT * FROM orders WHERE id = ?', orderId))
}
