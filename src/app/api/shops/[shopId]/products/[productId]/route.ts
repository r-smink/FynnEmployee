import { NextRequest, NextResponse } from 'next/server'
import { get, run } from '@/lib/db'
import { deleteDesign } from '@/lib/images'
import { getPublicOrigin } from '@/lib/public-origin'
import { startPublish, isPublishing } from '@/lib/publish'
import { deletePrintFiles } from '@/lib/print-files'
import { isEtsyConnected, deleteListing } from '@/integrations/etsy/client'
import { PRODUCT_TYPES } from '@/lib/product-specs'

export const dynamic = 'force-dynamic'

interface ProductRow { id: string; status: string; design_url: string | null }

type Params = { params: Promise<{ shopId: string; productId: string }> }

// Everything about one design: the product, and how Luna made it (her task, brief, model and cost)
export async function GET(_req: NextRequest, { params }: Params) {
  const { shopId, productId } = await params
  const product = get('SELECT * FROM products WHERE id = ? AND shop_id = ?', productId, shopId)
  if (!product) return NextResponse.json({ error: 'Product niet gevonden' }, { status: 404 })

  const task = get<{ title: string; description: string | null; output_data: string | null; created_at: string }>(
    `SELECT title, description, output_data, created_at FROM tasks
     WHERE shop_id = ? AND type = 'design_generate' AND output_data LIKE ? ORDER BY created_at DESC LIMIT 1`,
    shopId, `%"productId":"${productId}"%`
  )
  let output: { brief?: { prompt?: string; concept?: string }; model?: string; cost?: number | null } = {}
  try { output = JSON.parse(task?.output_data || '{}') } catch { /* no details */ }

  return NextResponse.json({
    product,
    origin: task ? {
      task: task.title,
      assignment: task.description,
      prompt: output.brief?.prompt ?? null,
      model: output.model ?? null,
      cost: output.cost ?? null,
    } : null,
  })
}

// Review of Luna's designs:
// - update:  change title, description, product type, price or tags before deciding
// - approve: makes it a product and starts putting it on Printful and Etsy (see lib/publish.ts)
// - reject:  removes the image. Rejected rows stay (hidden) so they still count toward Luna's daily limit.
export async function PATCH(request: NextRequest, { params }: Params) {
  const { shopId, productId } = await params
  const body = await request.json()
  const { action } = body

  const product = get<ProductRow>('SELECT id, status, design_url FROM products WHERE id = ? AND shop_id = ?', productId, shopId)
  if (!product) return NextResponse.json({ error: 'Product niet gevonden' }, { status: 404 })
  if (product.status !== 'review') return NextResponse.json({ error: 'Dit ontwerp is al beoordeeld' }, { status: 409 })

  if (action === 'update') {
    const fields = parseEdit(body)
    if (typeof fields === 'string') return NextResponse.json({ error: fields }, { status: 400 })
    run(
      `UPDATE products SET title = ?, description = ?, category = ?, price = ?, tags = ?, updated_at = datetime('now') WHERE id = ?`,
      fields.title, fields.description, fields.category, fields.price, JSON.stringify(fields.tags), productId
    )
  } else if (action === 'approve') {
    run("UPDATE products SET status = 'draft', updated_at = datetime('now') WHERE id = ?", productId)
    startPublish(productId, getPublicOrigin(request))
  } else if (action === 'reject') {
    if (product.design_url) deleteDesign(product.design_url.split('/').pop()!)
    run("UPDATE products SET status = 'rejected', design_url = NULL, thumbnail_url = NULL, updated_at = datetime('now') WHERE id = ?", productId)
  } else {
    return NextResponse.json({ error: 'Onbekende actie' }, { status: 400 })
  }

  return NextResponse.json(get('SELECT * FROM products WHERE id = ?', productId))
}

// Deletes an approved product: its Etsy listing (draft or live) and its files.
// The row stays (hidden, status 'deleted') because open Etsy orders still need its Printful variants and print files,
// and it keeps counting toward Luna's daily limit.
export async function DELETE(_req: NextRequest, { params }: Params) {
  const { shopId, productId } = await params
  const product = get<ProductRow & { title: string; etsy_listing_id: string | null }>(
    'SELECT id, title, status, design_url, etsy_listing_id FROM products WHERE id = ? AND shop_id = ?', productId, shopId
  )
  if (!product || product.status === 'deleted') return NextResponse.json({ error: 'Product niet gevonden' }, { status: 404 })
  if (product.status === 'review') return NextResponse.json({ error: 'Keur dit ontwerp af in plaats van het te verwijderen' }, { status: 409 })
  if (isPublishing(productId)) {
    return NextResponse.json({ error: 'Dit product wordt nu op Etsy gezet. Wacht tot dat klaar is en verwijder het dan.' }, { status: 409 })
  }

  if (product.etsy_listing_id) {
    if (!isEtsyConnected()) {
      return NextResponse.json({ error: 'Etsy is niet gekoppeld, dus de listing kan niet worden verwijderd. Koppel Etsy en probeer opnieuw.' }, { status: 409 })
    }
    try {
      await deleteListing(Number(product.etsy_listing_id))
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      return NextResponse.json({ error: `Verwijderen op Etsy mislukte: ${msg}` }, { status: 502 })
    }
  }

  if (product.design_url) deleteDesign(product.design_url.split('/').pop()!)
  deletePrintFiles(productId)
  run(
    `UPDATE products SET status = 'deleted', publish_status = NULL, publish_step = NULL, publish_error = NULL,
      design_url = NULL, thumbnail_url = NULL, updated_at = datetime('now') WHERE id = ?`,
    productId
  )
  return NextResponse.json({ ok: true })
}

// The same limits Etsy uses, so what is saved here can be published as is. Returns an error message or the fields.
function parseEdit(body: Record<string, unknown>) {
  const title = typeof body.title === 'string' ? body.title.replace(/\s+/g, ' ').trim() : ''
  if (!title) return 'Geef het ontwerp een titel'
  if (title.length > 140) return 'De titel mag maximaal 140 tekens zijn'
  const description = typeof body.description === 'string' ? body.description.trim() : ''
  const category = typeof body.category === 'string' ? body.category : ''
  if (!PRODUCT_TYPES.includes(category)) return `Kies een producttype: ${PRODUCT_TYPES.join(', ')}`
  const price = Number(body.price)
  if (!Number.isFinite(price) || price <= 0 || price > 10000) return 'Vul een prijs in tussen € 0,01 en € 10.000'
  if (!Array.isArray(body.tags)) return 'Tags moeten een lijst zijn'
  const tags = [...new Set(body.tags.map(t => String(t).replace(/\s+/g, ' ').trim()).filter(Boolean))]
  if (tags.length > 13) return 'Etsy staat maximaal 13 tags toe'
  const long = tags.find(t => t.length > 20)
  if (long) return `Tag "${long}" is langer dan 20 tekens`
  return { title, description, category, price: Math.round(price * 100) / 100, tags }
}
