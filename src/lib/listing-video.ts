import { spawn } from 'child_process'
import fs from 'fs'
import os from 'os'
import path from 'path'

// A short slideshow of the product photos for the Etsy listing video.
// Etsy wants 5 to 15 seconds; ffmpeg must be installed (it is in the Docker image).

const SIZE = 1080
const LENGTH = 12
const FADE = 0.4

// null when ffmpeg isn't available here, so the listing goes up without a video
export async function slideshowVideo(images: Buffer[]): Promise<Buffer | null> {
  if (images.length === 0) return null
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fynn-video-'))
  try {
    const each = Math.max(2, LENGTH / images.length)
    const inputs = images.flatMap((image, i) => {
      const file = path.join(dir, `${i}.jpg`)
      fs.writeFileSync(file, image)
      return ['-loop', '1', '-t', String(each), '-i', file]
    })
    const scenes = images.map((_, i) =>
      `[${i}:v]scale=${SIZE}:${SIZE}:force_original_aspect_ratio=decrease,pad=${SIZE}:${SIZE}:(ow-iw)/2:(oh-ih)/2:color=white,` +
      `setsar=1,fps=30,fade=t=in:st=0:d=${FADE},fade=t=out:st=${each - FADE}:d=${FADE}[v${i}]`)
    const filter = `${scenes.join(';')};${images.map((_, i) => `[v${i}]`).join('')}concat=n=${images.length}:v=1:a=0,format=yuv420p[out]`
    const out = path.join(dir, 'video.mp4')
    const ran = await ffmpeg([...inputs, '-filter_complex', filter, '-map', '[out]', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23', '-movflags', '+faststart', '-y', out])
    return ran ? fs.readFileSync(out) : null
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
}

function ffmpeg(args: string[]): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.env.FFMPEG_PATH || 'ffmpeg', ['-hide_banner', '-loglevel', 'error', ...args])
    let errors = ''
    child.stderr.on('data', chunk => { errors += chunk })
    child.on('error', err => (err as NodeJS.ErrnoException).code === 'ENOENT' ? resolve(false) : reject(err))
    child.on('close', code => code === 0 ? resolve(true) : reject(new Error(`ffmpeg: ${errors.trim().slice(-300) || `exit ${code}`}`)))
  })
}
