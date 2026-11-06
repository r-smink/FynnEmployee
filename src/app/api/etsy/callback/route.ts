import { NextRequest, NextResponse } from 'next/server'
import { exchangeCodeForToken, getShop } from '@/integrations/etsy/client'
import { getSetting } from '@/lib/ai'
import { getPublicOrigin, getEtsyRedirectUri } from '@/lib/public-origin'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  // Redirect against the public origin; request.url is the internal address behind a proxy
  const origin = getPublicOrigin(request)
  const back = (query: string) => NextResponse.redirect(new URL('/settings?' + query, origin))

  if (error) {
    return back('etsy_error=' + encodeURIComponent(error))
  }

  if (!code || !state) {
    return back('etsy_error=missing_params')
  }

  // Verify state
  const savedState = getSetting('etsy_oauth_state')
  if (state !== savedState) {
    return back('etsy_error=invalid_state')
  }

  try {
    await exchangeCodeForToken(code, getEtsyRedirectUri(request))

    // Fetch and store shop info
    await getShop()

    return back('etsy_connected=true')
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Token exchange failed'
    return back('etsy_error=' + encodeURIComponent(msg))
  }
}
