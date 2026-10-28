import { NextResponse } from 'next/server'
import { all } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  const products = all('SELECT * FROM products ORDER BY created_at DESC')
  return NextResponse.json(products)
}
