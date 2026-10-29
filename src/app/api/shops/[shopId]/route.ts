import { NextRequest, NextResponse } from 'next/server'
import { get } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ shopId: string }> }) {
  const { shopId } = await params
  const shop = get('SELECT * FROM shops WHERE id = ?', shopId)
  if (!shop) return NextResponse.json({ error: 'Shop not found' }, { status: 404 })
  return NextResponse.json(shop)
}
