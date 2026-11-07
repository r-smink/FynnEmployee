import fs from 'fs'
import path from 'path'
import { NextRequest, NextResponse } from 'next/server'
import { designsDir } from '@/lib/images'
import { verifyFileSignature } from '@/lib/print-files'

export const dynamic = 'force-dynamic'

const TYPES: Record<string, string> = { svg: 'image/svg+xml', png: 'image/png', jpg: 'image/jpeg', webp: 'image/webp' }

// Design and print files for Printful. Outside the password (see proxy.ts), so every link carries a signature.
export async function GET(request: NextRequest, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params
  if (!verifyFileSignature(file, request.nextUrl.searchParams.get('sig'))) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  let data: Buffer
  try {
    data = fs.readFileSync(path.join(designsDir(), file))
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return new NextResponse(new Uint8Array(data), {
    headers: {
      'Content-Type': TYPES[file.split('.').pop()!],
      'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; img-src data:",
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'private, max-age=3600',
    },
  })
}
