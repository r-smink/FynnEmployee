import fs from 'fs'
import path from 'path'
import { NextRequest, NextResponse } from 'next/server'
import { DESIGN_FILE, designsDir } from '@/lib/images'

export const dynamic = 'force-dynamic'

const TYPES: Record<string, string> = { svg: 'image/svg+xml', png: 'image/png', jpg: 'image/jpeg', webp: 'image/webp' }

export async function GET(_req: NextRequest, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params
  if (!DESIGN_FILE.test(file)) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  let data: Buffer
  try {
    data = fs.readFileSync(path.join(designsDir(), file))
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return new NextResponse(new Uint8Array(data), {
    headers: {
      'Content-Type': TYPES[file.split('.').pop()!],
      // An SVG opened directly must not be able to run anything
      'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; img-src data:",
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'private, max-age=86400',
    },
  })
}
