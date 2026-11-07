import { NextRequest, NextResponse } from 'next/server'
import { get } from '@/lib/db'
import { getPublicOrigin } from '@/lib/public-origin'
import { startPublish } from '@/lib/publish'

export const dynamic = 'force-dynamic'

// Try again to put an approved design on Printful and Etsy; continues after the last finished step
export async function POST(request: NextRequest, { params }: { params: Promise<{ shopId: string; productId: string }> }) {
  const { shopId, productId } = await params

  const product = get<{ status: string; design_url: string | null; publish_status: string | null }>(
    'SELECT status, design_url, publish_status FROM products WHERE id = ? AND shop_id = ?', productId, shopId
  )
  if (!product) return NextResponse.json({ error: 'Product niet gevonden' }, { status: 404 })
  if (product.status !== 'draft' || !product.design_url) {
    return NextResponse.json({ error: 'Alleen goedgekeurde ontwerpen kunnen naar Etsy' }, { status: 409 })
  }
  if (product.publish_status === 'etsy_draft' || product.publish_status === 'etsy_live') {
    return NextResponse.json({ error: 'Dit product staat al op Etsy' }, { status: 409 })
  }
  if (!startPublish(productId, getPublicOrigin(request))) {
    return NextResponse.json({ error: 'Dit product wordt al op Etsy gezet' }, { status: 409 })
  }
  return NextResponse.json({ ok: true })
}
