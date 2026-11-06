import { NextRequest, NextResponse } from 'next/server'
import { getOAuthUrl } from '@/integrations/etsy/client'
import { getEtsyRedirectUri } from '@/lib/public-origin'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const redirectUri = getEtsyRedirectUri(request)

    const { url } = getOAuthUrl(redirectUri)
    return NextResponse.json({ url, redirectUri })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to generate OAuth URL' },
      { status: 400 }
    )
  }
}
