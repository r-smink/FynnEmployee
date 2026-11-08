import { NextRequest, NextResponse } from 'next/server'
import { all } from '@/lib/db'
import { checkOrders } from '@/lib/orders'

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ shopId: string }> }) {
  const { shopId } = await params
  const orders = all('SELECT * FROM orders WHERE shop_id = ? ORDER BY created_at DESC', shopId)
  return NextResponse.json(orders)
}

// "Nu controleren": fetch new Etsy orders, send them to Printful and follow shipments right away
export async function POST() {
  try {
    return NextResponse.json(await checkOrders())
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Controleren mislukt' }, { status: 502 })
  }
}
