import { NextRequest, NextResponse } from 'next/server'
import { getSetting, setSetting } from '@/lib/ai'
import { getShopSetting, setShopSetting } from '@/lib/shop-settings'

export const dynamic = 'force-dynamic'

const GLOBAL_KEYS = ['openrouter_api_key', 'openrouter_model']
const SHOP_KEYS = ['etsy_api_key', 'etsy_api_secret', 'printful_api_key']

export async function GET(_req: NextRequest, { params }: { params: Promise<{ shopId: string }> }) {
  const { shopId } = await params
  const settings: Record<string, string | null> = {}

  for (const key of GLOBAL_KEYS) {
    const value = getSetting(key)
    settings[key] = value && key.includes('key') ? `${value.substring(0, 6)}...${value.substring(value.length - 4)}` : value
  }
  for (const key of SHOP_KEYS) {
    const value = getShopSetting(shopId, key)
    settings[key] = value ? `${value.substring(0, 6)}...${value.substring(value.length - 4)}` : null
  }
  settings['ai_enabled'] = getSetting('openrouter_api_key') ? 'true' : 'false'

  return NextResponse.json(settings)
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ shopId: string }> }) {
  const { shopId } = await params
  const body = await request.json()

  for (const [key, value] of Object.entries(body)) {
    if (typeof value === 'string' && value.trim()) {
      if (GLOBAL_KEYS.includes(key)) {
        setSetting(key, value.trim())
      } else if (SHOP_KEYS.includes(key)) {
        setShopSetting(shopId, key, value.trim())
      }
    }
  }

  return NextResponse.json({ success: true })
}
