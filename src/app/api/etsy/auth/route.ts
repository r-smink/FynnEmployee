import { NextRequest, NextResponse } from 'next/server'
import { getOAuthUrl } from '@/integrations/etsy/client'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const host = request.headers.get('host') || 'localhost:3000'
    const protocol = host.startsWith('localhost') ? 'http' : 'https'
    const redirectUri = `${protocol}://${host}/api/etsy/callback`

    const { url } = getOAuthUrl(redirectUri)
    return NextResponse.json({ url, redirectUri })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to generate OAuth URL' },
      { status: 400 }
    )
  }
}
