import { NextRequest, NextResponse } from 'next/server'
import { exchangeCodeForToken, getShop } from '@/integrations/etsy/client'
import { getSetting } from '@/lib/ai'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  if (error) {
    return NextResponse.redirect(new URL('/settings?etsy_error=' + encodeURIComponent(error), request.url))
  }

  if (!code || !state) {
    return NextResponse.redirect(new URL('/settings?etsy_error=missing_params', request.url))
  }

  // Verify state
  const savedState = getSetting('etsy_oauth_state')
  if (state !== savedState) {
    return NextResponse.redirect(new URL('/settings?etsy_error=invalid_state', request.url))
  }

  try {
    const host = request.headers.get('host') || 'localhost:3000'
    const protocol = host.startsWith('localhost') ? 'http' : 'https'
    const redirectUri = `${protocol}://${host}/api/etsy/callback`

    await exchangeCodeForToken(code, redirectUri)

    // Fetch and store shop info
    await getShop()

    return NextResponse.redirect(new URL('/settings?etsy_connected=true', request.url))
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Token exchange failed'
    return NextResponse.redirect(new URL('/settings?etsy_error=' + encodeURIComponent(msg), request.url))
  }
}
