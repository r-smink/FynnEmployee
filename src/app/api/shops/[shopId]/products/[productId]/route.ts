import { NextRequest, NextResponse } from 'next/server'
import { get, run } from '@/lib/db'
import { deleteDesign } from '@/lib/images'

export const dynamic = 'force-dynamic'

interface ProductRow { id: string; status: string; design_url: string | null }

// Review of Luna's designs: approve makes it a draft product, reject removes the image.
// Rejected rows stay (hidden) so they still count toward Luna's daily design limit.
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ shopId: string; productId: string }> }) {
  const { shopId, productId } = await params
  const { action } = await request.json()

  const product = get<ProductRow>('SELECT id, status, design_url FROM products WHERE id = ? AND shop_id = ?', productId, shopId)
  if (!product) return NextResponse.json({ error: 'Product niet gevonden' }, { status: 404 })
  if (product.status !== 'review') return NextResponse.json({ error: 'Dit ontwerp is al beoordeeld' }, { status: 409 })

  if (action === 'approve') {
    run("UPDATE products SET status = 'draft', updated_at = datetime('now') WHERE id = ?", productId)
  } else if (action === 'reject') {
    if (product.design_url) deleteDesign(product.design_url.split('/').pop()!)
    run("UPDATE products SET status = 'rejected', design_url = NULL, thumbnail_url = NULL, updated_at = datetime('now') WHERE id = ?", productId)
  } else {
    return NextResponse.json({ error: 'Onbekende actie' }, { status: 400 })
  }

  return NextResponse.json(get('SELECT * FROM products WHERE id = ?', productId))
}
