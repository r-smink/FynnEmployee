import { NextRequest, NextResponse } from 'next/server'
import { all, get } from '@/lib/db'
import { seedShop } from '@/lib/db'
import { v4 as uuid } from 'uuid'

export const dynamic = 'force-dynamic'

export async function GET() {
  const shops = all('SELECT * FROM shops ORDER BY created_at')
  return NextResponse.json(shops)
}

export async function POST(request: NextRequest) {
  const { name, description } = await request.json()
  const id = uuid()
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  seedShop(id, name, slug, description || '')
  const shop = get('SELECT * FROM shops WHERE id = ?', id)
  return NextResponse.json(shop)
}
