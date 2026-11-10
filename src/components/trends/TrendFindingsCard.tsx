'use client'

import { useCallback, useEffect, useState } from 'react'
import { Sparkles, Loader2, Plus, X, Search, RotateCcw, ChevronDown, Check } from 'lucide-react'
import type { TrendFinding } from '@/lib/trend-discovery'

interface Data {
  findings: TrendFinding[]
  autoAdd: boolean
  autoAddScore: number
  etsy: boolean
  searching: boolean
  agent: string
}

const nf = new Intl.NumberFormat('nl-NL')

function ScorePill({ score }: { score: number }) {
  const [bg, color] = score >= 65 ? ['rgba(16,185,129,.15)', '#059669'] : score >= 45 ? ['rgba(245,158,11,.15)', '#b45309'] : ['var(--well)', 'var(--text-m)']
  return <span className="fynn-pill flex-none tabular-nums" style={{ background: bg, color }} title="Kansscore: vraag tegenover concurrentie">{score}</span>
}

// Niches Nova found on Etsy by herself. The owner adds them as a theme for Luna, or lets strong ones go there automatically.
export function TrendFindingsCard({ shopId, onSearch, onThemesChanged }: {
  shopId: string
  onSearch: (query: string) => void
  onThemesChanged: () => void
}) {
  const [data, setData] = useState<Data | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState<string | null>(null)
  const [showIgnored, setShowIgnored] = useState(false)

  const load = useCallback(() => fetch(`/api/shops/${shopId}/trends/findings`).then(r => r.json()).then(setData).catch(() => {}), [shopId])

  useEffect(() => {
    load()
  }, [load])

  // While Nova is searching, follow along
  useEffect(() => {
    if (!data?.searching) return
    const interval = setInterval(load, 4000)
    return () => clearInterval(interval)
  }, [data?.searching, load])

  const post = async (key: string, body: Record<string, unknown>) => {
    setBusy(key)
    setError(null)
    try {
      const res = await fetch(`/api/shops/${shopId}/trends/findings`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      })
      const r = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(r.error || 'Mislukt')
      if (body.action === 'add') onThemesChanged()
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Mislukt')
    }
    setBusy(null)
  }

  if (!data) return null
  const agent = data.agent
  const active = data.findings.filter(f => f.status !== 'ignored')
  const ignored = data.findings.filter(f => f.status === 'ignored')
  const list = showIgnored ? [...active, ...ignored] : active

  return (
    <div className="fynn-card p-[22px] mb-[18px]">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-1">
        <div className="flex items-center gap-[9px]">
          <Sparkles className="w-[18px] h-[18px]" style={{ color: 'var(--fyn-purple)' }} />
          <h3 className="fynn-section-title">Ontdekt door {agent}</h3>
        </div>
        <button type="button" className="fynn-btn" style={{ height: 34, fontSize: 12.5 }}
          disabled={!data.etsy || data.searching || busy === 'discover'} onClick={() => post('discover', { action: 'discover' })}>
          {data.searching || busy === 'discover' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          {data.searching ? `${agent} zoekt...` : 'Nu laten zoeken'}
        </button>
      </div>
      <div className="fynn-hint mb-3">
        {agent} zoekt zelf op Etsy naar niches waarin nieuwe listings snel favorieten krijgen, vanuit je thema&apos;s en eigen ideeën.
        De score zet die vraag af tegen het aantal listings: hoe hoger, hoe meer kans.
      </div>

      <label className="flex items-center gap-2.5 text-[12.5px] mb-3.5 cursor-pointer" style={{ color: 'var(--text-b)' }}>
        <input type="checkbox" checked={data.autoAdd} disabled={busy === 'auto'}
          onChange={e => post('auto', { action: 'auto_add', enabled: e.target.checked })} />
        Sterke trends (score {data.autoAddScore}+) automatisch als thema aan Luna geven
      </label>

      {!data.etsy && (
        <p className="text-xs px-3 py-2 rounded-lg mb-3" style={{ background: 'var(--well)', color: 'var(--text-m)' }}>
          Vul je Etsy API-sleutel in bij Instellingen, dan kan {agent} zelf gaan zoeken.
        </p>
      )}
      {error && <p className="text-xs px-3 py-2 rounded-lg mb-3" style={{ background: 'var(--fyn-danger-light)', color: '#b91c1c' }}>{error}</p>}

      {list.length === 0 ? (
        <div className="text-[12.5px] py-2" style={{ color: 'var(--text-m)' }}>
          {data.etsy ? `${agent} heeft nog niets gevonden. Ze zoekt vanzelf in AI Live, of klik op Nu laten zoeken.` : 'Nog geen trends.'}
        </div>
      ) : (
        <div className="space-y-1.5">
          {list.map(f => {
            const expanded = open === f.id
            const dim = f.status === 'ignored'
            return (
              <div key={f.id} className="fynn-well px-3 py-2.5" style={{ opacity: dim ? 0.6 : 1 }}>
                <div className="flex items-start gap-2.5">
                  <ScorePill score={f.score} />
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-x-2">
                      <span className="text-[13px] font-semibold" style={{ color: 'var(--text-h)' }}>{f.theme_name ?? f.keyword}</span>
                      <button type="button" className="text-[11.5px] hover:underline cursor-pointer" style={{ color: 'var(--fyn-blue)' }}
                        onClick={() => onSearch(f.keyword)} title="Bekijk de marktcijfers hieronder">&quot;{f.keyword}&quot;</button>
                      {f.status === 'added' && <span className="fynn-pill" style={{ background: 'rgba(16,185,129,.15)', color: '#059669' }}>Thema voor Luna</span>}
                    </div>
                    <div className="text-[11.5px] mt-0.5" style={{ color: 'var(--text-m)' }}>
                      {nf.format(f.demand)} favorieten/dag · {nf.format(f.competition)} listings
                      {f.median_price != null && f.currency && ` · mediaan ${new Intl.NumberFormat('nl-NL', { style: 'currency', currency: f.currency }).format(f.median_price)}`}
                    </div>
                    {f.reason && <p className="text-[12px] leading-[1.45] mt-1 mb-0" style={{ color: 'var(--text-b)' }}>{f.reason}</p>}
                  </div>
                  <div className="flex items-center gap-1 flex-none">
                    {f.status === 'new' && (
                      <button type="button" className="fynn-btn-ghost" style={{ height: 30, fontSize: 12 }} disabled={!!busy}
                        onClick={() => post(f.id, { action: 'add', id: f.id })}>
                        {busy === f.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />} Thema
                      </button>
                    )}
                    {f.status === 'added' && <Check className="w-4 h-4" style={{ color: '#059669' }} />}
                    {f.status === 'new' && (
                      <button type="button" title="Negeren" aria-label="Negeren" className="p-1 cursor-pointer" style={{ color: 'var(--text-s)' }}
                        disabled={!!busy} onClick={() => post(f.id, { action: 'ignore', id: f.id })}><X className="w-4 h-4" /></button>
                    )}
                    {f.status === 'ignored' && (
                      <button type="button" title="Terugzetten" aria-label="Terugzetten" className="p-1 cursor-pointer" style={{ color: 'var(--text-s)' }}
                        disabled={!!busy} onClick={() => post(f.id, { action: 'restore', id: f.id })}><RotateCcw className="w-4 h-4" /></button>
                    )}
                    <button type="button" title={expanded ? 'Inklappen' : 'Details'} aria-label={expanded ? 'Inklappen' : 'Details'}
                      className="p-1 cursor-pointer" style={{ color: 'var(--text-s)' }} onClick={() => setOpen(expanded ? null : f.id)}>
                      <ChevronDown className="w-4 h-4 transition-transform" style={{ transform: expanded ? 'rotate(180deg)' : 'none' }} />
                    </button>
                  </div>
                </div>
                {expanded && (
                  <div className="mt-2.5 pt-2.5 text-[12px]" style={{ borderTop: '1px solid var(--divide)', color: 'var(--text-b)' }}>
                    {f.found_via && <div className="mb-1.5" style={{ color: 'var(--text-m)' }}>Gevonden via &quot;{f.found_via}&quot;</div>}
                    {f.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {f.tags.map(t => <span key={t} className="fynn-pill" style={{ background: 'var(--well)', color: 'var(--text-m)' }}>{t}</span>)}
                      </div>
                    )}
                    {f.examples.map(e => (
                      <a key={e.url} href={e.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 py-1 hover:underline" style={{ color: 'var(--text-b)' }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        {e.image && <img src={e.image} alt="" className="w-9 h-9 rounded object-cover flex-none" />}
                        <span className="truncate flex-1">{e.title}</span>
                        <span className="flex-none tabular-nums" style={{ color: 'var(--text-m)' }}>{e.favoritesPerDay}/dag</span>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
      {ignored.length > 0 && (
        <button type="button" className="text-[12px] mt-2.5 cursor-pointer hover:underline" style={{ color: 'var(--text-m)' }}
          onClick={() => setShowIgnored(!showIgnored)}>
          {showIgnored ? 'Genegeerde verbergen' : `${ignored.length} genegeerd tonen`}
        </button>
      )}
    </div>
  )
}
