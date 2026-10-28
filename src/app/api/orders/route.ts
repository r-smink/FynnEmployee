import { NextResponse } from 'next/server'
import { all } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  const orders = all('SELECT * FROM orders ORDER BY created_at DESC')
  return NextResponse.json(orders)
}
