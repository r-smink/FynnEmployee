import { NextRequest, NextResponse } from 'next/server'
import { getCatalogProducts, getCatalogProduct, isPrintfulConnected } from '@/integrations/printful/client'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  if (!isPrintfulConnected()) {
    return NextResponse.json({ error: 'Printful not connected' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const productId = searchParams.get('product_id')

    if (productId) {
      const data = await getCatalogProduct(parseInt(productId))
      return NextResponse.json(data)
    }

    const products = await getCatalogProducts()
    return NextResponse.json(products)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch catalog' },
      { status: 500 }
    )
  }
}
