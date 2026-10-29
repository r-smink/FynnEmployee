import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Basic auth in front of the whole app. Set APP_PASSWORD (and optionally APP_USER) in production.
// Without APP_PASSWORD the app is open in development and locked in production.

function safeEqual(a: string, b: string): boolean {
  let diff = a.length ^ b.length
  for (let i = 0; i < Math.max(a.length, b.length); i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0)
  return diff === 0
}

export function proxy(request: NextRequest) {
  const password = process.env.APP_PASSWORD
  if (!password) {
    if (process.env.NODE_ENV !== 'production') return NextResponse.next()
    return new NextResponse('APP_PASSWORD is niet ingesteld', { status: 503 })
  }

  const header = request.headers.get('authorization') || ''
  if (header.startsWith('Basic ')) {
    let decoded = ''
    try { decoded = atob(header.slice(6)) } catch { /* malformed header -> 401 */ }
    const sep = decoded.indexOf(':')
    const user = decoded.slice(0, sep)
    const pass = decoded.slice(sep + 1)
    if (sep >= 0 && safeEqual(user, process.env.APP_USER || 'admin') && safeEqual(pass, password)) {
      return NextResponse.next()
    }
  }

  return new NextResponse('Inloggen vereist', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="FynnEmployee", charset="UTF-8"' },
  })
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
