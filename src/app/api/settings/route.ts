import { NextRequest, NextResponse } from 'next/server'
import { getSetting, setSetting, getAiMode, hasAiKey, isAiEnabled } from '@/lib/ai'

export const dynamic = 'force-dynamic'

const ALLOWED_KEYS = [
  'openrouter_api_key',
  'openrouter_model',
  'etsy_api_key',
  'etsy_api_secret',
  'printful_api_key',
]

export async function GET() {
  const settings: Record<string, string | null> = {}
  for (const key of ALLOWED_KEYS) {
    const value = getSetting(key)
    // Mask API keys for security
    if (value && key.includes('key') || key.includes('secret')) {
      settings[key] = value ? `${value.substring(0, 6)}...${value.substring(value.length - 4)}` : null
    } else {
      settings[key] = value
    }
  }
  settings['ai_enabled'] = isAiEnabled() ? 'true' : 'false'
  settings['ai_mode'] = getAiMode()
  settings['has_api_key'] = hasAiKey() ? 'true' : 'false'
  return NextResponse.json(settings)
}

export async function POST(request: NextRequest) {
  const body = await request.json()

  if (body.ai_mode === 'live' || body.ai_mode === 'demo') {
    setSetting('ai_mode', body.ai_mode)
  }

  for (const [key, value] of Object.entries(body)) {
    if (ALLOWED_KEYS.includes(key) && typeof value === 'string' && value.trim()) {
      setSetting(key, value.trim())
    }
  }

  return NextResponse.json({ success: true })
}
