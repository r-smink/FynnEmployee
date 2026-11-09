'use client'

import { use, useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { nl } from 'date-fns/locale'
import { AlertTriangle, CheckCircle2, Loader2, Wrench, X, Zap, ShoppingCart, Package, Bot } from 'lucide-react'
import { Topbar } from '@/components/layout/topbar'
import { PageBody } from '@/components/layout/app-shell'
import { SETTINGS_CHANGED_EVENT } from '@/hooks/use-ai-mode'
import { parseDbDate } from '@/lib/revenue'

interface OrderError { id: string; etsy_order_id: string; customer_name: string | null; product_title: string | null; fulfill_error: string; updated_at: string }
interface ProductError { id: string; title: string; publish_error: string | null; updated_at: string }
interface TaskError { id: number; task_id: string; message: string; created_at: string; title: string; agent_id: string | null; agent_name: string | null; agent_color: string | null }
interface Fix { id: string; type: string; status: string; input: { productId?: string; orderId?: string; retryOf?: string }; agent_name: string | null; run_after: string | null }
interface Errors { autoFix: boolean; orders: OrderError[]; products: ProductError[]; tasks: TaskError[]; fixes: Fix[] }

const ago = (value: string) => {
  try { return formatDistanceToNow(parseDbDate(value), { addSuffix: true, locale: nl }) } catch { return '' }
}

const smallBtn = 'h-[30px] px-3 rounded-lg text-xs font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1.5'
const ghost = { background: 'var(--well)', color: 'var(--text-b)', border: '1px solid var(--well-border)' }

// What an agent is doing about an error right now, or null when nobody is on it
function FixState({ fix }: { fix: Fix | undefined }) {
  if (!fix) return null
  const who = fix.agent_name || 'Een agent'
  const later = fix.status === 'queued' && fix.run_after && parseDbDate(fix.run_after).getTime() > Date.now()
  return (
    <p className="text-[12px] mt-2 mb-0 inline-flex items-center gap-1.5 font-semibold" style={{ color: 'var(--fyn-purple)' }}>
      <Loader2 className="w-3.5 h-3.5 animate-spin" />
      {fix.status === 'in_progress' ? `${who} is ermee bezig…`
        : later ? `${who} probeert het automatisch opnieuw ${ago(fix.run_after!)}`
        : `Staat bij ${who} in de wachtrij`}
    </p>
  )
}

function Section({ icon: Icon, title, count, children }: { icon: typeof AlertTriangle; title: string; count: number; children: React.ReactNode }) {
  if (count === 0) return null
  return (
    <div className="mb-[22px]">
      <h3 className="flex items-center gap-2 text-[13px] font-bold uppercase tracking-[.04em] mb-2.5" style={{ color: 'var(--text-m)' }}>
        <Icon className="w-4 h-4" /> {title} ({count})
      </h3>
      <div className="flex flex-col gap-3">{children}</div>
    </div>
  )
}

function ErrorCard({ accent, label, title, message, when, children, fix }: {
  accent: string; label: string; title: React.ReactNode; message: string; when: string; children: React.ReactNode; fix?: Fix
}) {
  return (
    <div className="fynn-card px-4 py-3.5" style={{ borderLeft: `3px solid ${accent}` }}>
      <div className="flex items-start gap-3 flex-wrap">
        <div className="flex-1 min-w-[240px]">
          <div className="text-[11px] font-bold uppercase tracking-[.04em]" style={{ color: 'var(--text-m)' }}>{label} · {ago(when)}</div>
          <div className="text-[13.5px] font-semibold mt-0.5" style={{ color: 'var(--text-h)' }}>{title}</div>
          <p className="text-[12.5px] mt-1.5 mb-0 break-words" style={{ color: '#b91c1c' }}>{message}</p>
          <FixState fix={fix} />
        </div>
        <div className="flex gap-1.5 flex-wrap">{children}</div>
      </div>
    </div>
  )
}

export default function ErrorsPage({ params }: { params: Promise<{ shopId: string }> }) {
  const { shopId } = use(params)
  const [data, setData] = useState<Errors | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [notice, setNotice] = useState<{ text: string; error?: boolean } | null>(null)

  const load = useCallback(() => fetch(`/api/shops/${shopId}/errors`).then(r => r.json()).then(d => {
    if (d && Array.isArray(d.orders)) setData(d)
  }).catch(() => {}), [shopId])

  useEffect(() => {
    load()
    // Agents work on fixes while the page is open
    const interval = setInterval(load, 5000)
    window.addEventListener(SETTINGS_CHANGED_EVENT, load)
    return () => {
      clearInterval(interval)
      window.removeEventListener(SETTINGS_CHANGED_EVENT, load)
    }
  }, [load])

  const post = async (key: string, url: string, body: unknown, success?: (r: { agent?: string; paused?: boolean }) => string) => {
    setBusy(key)
    setNotice(null)
    try {
      const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const r = await res.json().catch(() => ({}))
      if (!res.ok) setNotice({ text: r.error || 'Dat lukte niet', error: true })
      else if (success) setNotice({ text: success(r) })
    } catch {
      setNotice({ text: 'Geen verbinding met de server', error: true })
    }
    setBusy(null)
    load()
    window.dispatchEvent(new Event(SETTINGS_CHANGED_EVENT))
  }

  const assign = (kind: 'order' | 'product' | 'task', id: string | number) =>
    post(`${kind}:${id}:assign`, `/api/shops/${shopId}/errors`, { action: 'assign', kind, id }, r =>
      r.paused ? `${r.agent} staat uit. De taak wacht tot je ${r.agent} weer aanzet.` : `${r.agent} gaat ermee aan de slag.`)
  const dismiss = (kind: 'product' | 'task', id: string | number) =>
    post(`${kind}:${id}:dismiss`, `/api/shops/${shopId}/errors`, { action: 'dismiss', kind, id })

  const toggleAuto = async () => {
    if (!data) return
    const next = !data.autoFix
    setData({ ...data, autoFix: next })
    await fetch('/api/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ auto_fix: next ? '1' : '0' }) })
    load()
  }

  const fixFor = (match: (f: Fix) => boolean) => data?.fixes.find(match)
  const total = data ? data.orders.length + data.products.length + data.tasks.length : 0

  return (
    <>
      <Topbar title="Fouten" subtitle={data ? (total ? `${total} ${total === 1 ? 'fout' : 'fouten'} om naar te kijken` : 'Alles loopt') : 'Laden…'} />
      <PageBody>
        <div className="fynn-card px-4 py-3.5 mb-[18px]">
          <div className="flex items-center gap-3 flex-wrap">
            <label className="flex items-start gap-2.5 flex-1 min-w-[260px] cursor-pointer">
              <input type="checkbox" className="mt-[3px]" checked={!!data?.autoFix} disabled={!data} onChange={toggleAuto} />
              <span className="text-[12.5px] leading-[1.5]" style={{ color: 'var(--text-b)' }}>
                <b className="inline-flex items-center gap-1"><Zap className="w-3.5 h-3.5" style={{ color: 'var(--fyn-purple)' }} />Agents lossen nieuwe fouten zelf op</b><br />
                <span style={{ color: 'var(--text-m)' }}>
                  Na 2 minuten probeert Marcus een mislukt product en Aria een mislukte bestelling één keer opnieuw. Lukt dat niet, dan blijft de fout hier staan.
                </span>
              </span>
            </label>
            {data && (data.products.length > 0 || data.tasks.length > 0) && (
              <button className={smallBtn} style={ghost} disabled={!!busy}
                onClick={() => post('all', `/api/shops/${shopId}/errors`, { action: 'dismiss_all' }, () => 'Product- en taakfouten weggeklikt. Bestellingen met een fout blijven staan.')}>
                <X className="w-3.5 h-3.5" />Alles wegklikken
              </button>
            )}
          </div>
          {notice && (
            <p className="text-[12.5px] mt-2.5 mb-0 px-3 py-2 rounded-lg flex items-start gap-2"
              style={notice.error ? { background: 'var(--fyn-danger-light)', color: '#b91c1c' } : { background: 'var(--fyn-success-light)', color: '#047857' }}>
              <span className="flex-1">{notice.text}</span>
              <button onClick={() => setNotice(null)} aria-label="Melding wegklikken" className="flex-none cursor-pointer" style={{ color: 'inherit' }}>
                <X className="w-3.5 h-3.5" />
              </button>
            </p>
          )}
        </div>

        {data && total === 0 && (
          <div className="fynn-card py-14 text-center text-[13px]" style={{ color: 'var(--text-m)' }}>
            <CheckCircle2 className="w-6 h-6 mx-auto mb-2" style={{ color: '#10b981' }} />
            Geen fouten. Alles loopt.
          </div>
        )}

        {data && (
          <>
            <Section icon={ShoppingCart} title="Bestellingen" count={data.orders.length}>
              {data.orders.map(o => {
                const fix = fixFor(f => f.type === 'fix_order' && f.input.orderId === o.id)
                return (
                  <ErrorCard key={o.id} accent="#dc2626" label={`Bestelling ${o.etsy_order_id}`} when={o.updated_at} fix={fix}
                    title={[o.customer_name, o.product_title].filter(Boolean).join(' · ') || 'Bestelling'} message={o.fulfill_error}>
                    <button className={smallBtn} style={{ background: 'var(--fyn-gradient)', color: '#fff' }} disabled={!!busy || !!fix}
                      onClick={() => assign('order', o.id)}>
                      <Wrench className="w-3.5 h-3.5" />Aria laten oplossen
                    </button>
                    <button className={smallBtn} style={ghost} disabled={!!busy}
                      onClick={() => window.confirm('Heb je deze bestelling zelf in Printful gemaakt en op Etsy afgehandeld? De app doet er dan niets meer mee.')
                        && post(`order:${o.id}:handled`, `/api/shops/${shopId}/orders/${o.id}`, { action: 'handled' }, () => 'Gemarkeerd als zelf afgehandeld.')}>
                      Zelf afgehandeld
                    </button>
                  </ErrorCard>
                )
              })}
            </Section>

            <Section icon={Package} title="Producten naar Etsy" count={data.products.length}>
              {data.products.map(p => {
                const fix = fixFor(f => f.type === 'fix_publish' && f.input.productId === p.id)
                return (
                  <ErrorCard key={p.id} accent="#d97706" label="Product naar Etsy" when={p.updated_at} fix={fix}
                    title={p.title} message={p.publish_error || 'Onbekende fout'}>
                    <button className={smallBtn} style={{ background: 'var(--fyn-gradient)', color: '#fff' }} disabled={!!busy || !!fix}
                      onClick={() => assign('product', p.id)}>
                      <Wrench className="w-3.5 h-3.5" />Marcus laten oplossen
                    </button>
                    <Link href={`/shops/${shopId}/products`} className={smallBtn} style={ghost}>Naar Producten</Link>
                    <button className={smallBtn} style={ghost} disabled={!!busy} onClick={() => dismiss('product', p.id)} title="Wegklikken">
                      <X className="w-3.5 h-3.5" />Wegklikken
                    </button>
                  </ErrorCard>
                )
              })}
            </Section>

            <Section icon={Bot} title="Taken van agents" count={data.tasks.length}>
              {data.tasks.map(t => {
                const fix = fixFor(f => f.input.retryOf === t.task_id)
                const who = t.agent_name || 'de agent'
                return (
                  <ErrorCard key={t.id} accent={t.agent_color || '#64748b'} label={t.agent_name || 'Agent'} when={t.created_at} fix={fix}
                    title={t.title} message={t.message.replace(/^Mislukt: .*? - /, '')}>
                    <button className={smallBtn} style={{ background: 'var(--fyn-gradient)', color: '#fff' }} disabled={!!busy || !!fix}
                      onClick={() => assign('task', t.id)}>
                      <Wrench className="w-3.5 h-3.5" />{who} opnieuw laten doen
                    </button>
                    <button className={smallBtn} style={ghost} disabled={!!busy} onClick={() => dismiss('task', t.id)} title="Wegklikken">
                      <X className="w-3.5 h-3.5" />Wegklikken
                    </button>
                  </ErrorCard>
                )
              })}
            </Section>
          </>
        )}
      </PageBody>
    </>
  )
}
