'use client'

import { use, useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Clock, RefreshCw, CheckCircle2, XCircle, Truck, AlertTriangle, ShieldCheck, Zap, Hand, ExternalLink } from 'lucide-react'
import { Topbar } from '@/components/layout/topbar'
import { PageBody } from '@/components/layout/app-shell'
import { euro } from '@/lib/labels'
import { useAiMode, SETTINGS_CHANGED_EVENT } from '@/hooks/use-ai-mode'
import { DemoNotice } from '@/components/layout/demo-notice'

interface Order {
  id: string
  etsy_order_id?: string | null
  customer_name: string
  product_title: string
  quantity: number
  total_price: number
  cost?: number | null
  profit: number
  status: string
  fulfillment_status: string
  fulfillment_id?: string | null
  fulfill_error?: string | null
  tracking_number: string | null
  tracking_url?: string | null
  created_at: string
}

interface FailedProduct {
  id: string
  title: string
  publish_status: string | null
  publish_error: string | null
}

type Mode = 'off' | 'draft' | 'auto'

const DEMO_ORDERS: Order[] = [
  { id: '#1047', customer_name: 'Sarah M.', product_title: 'Ocean Waves Mug', quantity: 2, total_price: 33.98, profit: 22.98, status: 'fulfilled', fulfillment_status: 'shipped', tracking_number: '1Z999AA10123456784', created_at: '2024-10-28T14:30:00' },
  { id: '#1046', customer_name: 'James K.', product_title: 'Tropical Sunset T-Shirt', quantity: 1, total_price: 29.99, profit: 17.49, status: 'processing', fulfillment_status: 'in_production', tracking_number: null, created_at: '2024-10-28T12:15:00' },
  { id: '#1045', customer_name: 'Emily R.', product_title: 'Cosmic Galaxy Sticker Set', quantity: 3, total_price: 38.97, profit: 31.47, status: 'fulfilled', fulfillment_status: 'delivered', tracking_number: '1Z999AA10123456785', created_at: '2024-10-27T09:45:00' },
  { id: '#1044', customer_name: 'Michael T.', product_title: 'Retro Space Poster', quantity: 1, total_price: 22.99, profit: 18.74, status: 'fulfilled', fulfillment_status: 'shipped', tracking_number: '1Z999AA10123456786', created_at: '2024-10-27T08:20:00' },
  { id: '#1043', customer_name: 'Lisa H.', product_title: 'Nordic Forest Hoodie', quantity: 1, total_price: 44.99, profit: 26.99, status: 'new', fulfillment_status: 'pending', tracking_number: null, created_at: '2024-10-28T16:00:00' },
  { id: '#1042', customer_name: 'David W.', product_title: 'Boho Mandala Phone Case', quantity: 2, total_price: 39.98, profit: 27.98, status: 'processing', fulfillment_status: 'submitted', tracking_number: null, created_at: '2024-10-28T10:30:00' },
  { id: '#1041', customer_name: 'Anna P.', product_title: 'Mountain Adventure Tote Bag', quantity: 1, total_price: 24.99, profit: 16.24, status: 'fulfilled', fulfillment_status: 'delivered', tracking_number: '1Z999AA10123456787', created_at: '2024-10-26T15:10:00' },
]

const STATUS: Record<string, { bg: string; color: string; icon: typeof Clock; label: string }> = {
  new: { bg: 'var(--fyn-warning-light)', color: '#92700a', icon: Clock, label: 'Nieuw' },
  processing: { bg: 'var(--fyn-info-light)', color: '#1d4ed8', icon: RefreshCw, label: 'Verwerken' },
  fulfilled: { bg: 'var(--fyn-success-light)', color: '#047857', icon: CheckCircle2, label: 'Afgerond' },
  cancelled: { bg: 'var(--fyn-danger-light)', color: '#b91c1c', icon: XCircle, label: 'Geannuleerd' },
}

const FULFILLMENT: Record<string, { color: string; label: string }> = {
  pending: { color: 'var(--text-m)', label: 'Gaat naar Printful' },
  draft: { color: '#d97706', label: 'Concept, wacht op jou' },
  submitted: { color: '#379FD3', label: 'Ingediend' },
  in_production: { color: '#9e4aff', label: 'In productie' },
  shipped: { color: '#ff9e4a', label: 'Verzonden' },
  delivered: { color: '#10b981', label: 'Bezorgd' },
  manual: { color: 'var(--text-m)', label: 'Zelf afhandelen' },
  cancelled: { color: '#b91c1c', label: 'Geannuleerd' },
}

const MODES: { id: Mode; label: string; icon: typeof Clock; hint: string }[] = [
  { id: 'off', label: 'Uit', icon: Hand, hint: 'Bestellingen komen hier binnen, maar je maakt ze zelf aan in Printful.' },
  { id: 'draft', label: 'Veilig', icon: ShieldCheck, hint: 'Elke bestelling staat als concept klaar in Printful. Jij drukt op Bevestigen; pas dan betaal je en print Printful hem.' },
  { id: 'auto', label: 'Automatisch', icon: Zap, hint: 'Elke bestelling gaat meteen naar Printful. Printful rekent hem direct af en gaat printen. Jij hoeft niets te doen.' },
]

const COLS: [string, 'l' | 'c' | 'r'][] = [
  ['Bestelling', 'l'], ['Klant', 'l'], ['Product', 'l'], ['Aantal', 'c'], ['Totaal', 'r'], ['Winst', 'r'], ['Status', 'l'], ['Levering', 'l'], ['', 'r'],
]

const shortId = (o: Order) => (o.etsy_order_id ? `#${o.etsy_order_id}` : o.id)

export default function OrdersPage({ params }: { params: Promise<{ shopId: string }> }) {
  const { shopId } = use(params)
  const { showDemoData } = useAiMode()
  const [realOrders, setRealOrders] = useState<Order[]>([])
  const [failedProducts, setFailedProducts] = useState<FailedProduct[]>([])
  const [mode, setMode] = useState<Mode | null>(null)
  const [tab, setTab] = useState<'orders' | 'errors'>('orders')
  const [busy, setBusy] = useState<string | null>(null)
  const [notice, setNotice] = useState<{ text: string; error?: boolean } | null>(null)

  const load = useCallback(() => {
    fetch(`/api/shops/${shopId}/orders`).then(r => r.json()).then(data => {
      if (Array.isArray(data)) setRealOrders(data)
    }).catch(() => {})
    fetch(`/api/shops/${shopId}/products`).then(r => r.json()).then(data => {
      if (Array.isArray(data)) setFailedProducts(data.filter((p: FailedProduct) => p.publish_status === 'failed'))
    }).catch(() => {})
    fetch('/api/settings').then(r => r.json()).then(data => {
      setMode(data.order_fulfillment === 'off' || data.order_fulfillment === 'auto' ? data.order_fulfillment : 'draft')
    }).catch(() => {})
  }, [shopId])

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('tab') === 'fouten') setTab('errors')
    load()
    const interval = setInterval(load, 15000)
    window.addEventListener(SETTINGS_CHANGED_EVENT, load)
    return () => {
      clearInterval(interval)
      window.removeEventListener(SETTINGS_CHANGED_EVENT, load)
    }
  }, [load])

  const chooseMode = async (next: Mode) => {
    if (next === mode) return
    if (next === 'auto' && !window.confirm('Bestellingen gaan dan meteen naar Printful en Printful rekent ze direct af. Weet je het zeker?')) return
    setMode(next)
    await fetch('/api/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ order_fulfillment: next }) })
    window.dispatchEvent(new Event(SETTINGS_CHANGED_EVENT))
  }

  const run = async (key: string, url: string, body?: unknown, success?: string) => {
    setBusy(key)
    setNotice(null)
    try {
      const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) setNotice({ text: data.error || 'Dat lukte niet', error: true })
      else if (success) setNotice({ text: success })
      return data
    } catch {
      setNotice({ text: 'Geen verbinding met de server', error: true })
    } finally {
      setBusy(null)
      load()
      window.dispatchEvent(new Event(SETTINGS_CHANGED_EVENT))
    }
  }

  const checkNow = async () => {
    const r = await run('check', `/api/shops/${shopId}/orders`)
    if (r && !r.error) {
      setNotice({
        text: r.imported + r.sent + r.shipped + r.failed === 0
          ? 'Gecontroleerd: niets nieuws.'
          : `Gecontroleerd: ${r.imported} nieuw, ${r.sent} naar Printful, ${r.shipped} verzonden${r.failed ? `, ${r.failed} met een fout` : ''}.`,
        error: r.failed > 0,
      })
    }
  }

  const orderAction = (o: Order, action: 'confirm' | 'retry' | 'handled', success: string) =>
    run(`${o.id}:${action}`, `/api/shops/${shopId}/orders/${o.id}`, { action }, success)

  const confirm = (o: Order) => {
    const cost = o.cost ? ` Printful rekent ${euro(o.cost)} af.` : ''
    if (window.confirm(`Bestelling van ${o.customer_name} bevestigen?${cost}`)) orderAction(o, 'confirm', 'Bevestigd. Printful gaat hem maken.')
  }

  // Example orders only in demo mode, and only while there are no real ones
  const demo = showDemoData && realOrders.length === 0
  const orders = demo ? DEMO_ORDERS : realOrders
  const orderErrors = realOrders.filter(o => o.fulfill_error)
  const errorCount = orderErrors.length + failedProducts.length

  const revenue = orders.reduce((s, o) => s + (o.total_price || 0), 0)
  const profit = orders.reduce((s, o) => s + (o.profit || 0), 0)
  const shipped = orders.filter(o => o.fulfillment_status === 'shipped' || o.fulfillment_status === 'delivered').length

  const stats = [
    { label: 'Bestellingen', value: String(orders.length), color: 'var(--text-h)' },
    { label: 'Omzet', value: euro(revenue), color: 'var(--text-h)' },
    { label: 'Winst', value: euro(profit), color: '#10b981' },
    { label: 'Verzonden', value: String(shipped), color: '#379FD3' },
  ]

  const smallBtn = 'h-[30px] px-3 rounded-lg text-xs font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1.5'

  return (
    <>
      <Topbar title="Bestellingen" subtitle={`${orders.length} bestellingen · ${euro(revenue)} omzet · ${euro(profit)} winst`} />
      <PageBody>
        {demo && <DemoNotice />}

        {/* How orders get to Printful */}
        <div className="fynn-card px-4 py-3.5 mb-[18px]">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-[13px] font-bold" style={{ color: 'var(--text-h)' }}>Naar Printful sturen</span>
            <div className="inline-flex p-1 rounded-[10px] gap-1" role="radiogroup" aria-label="Naar Printful sturen"
              style={{ background: 'var(--well)', border: '1px solid var(--well-border)' }}>
              {MODES.map(m => {
                const active = mode === m.id
                return (
                  <button key={m.id} role="radio" aria-checked={active} onClick={() => chooseMode(m.id)} disabled={!mode}
                    className="h-8 px-3 rounded-[7px] text-[12.5px] font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                    style={active
                      ? { background: m.id === 'auto' ? 'var(--fyn-gradient)' : 'var(--card)', color: m.id === 'auto' ? '#fff' : 'var(--text-h)', boxShadow: '0 1px 4px rgba(0,0,0,.12)' }
                      : { background: 'transparent', color: 'var(--text-m)' }}>
                    <m.icon className="w-3.5 h-3.5" />{m.label}
                  </button>
                )
              })}
            </div>
            <div className="flex-1" />
            <button className="fynn-btn-ghost" style={{ height: 34 }} onClick={checkNow} disabled={busy === 'check'}>
              <RefreshCw className={`w-3.5 h-3.5 ${busy === 'check' ? 'animate-spin' : ''}`} /> Nu controleren
            </button>
          </div>
          {mode && (
            <p className="text-[12px] mt-2 mb-0" style={{ color: 'var(--text-m)' }}>
              {MODES.find(m => m.id === mode)!.hint} De app kijkt elke 5 minuten op Etsy. Alleen producten die de app zelf op Etsy heeft gezet kunnen automatisch.
            </p>
          )}
          {notice && (
            <p className="text-[12.5px] mt-2.5 mb-0 px-3 py-2 rounded-lg"
              style={notice.error ? { background: 'var(--fyn-danger-light)', color: '#b91c1c' } : { background: 'var(--fyn-success-light)', color: '#047857' }}>
              {notice.text}
            </p>
          )}
        </div>

        <div className="grid gap-4 mb-[18px]" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))' }}>
          {stats.map(s => (
            <div key={s.label} className="fynn-card px-[18px] py-4" style={{ borderRadius: 13 }}>
              <div className="text-[11px] font-bold uppercase tracking-[.04em]" style={{ color: 'var(--text-m)' }}>{s.label}</div>
              <div className="text-2xl font-bold tracking-[-.02em] mt-[7px]" style={{ color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>

        <div className="flex gap-1 mb-3" role="tablist">
          {([['orders', 'Bestellingen', orders.length], ['errors', 'Fouten', errorCount]] as const).map(([id, label, n]) => {
            const active = tab === id
            const alert = id === 'errors' && n > 0
            return (
              <button key={id} role="tab" aria-selected={active} onClick={() => setTab(id)}
                className="h-9 px-4 rounded-[9px] text-[13px] font-semibold inline-flex items-center gap-2 cursor-pointer"
                style={{ background: active ? 'var(--card)' : 'transparent', color: active ? 'var(--text-h)' : 'var(--text-m)', border: `1px solid ${active ? 'var(--card-border)' : 'transparent'}` }}>
                {id === 'errors' && <AlertTriangle className="w-3.5 h-3.5" style={{ color: alert ? '#dc2626' : undefined }} />}
                {label}
                <span className="text-[11px] font-bold px-1.5 rounded-full min-w-5 text-center"
                  style={{ background: alert ? '#dc2626' : 'var(--well)', color: alert ? '#fff' : 'var(--text-m)' }}>{n}</span>
              </button>
            )
          })}
        </div>

        {tab === 'orders' ? (
          <div className="fynn-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse min-w-[1000px]">
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--divide)' }}>
                    {COLS.map(([label, align], i) => (
                      <th key={i} className="fynn-th" style={{
                        textAlign: align === 'r' ? 'right' : align === 'c' ? 'center' : 'left',
                        paddingLeft: i === 0 ? 20 : undefined, paddingRight: i === COLS.length - 1 ? 20 : undefined,
                      }}>{label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {orders.length === 0 && (
                    <tr>
                      <td colSpan={COLS.length} className="py-14 text-center text-[13px]" style={{ color: 'var(--text-m)' }}>
                        Nog geen bestellingen. Zodra er op Etsy iets verkocht wordt, komt de bestelling hier binnen.
                      </td>
                    </tr>
                  )}
                  {orders.map((o) => {
                    const st = STATUS[o.status] || STATUS.new
                    const ful = o.status === 'fulfilled' && o.fulfillment_status === 'manual'
                      ? { color: '#10b981', label: 'Zelf afgehandeld' }
                      : FULFILLMENT[o.fulfillment_status] || FULFILLMENT.pending
                    return (
                      <tr key={o.id} className="transition-colors" style={{ borderBottom: '1px solid var(--divide)' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--row-hover)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                        <td className="py-[13px] px-5"><code className="text-[12.5px] font-semibold" style={{ color: 'var(--fyn-blue)' }}>{shortId(o)}</code></td>
                        <td className="py-[13px] px-3.5 text-[13px]" style={{ color: 'var(--text-h)' }}>{o.customer_name}</td>
                        <td className="py-[13px] px-3.5 text-[13px]" style={{ color: 'var(--text-b)' }}>{o.product_title}</td>
                        <td className="py-[13px] px-3.5 text-[13px] text-center" style={{ color: 'var(--text-m)' }}>{o.quantity}</td>
                        <td className="py-[13px] px-3.5 text-[13px] text-right font-semibold" style={{ color: 'var(--text-h)' }}>{euro(o.total_price || 0)}</td>
                        <td className="py-[13px] px-3.5 text-[13px] text-right font-bold" style={{ color: '#10b981' }}>
                          {o.cost != null || demo ? `+${euro(o.profit || 0)}` : <span style={{ color: 'var(--text-s)' }}>–</span>}
                        </td>
                        <td className="py-[13px] px-3.5">
                          <span className="fynn-pill" style={{ background: st.bg, color: st.color }}>
                            <st.icon className="w-[13px] h-[13px]" />{st.label}
                          </span>
                        </td>
                        <td className="py-[13px] px-3.5">
                          {o.fulfill_error ? (
                            <button onClick={() => setTab('errors')} className="inline-flex items-center gap-1.5 text-xs font-semibold cursor-pointer" style={{ color: '#dc2626' }}>
                              <AlertTriangle className="w-[13px] h-[13px]" />Fout, zie Fouten
                            </button>
                          ) : o.tracking_url ? (
                            <a href={o.tracking_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs font-semibold" style={{ color: ful.color }}>
                              <Truck className="w-[13px] h-[13px]" />{ful.label}<ExternalLink className="w-3 h-3" />
                            </a>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold" style={{ color: ful.color }}>
                              {o.fulfillment_status === 'shipped' && <Truck className="w-[13px] h-[13px]" />}
                              {ful.label}
                            </span>
                          )}
                        </td>
                        <td className="py-[13px] px-5 text-right whitespace-nowrap">
                          {!demo && !o.fulfill_error && o.fulfillment_status === 'draft' && (
                            <button className={smallBtn} style={{ background: 'var(--fyn-gradient)', color: '#fff' }}
                              disabled={busy === `${o.id}:confirm`} onClick={() => confirm(o)}>
                              <CheckCircle2 className="w-3.5 h-3.5" />Bevestigen
                            </button>
                          )}
                          {!demo && !o.fulfill_error && o.status === 'new' && o.fulfillment_status === 'manual' && (
                            <span className="inline-flex gap-1.5">
                              <button className={smallBtn} style={{ background: 'var(--well)', color: 'var(--text-b)', border: '1px solid var(--well-border)' }}
                                disabled={!!busy} onClick={() => orderAction(o, 'retry', 'Wordt via de app naar Printful gestuurd.')}>
                                Via de app sturen
                              </button>
                              <button className={smallBtn} style={{ background: 'var(--well)', color: 'var(--text-b)', border: '1px solid var(--well-border)' }}
                                disabled={!!busy} onClick={() => orderAction(o, 'handled', 'Gemarkeerd als zelf afgehandeld.')}>
                                Zelf gedaan
                              </button>
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {errorCount === 0 && (
              <div className="fynn-card py-14 text-center text-[13px]" style={{ color: 'var(--text-m)' }}>
                <CheckCircle2 className="w-6 h-6 mx-auto mb-2" style={{ color: '#10b981' }} />
                Geen fouten. Alles loopt.
              </div>
            )}
            {orderErrors.map(o => (
              <div key={o.id} className="fynn-card px-4 py-3.5" style={{ borderLeft: '3px solid #dc2626' }}>
                <div className="flex items-start gap-3 flex-wrap">
                  <div className="flex-1 min-w-[240px]">
                    <div className="text-[11px] font-bold uppercase tracking-[.04em]" style={{ color: 'var(--text-m)' }}>Bestelling {shortId(o)}</div>
                    <div className="text-[13.5px] font-semibold mt-0.5" style={{ color: 'var(--text-h)' }}>{o.customer_name} · {o.product_title}</div>
                    <p className="text-[12.5px] mt-1.5 mb-0" style={{ color: '#b91c1c' }}>{o.fulfill_error}</p>
                  </div>
                  <div className="flex gap-1.5">
                    <button className={smallBtn} style={{ background: 'var(--fyn-gradient)', color: '#fff' }} disabled={!!busy}
                      onClick={() => orderAction(o, 'retry', 'Opnieuw geprobeerd.')}>
                      <RefreshCw className={`w-3.5 h-3.5 ${busy === `${o.id}:retry` ? 'animate-spin' : ''}`} />Opnieuw proberen
                    </button>
                    <button className={smallBtn} style={{ background: 'var(--well)', color: 'var(--text-b)', border: '1px solid var(--well-border)' }} disabled={!!busy}
                      onClick={() => window.confirm('Heb je deze bestelling zelf in Printful gemaakt en op Etsy afgehandeld? De app doet er dan niets meer mee.') && orderAction(o, 'handled', 'Gemarkeerd als zelf afgehandeld.')}>
                      Zelf afgehandeld
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {failedProducts.map(p => (
              <div key={p.id} className="fynn-card px-4 py-3.5" style={{ borderLeft: '3px solid #d97706' }}>
                <div className="flex items-start gap-3 flex-wrap">
                  <div className="flex-1 min-w-[240px]">
                    <div className="text-[11px] font-bold uppercase tracking-[.04em]" style={{ color: 'var(--text-m)' }}>Product naar Etsy</div>
                    <div className="text-[13.5px] font-semibold mt-0.5" style={{ color: 'var(--text-h)' }}>{p.title}</div>
                    <p className="text-[12.5px] mt-1.5 mb-0" style={{ color: '#b91c1c' }}>{p.publish_error || 'Onbekende fout'}</p>
                  </div>
                  <div className="flex gap-1.5">
                    <button className={smallBtn} style={{ background: 'var(--fyn-gradient)', color: '#fff' }} disabled={!!busy}
                      onClick={() => run(`${p.id}:publish`, `/api/shops/${shopId}/products/${p.id}/publish`, undefined, 'Wordt opnieuw op Etsy gezet. Volg het bij Producten.')}>
                      <RefreshCw className="w-3.5 h-3.5" />Opnieuw proberen
                    </button>
                    <Link href={`/shops/${shopId}/products`} className={smallBtn}
                      style={{ background: 'var(--well)', color: 'var(--text-b)', border: '1px solid var(--well-border)' }}>
                      Naar Producten
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </PageBody>
    </>
  )
}
