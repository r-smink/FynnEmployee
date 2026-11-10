'use client'

import { use, useCallback, useEffect, useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { nl } from 'date-fns/locale'
import { Search, Loader2, Check, X, ChevronDown, ExternalLink, Pencil, Megaphone, Link2, Unlink } from 'lucide-react'
import { Topbar } from '@/components/layout/topbar'
import { PageBody } from '@/components/layout/app-shell'
import { parseDbDate } from '@/lib/revenue'
import type { SeoReview, ListingText } from '@/lib/seo'
import type { Promotion } from '@/lib/promote'

interface Data {
  agent: string | null
  etsy: boolean
  ai: boolean
  seo: { autoApply: boolean; reviews: SeoReview[]; checking: boolean }
  pinterest: {
    configured: boolean
    appId: string | null
    connected: boolean
    username: string | null
    enabled: boolean
    boardId: string | null
    boards: { id: string; name: string }[] | null
    dailyPins: number
    redirectUri: string
    promotions: Promotion[]
    pinning: boolean
  }
}

const ago = (value: string) => {
  try { return formatDistanceToNow(parseDbDate(value), { addSuffix: true, locale: nl }) } catch { return '' }
}

const smallBtn = 'h-[30px] px-3 rounded-lg text-xs font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1.5'
const ghost = { background: 'var(--well)', color: 'var(--text-b)', border: '1px solid var(--well-border)' }

const STATUS: Record<SeoReview['status'], { label: string; bg: string; color: string }> = {
  proposed: { label: 'Voorstel', bg: 'rgba(245,158,11,.15)', color: '#b45309' },
  applied: { label: 'Doorgevoerd', bg: 'rgba(16,185,129,.15)', color: '#059669' },
  ok: { label: 'In orde', bg: 'rgba(16,185,129,.15)', color: '#059669' },
  checked: { label: 'Gecontroleerd', bg: 'var(--well)', color: 'var(--text-m)' },
  rejected: { label: 'Afgewezen', bg: 'var(--well)', color: 'var(--text-s)' },
  failed: { label: 'Mislukt', bg: 'var(--fyn-danger-light)', color: '#b91c1c' },
}

function Score({ before, after }: { before: number; after: number | null }) {
  const tone = (s: number) => s >= 85 ? '#059669' : s >= 60 ? '#b45309' : '#b91c1c'
  return (
    <span className="text-[12px] font-bold tabular-nums flex-none" title="SEO-score van 0 tot 100">
      <span style={{ color: tone(before) }}>{before}</span>
      {after != null && <><span style={{ color: 'var(--text-s)' }}> → </span><span style={{ color: tone(after) }}>{after}</span></>}
    </span>
  )
}

function Toggle({ checked, onChange, disabled, label }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean; label: React.ReactNode }) {
  return (
    <label className="flex items-start gap-2.5 text-[12.5px] cursor-pointer" style={{ color: 'var(--text-b)' }}>
      <input type="checkbox" className="mt-0.5" checked={checked} disabled={disabled} onChange={e => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  )
}

function ReviewRow({ review, busy, onAction }: {
  review: SeoReview
  busy: boolean
  onAction: (action: string, extra?: Record<string, unknown>) => Promise<boolean>
}) {
  const [open, setOpen] = useState(review.status === 'proposed')
  const [editing, setEditing] = useState<ListingText | null>(null)
  const st = STATUS[review.status]
  const p = review.proposal

  const saveEdit = async () => {
    if (!editing) return
    if (await onAction('edit', { proposal: editing })) setEditing(null)
  }

  return (
    <div className="fynn-well px-3.5 py-3">
      <div className="flex items-start gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {review.current.image && <img src={review.current.image} alt="" className="w-11 h-11 rounded-lg object-cover flex-none" />}
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-semibold leading-[1.35] line-clamp-2" style={{ color: 'var(--text-h)' }}>{review.current.title}</div>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1 text-[11.5px]" style={{ color: 'var(--text-s)' }}>
            <span className="fynn-pill" style={{ background: st.bg, color: st.color }}>{st.label}</span>
            <Score before={review.score_before} after={review.score_after} />
            <span>{ago(review.applied_at || review.created_at)}</span>
            {review.listing_url && (
              <a href={review.listing_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:underline" style={{ color: 'var(--fyn-blue)' }}>
                Etsy <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>
        <button type="button" onClick={() => setOpen(!open)} aria-label={open ? 'Inklappen' : 'Details'} className="p-1 cursor-pointer flex-none" style={{ color: 'var(--text-s)' }}>
          <ChevronDown className="w-4 h-4 transition-transform" style={{ transform: open ? 'rotate(180deg)' : 'none' }} />
        </button>
      </div>

      {open && (
        <div className="mt-3 pt-3 text-[12px] leading-[1.5]" style={{ borderTop: '1px solid var(--divide)', color: 'var(--text-b)' }}>
          {review.error && <p className="px-3 py-2 rounded-lg mb-2.5" style={{ background: 'var(--fyn-danger-light)', color: '#b91c1c' }}>{review.error}</p>}
          {review.issues.length > 0 && (
            <ul className="m-0 mb-3 pl-4 space-y-0.5" style={{ color: 'var(--text-m)' }}>
              {review.issues.map(i => <li key={i}>{i}</li>)}
            </ul>
          )}

          {p && !editing && (
            <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))' }}>
              {[{ label: 'Nu', t: review.current }, { label: review.status === 'applied' ? 'Doorgevoerd' : 'Voorstel', t: p }].map(({ label, t }) => (
                <div key={label}>
                  <div className="text-[11px] font-bold uppercase tracking-[.05em] mb-1" style={{ color: 'var(--text-s)' }}>{label}</div>
                  <div className="font-semibold mb-1.5" style={{ color: 'var(--text-h)' }}>{t.title}</div>
                  <div className="flex flex-wrap gap-1 mb-1.5">
                    {t.tags.map(tag => <span key={tag} className="fynn-pill" style={{ background: 'var(--card)', color: 'var(--text-m)', border: '1px solid var(--well-border)' }}>{tag}</span>)}
                  </div>
                  <details>
                    <summary className="cursor-pointer" style={{ color: 'var(--text-m)' }}>Beschrijving</summary>
                    <div className="whitespace-pre-wrap mt-1.5 max-h-[260px] overflow-auto">{t.description}</div>
                  </details>
                </div>
              ))}
            </div>
          )}

          {editing && (
            <div className="space-y-2.5">
              <div>
                <label className="fynn-label">Titel ({editing.title.length}/140)</label>
                <input className="fynn-inp" maxLength={140} value={editing.title} onChange={e => setEditing({ ...editing, title: e.target.value })} />
              </div>
              <div>
                <label className="fynn-label">Tags, met komma&apos;s (max 13, elk max 20 tekens)</label>
                <input className="fynn-inp" value={editing.tags.join(', ')}
                  onChange={e => setEditing({ ...editing, tags: e.target.value.split(',').map(t => t.trimStart()) })} />
              </div>
              <div>
                <label className="fynn-label">Beschrijving</label>
                <textarea className="fynn-inp" rows={8} style={{ height: 'auto', paddingTop: 8, paddingBottom: 8 }} value={editing.description}
                  onChange={e => setEditing({ ...editing, description: e.target.value })} />
              </div>
            </div>
          )}

          {(review.status === 'proposed' || review.status === 'failed') && p && (
            <div className="flex flex-wrap gap-2 mt-3">
              {editing ? (
                <>
                  <button className={smallBtn} style={{ background: 'var(--fyn-gradient)', color: '#fff' }} disabled={busy} onClick={saveEdit}>
                    {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Opslaan
                  </button>
                  <button className={smallBtn} style={ghost} onClick={() => setEditing(null)}>Annuleren</button>
                </>
              ) : (
                <>
                  <button className={smallBtn} style={{ background: 'var(--fyn-gradient)', color: '#fff' }} disabled={busy} onClick={() => onAction('apply')}>
                    {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Doorvoeren op Etsy
                  </button>
                  <button className={smallBtn} style={ghost} disabled={busy} onClick={() => setEditing({ ...p, tags: [...p.tags] })}>
                    <Pencil className="w-3.5 h-3.5" /> Aanpassen
                  </button>
                  <button className={smallBtn} style={ghost} disabled={busy} onClick={() => onAction('reject')}>
                    <X className="w-3.5 h-3.5" /> Afwijzen
                  </button>
                </>
              )}
            </div>
          )}
          {(review.status === 'ok' || review.status === 'checked' || review.status === 'rejected' || review.status === 'applied') && (
            <button className={`${smallBtn} mt-3`} style={ghost} disabled={busy} onClick={() => onAction('check_now', { listingId: review.listing_id })}>
              <Search className="w-3.5 h-3.5" /> Opnieuw controleren
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default function MarketingPage({ params }: { params: Promise<{ shopId: string }> }) {
  const { shopId } = use(params)
  const [data, setData] = useState<Data | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [keys, setKeys] = useState({ appId: '', appSecret: '' })
  const [boards, setBoards] = useState<{ id: string; name: string }[] | null>(null)
  const [showAll, setShowAll] = useState(false)

  const load = useCallback((withBoards = false) =>
    fetch(`/api/shops/${shopId}/marketing${withBoards ? '?boards=1' : ''}`).then(r => r.json()).then((d: Data) => {
      setData(d)
      if (d.pinterest.boards) setBoards(d.pinterest.boards)
    }).catch(() => {}), [shopId])

  useEffect(() => {
    load(true)
    const interval = setInterval(() => load(), 6000)
    // Back from Pinterest
    const q = new URLSearchParams(window.location.search)
    if (q.get('pinterest_connected')) setNotice('Pinterest is gekoppeld.')
    if (q.get('pinterest_error')) setError(`Pinterest koppelen mislukte: ${q.get('pinterest_error')}`)
    if (q.size) window.history.replaceState(null, '', window.location.pathname)
    return () => clearInterval(interval)
  }, [load])

  const post = async (key: string, body: Record<string, unknown>): Promise<boolean> => {
    setBusy(key)
    setError(null)
    try {
      const res = await fetch(`/api/shops/${shopId}/marketing`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const r = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(r.error || 'Mislukt')
      await load(body.action === 'pinterest_keys')
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Mislukt')
      return false
    } finally {
      setBusy(null)
    }
  }

  const connectPinterest = async () => {
    setBusy('connect')
    setError(null)
    try {
      const res = await fetch(`/api/pinterest/auth?shopId=${encodeURIComponent(shopId)}`)
      const r = await res.json()
      if (!res.ok) throw new Error(r.error || 'Koppelen mislukt')
      window.location.href = r.url
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Koppelen mislukt')
      setBusy(null)
    }
  }

  if (!data) {
    return (
      <>
        <Topbar title="Marketing" subtitle="SEO van je listings en promotie op andere kanalen" />
        <PageBody><Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--text-s)' }} /></PageBody>
      </>
    )
  }

  const agent = data.agent ?? 'Milo'
  const pin = data.pinterest
  const reviews = data.seo.reviews
  const proposed = reviews.filter(r => r.status === 'proposed' || r.status === 'failed')
  const rest = reviews.filter(r => r.status !== 'proposed' && r.status !== 'failed')
  const avg = rest.length ? Math.round(rest.reduce((s, r) => s + (r.status === 'applied' ? r.score_after ?? r.score_before : r.score_before), 0) / rest.length) : null

  return (
    <>
      <Topbar title="Marketing" subtitle={`${agent} maakt je listings beter vindbaar en promoot ze op andere kanalen`} />
      <PageBody>
        {notice && <p className="text-[12.5px] px-3.5 py-2.5 rounded-lg mb-[18px]" style={{ background: 'rgba(16,185,129,.12)', color: '#059669' }}>{notice}</p>}
        {error && <p className="text-[12.5px] px-3.5 py-2.5 rounded-lg mb-[18px]" style={{ background: 'var(--fyn-danger-light)', color: '#b91c1c' }}>{error}</p>}
        {!data.agent && (
          <p className="text-[12.5px] px-3.5 py-2.5 rounded-lg mb-[18px]" style={{ background: 'var(--well)', color: 'var(--text-m)' }}>
            Deze shop heeft geen SEO & Marketing-agent.
          </p>
        )}

        {/* SEO */}
        <div className="fynn-card p-[22px] mb-[18px]">
          <div className="flex flex-wrap items-start justify-between gap-3 mb-1">
            <div className="flex items-center gap-[9px]">
              <Search className="w-[18px] h-[18px]" style={{ color: 'var(--fyn-purple)' }} />
              <h3 className="fynn-section-title">SEO van je listings</h3>
            </div>
            <button type="button" className="fynn-btn" style={{ height: 34, fontSize: 12.5 }}
              disabled={!data.etsy || !data.ai || data.seo.checking || busy === 'check'} onClick={() => post('check', { action: 'check_now' })}>
              {data.seo.checking || busy === 'check' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              {data.seo.checking ? `${agent} controleert...` : 'Volgende listing controleren'}
            </button>
          </div>
          <div className="fynn-hint mb-3">
            {agent} controleert al je Etsy-listings één voor één: titel, 13 tags, beschrijving, foto&apos;s, video en materialen.
            Waar het beter kan schrijft hij een nieuwe versie met de zoekwoorden die kopers nu gebruiken. Elke listing komt na 3 weken opnieuw aan de beurt.
            {avg != null && <> Gemiddelde score van gecontroleerde listings: <b>{avg}</b>.</>}
          </div>
          <div className="mb-3.5">
            <Toggle checked={data.seo.autoApply} disabled={busy === 'auto'}
              onChange={v => post('auto', { action: 'settings', seoAutoApply: v })}
              label={<>Verbeteringen <b>automatisch doorvoeren</b> op Etsy. Uit: je ziet eerst een voorstel en keurt het zelf goed.</>} />
          </div>
          {!data.etsy && <p className="text-xs px-3 py-2 rounded-lg mb-3" style={{ background: 'var(--well)', color: 'var(--text-m)' }}>Koppel je Etsy-shop bij Instellingen.</p>}
          {data.etsy && !data.ai && <p className="text-xs px-3 py-2 rounded-lg mb-3" style={{ background: 'var(--well)', color: 'var(--text-m)' }}>De SEO-check en voorstellen werken in AI Live.</p>}

          {reviews.length === 0 ? (
            <div className="text-[12.5px] py-2" style={{ color: 'var(--text-m)' }}>Nog geen listings gecontroleerd.</div>
          ) : (
            <div className="space-y-2">
              {proposed.map(r => (
                <ReviewRow key={r.id} review={r} busy={busy === r.id} onAction={(action, extra) => post(r.id, { action, id: r.id, ...extra })} />
              ))}
              {proposed.length > 0 && rest.length > 0 && (
                <div className="text-[11px] font-bold uppercase tracking-[.05em] pt-2" style={{ color: 'var(--text-s)' }}>Eerder gecontroleerd</div>
              )}
              {(showAll ? rest : rest.slice(0, 8)).map(r => (
                <ReviewRow key={r.id} review={r} busy={busy === r.id} onAction={(action, extra) => post(r.id, { action, id: r.id, ...extra })} />
              ))}
              {rest.length > 8 && (
                <button type="button" className="text-[12px] cursor-pointer hover:underline" style={{ color: 'var(--text-m)' }} onClick={() => setShowAll(!showAll)}>
                  {showAll ? 'Minder tonen' : `Alle ${rest.length} tonen`}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Pinterest */}
        <div className="fynn-card p-[22px] mb-[18px]">
          <div className="flex flex-wrap items-start justify-between gap-3 mb-1">
            <div className="flex items-center gap-[9px]">
              <Megaphone className="w-[18px] h-[18px]" style={{ color: 'var(--fyn-purple)' }} />
              <h3 className="fynn-section-title">Promoten op Pinterest</h3>
              {pin.connected && pin.username && <span className="fynn-pill" style={{ background: 'rgba(16,185,129,.15)', color: '#059669' }}>@{pin.username}</span>}
            </div>
            {pin.connected && (
              <button type="button" className="fynn-btn" style={{ height: 34, fontSize: 12.5 }}
                disabled={!pin.enabled || !data.ai || pin.pinning || busy === 'pin'} onClick={() => post('pin', { action: 'pin_now' })}>
                {pin.pinning || busy === 'pin' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Megaphone className="w-4 h-4" />}
                {pin.pinning ? `${agent} pint...` : 'Nu een pin plaatsen'}
              </button>
            )}
          </div>
          <div className="fynn-hint mb-3.5">
            {agent} zet je live listings één voor één op Pinterest, met een pin die naar de listing op Etsy linkt.
            Pinterest werkt als zoekmachine, dus pins blijven maanden bezoekers opleveren.
          </div>

          <div className="mb-3.5">
            <Toggle checked={pin.enabled} disabled={!pin.connected || busy === 'enable'}
              onChange={v => post('enable', { action: 'settings', pinterestEnabled: v })}
              label={<>Promoten op Pinterest <b>aan</b>{!pin.connected && ' (koppel eerst Pinterest)'}</>} />
          </div>

          {!pin.connected && (
            <div className="rounded-xl p-4" style={{ background: 'var(--well)', border: '1px solid var(--well-border)' }}>
              <ol className="text-[12px] leading-[1.55] m-0 mb-3 pl-4 space-y-1" style={{ color: 'var(--text-b)' }}>
                <li>Maak een gratis Pinterest-bedrijfsaccount.</li>
                <li>Maak een app op <a href="https://developers.pinterest.com/apps/" target="_blank" rel="noreferrer" className="underline" style={{ color: 'var(--fyn-blue)' }}>developers.pinterest.com/apps</a>.</li>
                <li>Zet bij de app deze Redirect URI: <code className="px-1 rounded" style={{ background: 'var(--card)' }}>{pin.redirectUri}</code></li>
                <li>Vul hieronder de App ID en het App secret in en klik op Koppelen.</li>
              </ol>
              <p className="text-[11.5px] m-0 mb-3" style={{ color: 'var(--text-m)' }}>
                Een nieuwe Pinterest-app heeft eerst &quot;Trial access&quot;. Vraag in de app &quot;Standard access&quot; aan, anders ziet alleen jij de pins.
              </p>
              {!pin.configured || keys.appId || keys.appSecret ? (
                <div className="grid gap-2.5 mb-3" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))' }}>
                  <div>
                    <label className="fynn-label">App ID</label>
                    <input className="fynn-inp" value={keys.appId} placeholder={pin.appId ?? ''} onChange={e => setKeys({ ...keys, appId: e.target.value })} />
                  </div>
                  <div>
                    <label className="fynn-label">App secret</label>
                    <input className="fynn-inp" type="password" value={keys.appSecret} onChange={e => setKeys({ ...keys, appSecret: e.target.value })} />
                  </div>
                </div>
              ) : (
                <p className="text-[12px] m-0 mb-3" style={{ color: 'var(--text-m)' }}>
                  App ID {pin.appId} is ingevuld. <button type="button" className="underline cursor-pointer" onClick={() => setKeys({ appId: pin.appId ?? '', appSecret: '' })}>Wijzigen</button>
                </p>
              )}
              <button type="button" className="fynn-btn" style={{ height: 34, fontSize: 12.5 }}
                disabled={busy === 'keys' || busy === 'connect' || (!pin.configured && (!keys.appId.trim() || !keys.appSecret.trim()))}
                onClick={async () => {
                  if (keys.appId.trim() || keys.appSecret.trim()) {
                    if (!await post('keys', { action: 'pinterest_keys', appId: keys.appId, appSecret: keys.appSecret })) return
                    setKeys({ appId: '', appSecret: '' })
                  }
                  connectPinterest()
                }}>
                {busy === 'connect' || busy === 'keys' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />} Koppelen met Pinterest
              </button>
            </div>
          )}

          {pin.connected && (
            <>
              <div className="flex flex-wrap items-end gap-3 mb-3.5">
                <div>
                  <label className="fynn-label">Bord</label>
                  <select className="fynn-inp" style={{ width: 'auto', minWidth: 200 }} value={pin.boardId ?? ''}
                    onChange={e => post('board', { action: 'settings', boardId: e.target.value })}>
                    <option value="">Automatisch (bord met de naam van je shop)</option>
                    {(boards ?? []).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="fynn-label">Pins per dag</label>
                  <select className="fynn-inp" style={{ width: 'auto' }} value={pin.dailyPins}
                    onChange={e => post('daily', { action: 'settings', dailyPins: Number(e.target.value) })}>
                    {[1, 2, 3, 5, 8, 10].map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
                <button type="button" className={smallBtn} style={ghost} disabled={busy === 'disconnect'}
                  onClick={() => post('disconnect', { action: 'pinterest_disconnect' })}>
                  <Unlink className="w-3.5 h-3.5" /> Ontkoppelen
                </button>
              </div>

              {pin.promotions.length === 0 ? (
                <div className="text-[12.5px]" style={{ color: 'var(--text-m)' }}>Nog geen pins geplaatst.</div>
              ) : (
                <div className="space-y-1.5">
                  {pin.promotions.map(p => (
                    <div key={p.id} className="fynn-well px-3 py-2 flex items-start gap-2.5 text-[12.5px]">
                      {p.status === 'posted'
                        ? <Check className="w-4 h-4 flex-none mt-0.5" style={{ color: '#059669' }} />
                        : <X className="w-4 h-4 flex-none mt-0.5" style={{ color: '#dc2626' }} />}
                      <div className="flex-1 min-w-0">
                        <div className="truncate" style={{ color: 'var(--text-b)' }}>{p.title}</div>
                        {p.error && <div className="text-[11.5px] mt-0.5" style={{ color: '#b91c1c' }}>{p.error}</div>}
                      </div>
                      <span className="text-[11.5px] flex-none" style={{ color: 'var(--text-s)' }}>{ago(p.created_at)}</span>
                      {p.external_url && (
                        <a href={p.external_url} target="_blank" rel="noreferrer" aria-label="Bekijk op Pinterest" className="flex-none" style={{ color: 'var(--fyn-blue)' }}>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </PageBody>
    </>
  )
}
