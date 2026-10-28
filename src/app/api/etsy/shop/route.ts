import { NextResponse } from 'next/server'
import { getConnectionInfo, getShop, isEtsyConnected } from '@/integrations/etsy/client'

export const dynamic = 'force-dynamic'

export async function GET() {
  const info = getConnectionInfo()

  if (!info.connected) {
    return NextResponse.json({ connected: false })
  }

  try {
    const shop = await getShop()
    return NextResponse.json({
      connected: true,
      shop: {
        id: shop.shop_id,
        name: shop.shop_name,
        title: shop.title,
        url: shop.url,
        activeListings: shop.listing_active_count,
        favorites: shop.num_favorers,
        sales: shop.transaction_sold_count,
        icon: shop.icon_url_fullxfull,
      },
    })
  } catch (err) {
    return NextResponse.json({
      connected: false,
      error: err instanceof Error ? err.message : 'Failed to fetch shop',
    })
  }
}
