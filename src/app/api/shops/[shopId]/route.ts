import { NextRequest, NextResponse } from 'next/server'
import { get, run } from '@/lib/db'
import { getShopSetting, setShopSetting, SHOP_PROMPT_KEY } from '@/lib/shop-settings'

export const dynamic = 'force-dynamic'

const PROMPT_MAX = 4000

export async function GET(_req: NextRequest, { params }: { params: Promise<{ shopId: string }> }) {
  const { shopId } = await params
  const shop = get('SELECT * FROM shops WHERE id = ?', shopId)
  if (!shop) return NextResponse.json({ error: 'Shop not found' }, { status: 404 })
  return NextResponse.json({ ...shop, shop_prompt: getShopSetting(shopId, SHOP_PROMPT_KEY) || '' })
}

// Update shop name, description and the shop-wide agent prompt
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ shopId: string }> }) {
  const { shopId } = await params
  if (!get('SELECT id FROM shops WHERE id = ?', shopId)) return NextResponse.json({ error: 'Winkel niet gevonden' }, { status: 404 })
  const body = await request.json().catch(() => ({}))

  if (body.name !== undefined) {
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    if (!name || name.length > 80) return NextResponse.json({ error: 'Geef de winkel een naam van maximaal 80 tekens' }, { status: 400 })
    run(`UPDATE shops SET name = ?, updated_at = datetime('now') WHERE id = ?`, name, shopId)
  }
  if (typeof body.description === 'string') {
    run(`UPDATE shops SET description = ?, updated_at = datetime('now') WHERE id = ?`, body.description.trim().slice(0, 500), shopId)
  }
  if (typeof body.shop_prompt === 'string') {
    if (body.shop_prompt.length > PROMPT_MAX) return NextResponse.json({ error: `De shop-prompt mag maximaal ${PROMPT_MAX} tekens zijn` }, { status: 400 })
    setShopSetting(shopId, SHOP_PROMPT_KEY, body.shop_prompt.trim())
  }

  const shop = get('SELECT * FROM shops WHERE id = ?', shopId)
  return NextResponse.json({ ...shop, shop_prompt: getShopSetting(shopId, SHOP_PROMPT_KEY) || '' })
}
