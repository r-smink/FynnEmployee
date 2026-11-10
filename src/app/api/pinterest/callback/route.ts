import { NextRequest, NextResponse } from 'next/server'
import { checkPinterestState, exchangePinterestCode } from '@/integrations/pinterest/client'
import { getPublicOrigin } from '@/lib/public-origin'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams
  const origin = getPublicOrigin(request)
  const shopId = checkPinterestState(params.get('state') || '')
  const back = (query: string) => NextResponse.redirect(new URL(`/shops/${shopId || 'default'}/marketing?${query}`, origin))

  if (params.get('error')) return back('pinterest_error=' + encodeURIComponent(params.get('error')!))
  const code = params.get('code')
  if (!code || !shopId) return back('pinterest_error=' + encodeURIComponent('Ongeldige terugkeer van Pinterest. Probeer opnieuw te koppelen.'))
  try {
    await exchangePinterestCode(code, `${origin}/api/pinterest/callback`)
    return back('pinterest_connected=1')
  } catch (err) {
    return back('pinterest_error=' + encodeURIComponent(err instanceof Error ? err.message : String(err)))
  }
}
