import sharp from 'sharp'

// The server has 512 MB. Print files are up to 4800 px (one raw RGBA image is ~90 MB), so image and
// video work must stay lean: no libvips cache, one libvips thread, and only one heavy job at a time.
sharp.cache(false)
sharp.concurrency(1)

export { sharp }

const lock = globalThis as unknown as { __fynnHeavyWork?: Promise<unknown> }

// Runs image/video work one job at a time, across all agents and requests. Several agents publishing
// at once would otherwise each hold their own large images in memory.
export function oneAtATime<T>(work: () => Promise<T>): Promise<T> {
  const previous = lock.__fynnHeavyWork ?? Promise.resolve()
  const next = previous.catch(() => undefined).then(work)
  lock.__fynnHeavyWork = next.catch(() => undefined)
  return next
}
