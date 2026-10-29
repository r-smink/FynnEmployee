import { NextResponse } from 'next/server'
import { DEFAULT_MODEL, getModel } from '@/lib/ai'

export const dynamic = 'force-dynamic'

export interface ModelInfo {
  id: string
  name: string
  provider: string
  created: number
  context: number
  // USD per 1M tokens, null when unknown
  inputPrice: number | null
  outputPrice: number | null
}

interface OpenRouterModel {
  id: string
  name: string
  created: number
  context_length: number
  pricing?: { prompt?: string; completion?: string }
  architecture?: { output_modalities?: string[] }
}

const CACHE_MS = 60 * 60 * 1000
const cache = globalThis as unknown as { __fynnModels?: { at: number; models: ModelInfo[] } }

const perMillion = (v?: string) => {
  const n = v === undefined ? NaN : parseFloat(v)
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 1_000_000 * 1000) / 1000 : null
}

// The public model list needs no API key
async function loadModels(): Promise<ModelInfo[]> {
  if (cache.__fynnModels && Date.now() - cache.__fynnModels.at < CACHE_MS) return cache.__fynnModels.models
  const res = await fetch('https://openrouter.ai/api/v1/models', { signal: AbortSignal.timeout(10_000) })
  if (!res.ok) throw new Error(`OpenRouter ${res.status}`)
  const { data } = (await res.json()) as { data: OpenRouterModel[] }
  const models = data
    // drop batch/variant suffixes (keep free tiers), image/audio generators and moderation models
    .filter(m => !m.id.includes(':') || m.id.endsWith(':free'))
    .filter(m => {
      const out = m.architecture?.output_modalities
      return (!out || (out.length === 1 && out[0] === 'text')) && !/guard|moderation/i.test(m.id)
    })
    .map(m => ({
      id: m.id,
      name: m.name.replace(/^[^:]+:\s*/, ''),
      provider: m.id.split('/')[0],
      created: m.created,
      context: m.context_length,
      inputPrice: perMillion(m.pricing?.prompt),
      outputPrice: perMillion(m.pricing?.completion),
    }))
    .sort((a, b) => a.provider.localeCompare(b.provider) || b.created - a.created)
  cache.__fynnModels = { at: Date.now(), models }
  return models
}

export async function GET() {
  try {
    const models = await loadModels()
    return NextResponse.json({ models, defaultModel: getModel(), fallbackModel: DEFAULT_MODEL, live: true })
  } catch {
    // Offline: the UI still allows typing a model id by hand
    return NextResponse.json({ models: cache.__fynnModels?.models ?? [], defaultModel: getModel(), fallbackModel: DEFAULT_MODEL, live: false })
  }
}
