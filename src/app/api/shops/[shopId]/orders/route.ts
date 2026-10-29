import { NextRequest, NextResponse } from 'next/server'
import { all } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ shopId: string }> }) {
  const { shopId } = await params
  const orders = all('SELECT * FROM orders WHERE shop_id = ? ORDER BY created_at DESC', shopId)
  return NextResponse.json(orders)
}
