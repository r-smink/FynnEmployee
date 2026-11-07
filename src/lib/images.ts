import fs from 'fs'
import path from 'path'
import { getSetting } from './ai'

// Image generation through OpenRouter's Image API (POST /api/v1/images), used by Luna for real designs

export const DEFAULT_IMAGE_MODEL = 'recraft/recraft-v4-vector'
export const DEFAULT_DAILY_DESIGNS = 5
// Luna stops drawing while this many designs wait for review, so unreviewed work can't pile up costs
export const MAX_DESIGNS_IN_REVIEW = 10

export function getImageModel(): string {
  return getSetting('openrouter_image_model') || DEFAULT_IMAGE_MODEL
}

export function getDailyDesignLimit(): number {
  const n = parseInt(getSetting('luna_daily_designs') ?? '', 10)
  return Number.isFinite(n) && n >= 0 ? Math.min(n, 50) : DEFAULT_DAILY_DESIGNS
}

// ─── Model list ───────────────────────────────────────────

// Image models come from a separate OpenRouter endpoint; they answer with images, not text
export interface ImageModelInfo {
  id: string
  name: string
  provider: string
  created: number
  // e.g. "svg" for vector models
  formats: string[]
  // Style models only copy the look of example images you send; Luna sends text only, so they can't be used
  needsReference: boolean
}

interface OpenRouterImageModel {
  id: string
  name: string
  created: number
  supported_parameters?: {
    output_format?: { values?: string[] }
    input_references?: { min?: number }
  }
}

const MODELS_CACHE_MS = 60 * 60 * 1000
const modelCache = globalThis as unknown as { __fynnImageModels?: { at: number; models: ImageModelInfo[] } }

export const imageModelCache = () => modelCache.__fynnImageModels?.models ?? []

export async function loadImageModels(): Promise<ImageModelInfo[]> {
  const hit = modelCache.__fynnImageModels
  if (hit && Date.now() - hit.at < MODELS_CACHE_MS) return hit.models
  const res = await fetch('https://openrouter.ai/api/v1/images/models', { signal: AbortSignal.timeout(10_000) })
  if (!res.ok) throw new Error(`OpenRouter ${res.status}`)
  const { data } = (await res.json()) as { data: OpenRouterImageModel[] }
  const models = data
    .map(m => ({
      id: m.id,
      name: m.name.replace(/^[^:]+:\s*/, ''),
      provider: m.id.split('/')[0],
      created: m.created,
      formats: m.supported_parameters?.output_format?.values ?? [],
      needsReference: (m.supported_parameters?.input_references?.min ?? 0) > 0,
    }))
    .sort((a, b) => a.provider.localeCompare(b.provider) || b.created - a.created)
  modelCache.__fynnImageModels = { at: Date.now(), models }
  return models
}

// Why a model can't be used for Luna's designs, or null when it can (unknown models get the benefit of the doubt)
export async function imageModelProblem(model: string): Promise<string | null> {
  const info = (await loadImageModels().catch(imageModelCache)).find(m => m.id === model)
  if (info?.needsReference) {
    return `Beeldmodel ${model} heeft verplicht een voorbeeldafbeelding nodig om de stijl van te kopiëren en werkt niet voor Luna. Kies bij Instellingen een ander model, bijvoorbeeld ${DEFAULT_IMAGE_MODEL}.`
  }
  return null
}

export interface GeneratedImage {
  data: Buffer
  mediaType: string
  cost: number | null // USD, when OpenRouter reports it
}

export async function generateImage(prompt: string, aspectRatio = '1:1'): Promise<GeneratedImage> {
  const apiKey = getSetting('openrouter_api_key')
  if (!apiKey) throw new Error('Geen OpenRouter-sleutel ingesteld')
  const model = getImageModel()

  const res = await fetch('https://openrouter.ai/api/v1/images', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'X-Title': 'FynnEmployee AI Store',
    },
    body: JSON.stringify({ model, prompt, n: 1, aspect_ratio: aspectRatio }),
    // Image models can take well over a minute
    signal: AbortSignal.timeout(180_000),
  })
  if (!res.ok) {
    throw new Error(`Beeldmodel ${model} gaf ${res.status}: ${(await res.text()).slice(0, 200)}`)
  }
  const json = await res.json() as {
    data?: { b64_json?: string; media_type?: string }[]
    usage?: { cost?: number }
  }
  const image = json.data?.[0]
  if (!image?.b64_json) throw new Error(`Beeldmodel ${model} gaf geen afbeelding terug`)
  return {
    data: Buffer.from(image.b64_json, 'base64'),
    mediaType: image.media_type || 'image/png',
    cost: typeof json.usage?.cost === 'number' ? json.usage.cost : null,
  }
}

// ─── Quality check ────────────────────────────────────────

export const DESIGN_EXTENSIONS: Record<string, string> = {
  'image/svg+xml': 'svg', 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp',
}

const MAX_BYTES = 10 * 1024 * 1024

// Strips anything executable or external from an SVG; designs are shown inside the app
function sanitizeSvg(svg: string): string {
  return svg
    .replace(/<script[\s\S]*?<\/script\s*>/gi, '')
    .replace(/<foreignObject[\s\S]*?<\/foreignObject\s*>/gi, '')
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/\s(?:xlink:)?href\s*=\s*("(?!#|data:image\/)[^"]*"|'(?!#|data:image\/)[^']*')/gi, '')
}

export type DesignCheck = { ok: true; data: Buffer } | { ok: false; reason: string }

// Basic, automatic checks. The review list is the real gate: a person approves every design.
export function checkDesign(image: GeneratedImage): DesignCheck {
  if (image.data.length === 0) return { ok: false, reason: 'lege afbeelding' }
  if (image.data.length > MAX_BYTES) return { ok: false, reason: 'bestand groter dan 10 MB' }
  if (!DESIGN_EXTENSIONS[image.mediaType]) return { ok: false, reason: `onbekend bestandstype ${image.mediaType}` }

  if (image.mediaType === 'image/svg+xml') {
    const svg = image.data.toString('utf8')
    if (!/<svg[\s>]/i.test(svg)) return { ok: false, reason: 'geen geldige SVG' }
    if (!/<(path|rect|circle|ellipse|polygon|polyline|line)[\s/>]/i.test(svg)) return { ok: false, reason: 'SVG bevat geen vormen' }
    // We ask for artwork without text; real <text> elements mean the model ignored that
    if (/<text[\s>]/i.test(svg)) return { ok: false, reason: 'ontwerp bevat tekst' }
    return { ok: true, data: Buffer.from(sanitizeSvg(svg), 'utf8') }
  }

  const magic: Record<string, (b: Buffer) => boolean> = {
    'image/png': b => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
    'image/jpeg': b => b[0] === 0xff && b[1] === 0xd8,
    'image/webp': b => b.subarray(0, 4).toString() === 'RIFF' && b.subarray(8, 12).toString() === 'WEBP',
  }
  if (!magic[image.mediaType](image.data)) return { ok: false, reason: 'beschadigd beeldbestand' }
  return { ok: true, data: image.data }
}

// ─── Storage ──────────────────────────────────────────────

// Next to the database, so designs live on the same persistent volume (/data in production)
export function designsDir(): string {
  const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), 'fynnemployee.db')
  return path.join(path.dirname(dbPath), 'designs')
}

export const DESIGN_FILE = /^[a-f0-9-]{36}\.(svg|png|jpg|webp)$/

export function saveDesign(id: string, data: Buffer, mediaType: string): string {
  const file = `${id}.${DESIGN_EXTENSIONS[mediaType]}`
  fs.mkdirSync(designsDir(), { recursive: true })
  fs.writeFileSync(path.join(designsDir(), file), data)
  return file
}

export function deleteDesign(file: string) {
  if (!DESIGN_FILE.test(file)) return
  fs.rmSync(path.join(designsDir(), file), { force: true })
}
