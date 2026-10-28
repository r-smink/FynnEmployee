import { NextRequest, NextResponse } from 'next/server'
import { getListings, createListing, isEtsyConnected } from '@/integrations/etsy/client'
import type { CreateListingData } from '@/integrations/etsy/client'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  if (!isEtsyConnected()) {
    return NextResponse.json({ error: 'Etsy not connected' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const status = (searchParams.get('status') as 'active' | 'inactive' | 'draft') || 'active'
    const limit = parseInt(searchParams.get('limit') || '25')
    const offset = parseInt(searchParams.get('offset') || '0')

    const data = await getListings(status, limit, offset)
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch listings' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  if (!isEtsyConnected()) {
    return NextResponse.json({ error: 'Etsy not connected' }, { status: 401 })
  }

  try {
    const body = await request.json() as CreateListingData
    const listing = await createListing(body)
    return NextResponse.json(listing)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to create listing' },
      { status: 500 }
    )
  }
}
