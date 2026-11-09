import { NextRequest, NextResponse } from 'next/server'
import { getSetting, setSetting, getAiMode, hasAiKey, isAiEnabled } from '@/lib/ai'
import { getShopSetting, setShopSetting, disabledProductTypes, DISABLED_TYPES_KEY } from '@/lib/shop-settings'
import { PRODUCT_TYPES } from '@/lib/product-specs'
import { purgeDemoDataIfLive } from '@/lib/demo-data'

export const dynamic = 'force-dynamic'

const GLOBAL_KEYS = ['openrouter_api_key', 'openrouter_model', 'openrouter_image_model', 'luna_daily_designs']
// The Etsy and Printful clients read their keys from the global settings, so store them there too
const INTEGRATION_KEYS = ['etsy_api_key', 'etsy_api_secret', 'printful_api_key']

const mask = (value: string | null) => value ? `${value.substring(0, 6)}...${value.substring(value.length - 4)}` : null

export async function GET(_req: NextRequest, { params }: { params: Promise<{ shopId: string }> }) {
  const { shopId } = await params
  const settings: Record<string, string | null> = {}

  for (const key of GLOBAL_KEYS) {
    const value = getSetting(key)
    settings[key] = key.includes('key') ? mask(value) : value
  }
  for (const key of INTEGRATION_KEYS) {
    let value = getSetting(key)
    // Older versions saved these per shop, where the integrations never looked; move them over
    const legacy = !value && getShopSetting(shopId, key)
    if (legacy) {
      setSetting(key, legacy)
      value = legacy
    }
    settings[key] = mask(value)
  }
  settings['ai_enabled'] = isAiEnabled() ? 'true' : 'false'
  settings['ai_mode'] = getAiMode()
  settings['has_api_key'] = hasAiKey() ? 'true' : 'false'
  settings[DISABLED_TYPES_KEY] = JSON.stringify(disabledProductTypes(shopId))

  return NextResponse.json(settings)
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ shopId: string }> }) {
  const { shopId } = await params
  const body = await request.json()

  for (const [key, value] of Object.entries(body)) {
    if (typeof value === 'string' && value.trim()) {
      if (GLOBAL_KEYS.includes(key) || INTEGRATION_KEYS.includes(key)) {
        setSetting(key, value.trim())
      }
    }
  }
  // Product types switched off for this shop, as a list
  if (Array.isArray(body[DISABLED_TYPES_KEY])) {
    const off = body[DISABLED_TYPES_KEY].filter((t: unknown): t is string => typeof t === 'string' && PRODUCT_TYPES.includes(t))
    setShopSetting(shopId, DISABLED_TYPES_KEY, JSON.stringify([...new Set(off)]))
  }
  // Saving the OpenRouter key can be what turns AI Live on
  purgeDemoDataIfLive()

  return NextResponse.json({ success: true })
}
