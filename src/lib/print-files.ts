import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import sharp from 'sharp'
import { getSetting, setSetting } from './ai'
import { designsDir, DESIGN_FILE } from './images'

// Print-ready PNGs made from Luna's designs, and signed links so Printful can fetch them
// while the rest of the app stays behind the password.

export type Layout = 'chest' | 'center' | 'wrap'

// Large enough for the biggest print area we use (posters up to 24x32 in at 150 dpi)
const RASTER_SIZE = 4800

// The design as a big PNG; vector designs are rendered sharp at that size, not scaled up
export async function designPng(designFile: string): Promise<Buffer> {
  const source = fs.readFileSync(path.join(designsDir(), designFile))
  if (!designFile.endsWith('.svg')) return sharp(source).png().toBuffer()
  const { width = 1024, height = 1024 } = await sharp(source).metadata()
  const density = Math.min(2400, Math.max(72, (72 * RASTER_SIZE) / Math.max(width, height)))
  return sharp(source, { density }).png().toBuffer()
}

// Whether the visible part of a design is mostly dark, to pick a garment colour it stands out on
export async function isDarkDesign(png: Buffer): Promise<boolean> {
  const { data, info } = await sharp(png).resize(200, 200, { fit: 'inside' }).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  let weight = 0
  let light = 0
  for (let i = 0; i < data.length; i += info.channels) {
    const alpha = data[i + 3] / 255
    weight += alpha
    light += alpha * (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2])
  }
  return weight > 0 && light / weight < 128
}

// The design placed on a transparent canvas of exactly the print area, so Printful needs no positioning
export async function renderPrintFile(png: Buffer, width: number, height: number, layout: Layout): Promise<Buffer> {
  const trimmed = await sharp(png).trim().toBuffer().catch(() => png)
  const fit = (w: number, h: number) =>
    sharp(trimmed).resize(Math.round(w), Math.round(h), { fit: 'inside' }).png().toBuffer({ resolveWithObject: true })

  const layers: { input: Buffer; left: number; top: number }[] = []
  if (layout === 'wrap') {
    // Mugs: the design on both sides, so it shows whichever hand holds it
    const { data, info } = await fit(width * 0.42, height * 0.86)
    for (const centre of [0.25, 0.75]) {
      layers.push({ input: data, left: Math.round(width * centre - info.width / 2), top: Math.round((height - info.height) / 2) })
    }
  } else if (layout === 'chest') {
    // Apparel and bags: full width, starting just below the collar
    const { data, info } = await fit(width * 0.9, height * 0.72)
    layers.push({ input: data, left: Math.round((width - info.width) / 2), top: Math.round(height * 0.04) })
  } else {
    const { data, info } = await fit(width * 0.88, height * 0.88)
    layers.push({ input: data, left: Math.round((width - info.width) / 2), top: Math.round((height - info.height) / 2) })
  }

  return sharp({ create: { width, height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite(layers)
    .png()
    .toBuffer()
}

export const PRINT_FILE = /^[a-f0-9-]{36}-\d+\.png$/

export function savePrintFile(productId: string, printfileId: number, data: Buffer): string {
  const file = `${productId}-${printfileId}.png`
  fs.mkdirSync(designsDir(), { recursive: true })
  fs.writeFileSync(path.join(designsDir(), file), data)
  return file
}

export function deletePrintFiles(productId: string) {
  for (const file of fs.readdirSync(designsDir(), { withFileTypes: true })) {
    if (file.isFile() && file.name.startsWith(`${productId}-`) && PRINT_FILE.test(file.name)) {
      fs.rmSync(path.join(designsDir(), file.name), { force: true })
    }
  }
}

// ─── Signed links ─────────────────────────────────────────

function secret(): string {
  let value = getSetting('file_link_secret')
  if (!value) {
    value = crypto.randomBytes(32).toString('hex')
    setSetting('file_link_secret', value)
  }
  return value
}

const sign = (file: string) => crypto.createHmac('sha256', secret()).update(file).digest('hex').slice(0, 32)

export const isPublicFile = (file: string) => DESIGN_FILE.test(file) || PRINT_FILE.test(file)

export function signedFileUrl(origin: string, file: string): string {
  return `${origin}/api/public/files/${file}?sig=${sign(file)}`
}

export function verifyFileSignature(file: string, sig: string | null): boolean {
  if (!sig || !isPublicFile(file)) return false
  const expected = Buffer.from(sign(file))
  const given = Buffer.from(sig)
  return expected.length === given.length && crypto.timingSafeEqual(expected, given)
}
