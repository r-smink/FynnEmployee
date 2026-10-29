import { eventBus } from '@/lib/events'
import { engine } from '@/agents/engine'

export const dynamic = 'force-dynamic'

export async function GET(_req: Request, { params }: { params: Promise<{ shopId: string }> }) {
  const { shopId } = await params
  engine.ensureShopStarted(shopId)

  const encoder = new TextEncoder()
  let listenerCleanup: (() => void) | null = null

  const stream = new ReadableStream({
    start(controller) {
      const handler = (event: unknown) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
        } catch {}
      }

      eventBus.on(`agent-event:${shopId}`, handler)
      listenerCleanup = () => eventBus.off(`agent-event:${shopId}`, handler)

      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'connected', shopId })}\n\n`))
    },
    cancel() {
      listenerCleanup?.()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
