import { NextResponse } from 'next/server'
import { getConnectionInfo, getStoreInfo, isPrintfulConnected } from '@/integrations/printful/client'

export const dynamic = 'force-dynamic'

export async function GET() {
  const info = getConnectionInfo()

  if (!info.connected) {
    return NextResponse.json({ connected: false })
  }

  try {
    const store = await getStoreInfo()
    return NextResponse.json({
      connected: true,
      store: {
        id: store.id,
        name: store.name,
        type: store.type,
        currency: store.currency,
      },
    })
  } catch (err) {
    return NextResponse.json({
      connected: true,
      storeName: info.storeName,
      error: err instanceof Error ? err.message : 'Failed to fetch store info',
    })
  }
}
