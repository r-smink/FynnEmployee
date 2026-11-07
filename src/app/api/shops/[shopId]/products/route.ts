import { NextRequest, NextResponse } from 'next/server'
import { all, run } from '@/lib/db'
import { isPublishing } from '@/lib/publish'

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ shopId: string }> }) {
  const { shopId } = await params
  // A publish that was running when the app restarted will never finish; offer a retry instead
  for (const { id } of all<{ id: string }>("SELECT id FROM products WHERE shop_id = ? AND publish_status = 'publishing'", shopId)) {
    if (!isPublishing(id)) {
      run("UPDATE products SET publish_status = 'failed', publish_step = NULL, publish_error = 'Onderbroken doordat de app opnieuw is gestart' WHERE id = ?", id)
    }
  }
  const products = all('SELECT * FROM products WHERE shop_id = ? ORDER BY created_at DESC', shopId)
  return NextResponse.json(products)
}
