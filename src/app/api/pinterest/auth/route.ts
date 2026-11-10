import { NextRequest, NextResponse } from 'next/server'
import { getPinterestAuthUrl } from '@/integrations/pinterest/client'
import { getPublicOrigin } from '@/lib/public-origin'

export const dynamic = 'force-dynamic'

// ?shopId=<shop> returns the Pinterest page where the owner allows the app; the callback returns to that shop
export async function GET(request: NextRequest) {
  const shopId = request.nextUrl.searchParams.get('shopId') || 'default'
  try {
    return NextResponse.json({ url: getPinterestAuthUrl(`${getPublicOrigin(request)}/api/pinterest/callback`, shopId) })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 400 })
  }
}
