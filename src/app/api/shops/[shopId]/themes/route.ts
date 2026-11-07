import { NextRequest, NextResponse } from 'next/server'
import { getThemes, saveThemes } from '@/lib/theme-store'
import { DEFAULT_THEMES } from '@/lib/themes'

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ shopId: string }> }) {
  const { shopId } = await params
  return NextResponse.json({ themes: getThemes(shopId), defaults: DEFAULT_THEMES })
}

// Replaces the shop's whole theme list
export async function PUT(request: NextRequest, { params }: { params: Promise<{ shopId: string }> }) {
  const { shopId } = await params
  const body = await request.json().catch(() => ({}))
  try {
    return NextResponse.json({ themes: saveThemes(shopId, body.themes) })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Opslaan mislukt' }, { status: 400 })
  }
}
