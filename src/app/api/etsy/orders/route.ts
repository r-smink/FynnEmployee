import { NextRequest, NextResponse } from 'next/server'
import { getReceipts, isEtsyConnected } from '@/integrations/etsy/client'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  if (!isEtsyConnected()) {
    return NextResponse.json({ error: 'Etsy not connected' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const status = (searchParams.get('status') as 'open' | 'completed' | 'all') || 'open'
    const limit = parseInt(searchParams.get('limit') || '25')
    const offset = parseInt(searchParams.get('offset') || '0')

    const data = await getReceipts(status, limit, offset)

    // Transform to our order format
    const orders = data.results.map(receipt => ({
      id: `ETY-${receipt.receipt_id}`,
      etsy_order_id: String(receipt.order_id),
      etsy_receipt_id: String(receipt.receipt_id),
      customer_name: receipt.name,
      customer_email: receipt.buyer_email,
      total_price: receipt.grandtotal.amount / receipt.grandtotal.divisor,
      status: receipt.is_shipped ? 'fulfilled' : 'new',
      items: receipt.transactions.map(t => ({
        title: t.title,
        quantity: t.quantity,
        price: t.price.amount / t.price.divisor,
        listing_id: t.listing_id,
      })),
      created_at: new Date(receipt.create_timestamp * 1000).toISOString(),
    }))

    return NextResponse.json({ count: data.count, orders })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch orders' },
      { status: 500 }
    )
  }
}
