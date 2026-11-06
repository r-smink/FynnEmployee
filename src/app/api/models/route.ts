import { NextResponse } from 'next/server'
import { DEFAULT_MODEL, getModel } from '@/lib/ai'
import { DEFAULT_IMAGE_MODEL, getImageModel } from '@/lib/images'

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
  // accepts images as input
  vision: boolean
}

interface OpenRouterModel {
  id: string
  name: string
  created: number
  context_length: number
  pricing?: { prompt?: string; completion?: string }
  architecture?: { input_modalities?: string[]; output_modalities?: string[] }
}

// Image models come from a separate endpoint; they answer with images, not text
export interface ImageModelInfo {
  id: string
  name: string
  provider: string
  created: number
  // e.g. "svg" for vector models
  formats: string[]
}

interface OpenRouterImageModel {
  id: string
  name: string
  created: number
  supported_parameters?: { output_format?: { values?: string[] } }
}

const CACHE_MS = 60 * 60 * 1000
const cache = globalThis as unknown as {
  __fynnModels?: { at: number; models: ModelInfo[] }
  __fynnImageModels?: { at: number; models: ImageModelInfo[] }
}

async function loadImageModels(): Promise<ImageModelInfo[]> {
  if (cache.__fynnImageModels && Date.now() - cache.__fynnImageModels.at < CACHE_MS) return cache.__fynnImageModels.models
  const res = await fetch('https://openrouter.ai/api/v1/images/models', { signal: AbortSignal.timeout(10_000) })
  if (!res.ok) throw new Error(`OpenRouter ${res.status}`)
  const { data } = (await res.json()) as { data: OpenRouterImageModel[] }
  const models = data
    .map(m => ({
      id: m.id,
      name: m.name.replace(/^[^:]+:s*/, ''),
      provider: m.id.split('/')[0],
      created: m.created,
      formats: m.supported_parameters?.output_format?.values ?? [],
    }))
    .sort((a, b) => a.provider.localeCompare(b.provider) || b.created - a.created)
  cache.__fynnImageModels = { at: Date.now(), models }
  return models
}

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
    // drop batch/variant suffixes (keep free tiers), models that cannot answer in text and moderation models
    .filter(m => !m.id.includes(':') || m.id.endsWith(':free'))
    .filter(m => {
      const out = m.architecture?.output_modalities
      return (!out || out.includes('text')) && !/guard|moderation/i.test(m.id)
    })
    .map(m => ({
      id: m.id,
      name: m.name.replace(/^[^:]+:\s*/, ''),
      provider: m.id.split('/')[0],
      created: m.created,
      context: m.context_length,
      inputPrice: perMillion(m.pricing?.prompt),
      outputPrice: perMillion(m.pricing?.completion),
      vision: !!m.architecture?.input_modalities?.includes('image'),
    }))
    .sort((a, b) => a.provider.localeCompare(b.provider) || b.created - a.created)
  cache.__fynnModels = { at: Date.now(), models }
  return models
}

export async function GET() {
  const image = { imageModel: getImageModel(), fallbackImageModel: DEFAULT_IMAGE_MODEL }
  const imageModels = await loadImageModels().catch(() => cache.__fynnImageModels?.models ?? [])
  try {
    const models = await loadModels()
    return NextResponse.json({ models, imageModels, defaultModel: getModel(), fallbackModel: DEFAULT_MODEL, ...image, live: true })
  } catch {
    // Offline: the UI still allows typing a model id by hand
    return NextResponse.json({ models: cache.__fynnModels?.models ?? [], imageModels, defaultModel: getModel(), fallbackModel: DEFAULT_MODEL, ...image, live: false })
  }
}
