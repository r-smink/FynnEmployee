import type { NextRequest } from 'next/server'

// Public origin of the app as the browser sees it. Behind a proxy (Render, Fly, Railway)
// request.url points at the internal address (e.g. http://0.0.0.0:10000), so prefer the
// forwarded headers.
export function getPublicOrigin(request: NextRequest): string {
  const host =
    request.headers.get('x-forwarded-host')?.split(',')[0].trim() ||
    request.headers.get('host') ||
    'localhost:3000'
  const isLocal = /^(localhost|127\.0\.0\.1|\[::1\])(:|$)/.test(host)
  const forwardedProto = request.headers.get('x-forwarded-proto')?.split(',')[0].trim()
  const protocol = isLocal ? 'http' : forwardedProto || 'https'
  return `${protocol}://${host}`
}

export function getEtsyRedirectUri(request: NextRequest): string {
  return `${getPublicOrigin(request)}/api/etsy/callback`
}
