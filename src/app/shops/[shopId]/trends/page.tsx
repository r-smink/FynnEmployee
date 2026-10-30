'use client'

import { use, useEffect, useState } from 'react'
import { Search, TrendingUp, Tag, Coins, Flame, Bookmark, X, Loader2, ExternalLink, Info, Table2, BarChart3 } from 'lucide-react'
import { Topbar } from '@/components/layout/topbar'
import { PageBody } from '@/components/layout/app-shell'
import type { TrendReport, PriceBucket, TagStat } from '@/lib/trends'

const nf = new Intl.NumberFormat('nl-NL')
const money = (v: number, currency: string, digits = 2) =>
  new Intl.NumberFormat('nl-NL', { style: 'currency', currency, maximumFractionDigits: digits, minimumFractionDigits: digits === 0 ? 0 : 2 }).format(v)

function StatTile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="fynn-card px-5 py-4">
      <div className="text-[11.5px] font-semibold uppercase tracking-[.05em]" style={{ color: 'var(--text-s)' }}>{label}</div>
      <div className="text-[24px] font-semibold mt-1 tracking-[-.01em]" style={{ color: 'var(--text-h)' }}>{value}</div>
      {sub && <div className="text-[11.5px] mt-0.5" style={{ color: 'var(--text-m)' }}>{sub}</div>}
    </div>
  )
}

function CardHead({ icon: Icon, title, hint, children }: { icon: typeof Tag; title: string; hint?: string; children?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 mb-4">
      <div>
        <div className="flex items-center gap-[9px]">
          <Icon className="w-[18px] h-[18px]" style={{ color: 'var(--fyn-purple)' }} />
          <h3 className="fynn-section-title">{title}</h3>
        </div>
        {hint && <div className="text-[11.5px] mt-1" style={{ color: 'var(--text-m)' }}>{hint}</div>}
      </div>
      {children}
    </div>
  )
}

// Ranked tag list: bar length = number of listings using the tag
function TagBars({ tags, onPick }: { tags: TagStat[]; onPick: (tag: string) => void }) {
  const max = Math.max(1, ...tags.map(t => t.listings))
  return (
    <div>
      {tags.map(t => (
        <button key={t.tag} type="button" onClick={() => onPick(t.tag)}
          title={`${t.tag}: ${t.listings} listings · gem. ${nf.format(t.avgFavorites)} favorieten — klik om hierop te zoeken`}
          className="group w-full grid items-center gap-3 py-[5px] text-left cursor-pointer rounded-md"
          style={{ gridTemplateColumns: 'minmax(90px,150px) 1fr 44px' }}>
          <span className="text-[12.5px] truncate group-hover:underline" style={{ color: 'var(--text-b)' }}>{t.tag}</span>
          <span className="h-3 rounded-r-[4px] transition-opacity group-hover:opacity-80"
            style={{ width: `${(t.listings / max) * 100}%`, background: 'var(--chart-1)', minWidth: 3 }} />
          <span className="text-[12px] text-right tabular-nums" style={{ color: 'var(--text-m)' }}>{t.listings}</span>
        </button>
      ))}
    </div>
  )
}

function PriceHistogram({ buckets, currency, median }: { buckets: PriceBucket[]; currency: string; median?: number }) {
  const [hover, setHover] = useState<number | null>(null)
  const W = 520, H = 200, padL = 34, padB = 26, padT = 10
  const max = Math.max(1, ...buckets.map(b => b.listings))
  const slot = (W - padL) / Math.max(1, buckets.length)
  const barW = Math.min(24, slot - 2)
  const y = (v: number) => padT + (H - padT - padB) * (1 - v / max)
  const ticks = [0, Math.round(max / 2), max]
  const label = (b: PriceBucket) => `${money(b.from, currency, 0)}–${money(b.to, currency, 0)}`
  const h = hover !== null ? buckets[hover] : null

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto block" role="img"
        aria-label={`Prijsverdeling: ${buckets.map(b => `${label(b)} ${b.listings} listings`).join(', ')}`}>
        {ticks.map(t => (
          <g key={t}>
            <line x1={padL} x2={W} y1={y(t)} y2={y(t)} style={{ stroke: 'var(--divide)' }} strokeWidth={1} />
            <text x={padL - 6} y={y(t) + 4} textAnchor="end" fontSize={10} style={{ fill: 'var(--text-s)' }}>{t}</text>
          </g>
        ))}
        {buckets.map((b, i) => {
          const x = padL + i * slot + (slot - barW) / 2
          const top = y(b.listings), base = y(0)
          const r = Math.min(4, base - top)
          return (
            <g key={i} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              {/* hit target is the whole slot, larger than the mark */}
              <rect x={padL + i * slot} y={padT} width={slot} height={base - padT} fill="transparent" />
              {b.listings > 0 && (
                <path d={`M${x},${base} V${top + r} Q${x},${top} ${x + r},${top} H${x + barW - r} Q${x + barW},${top} ${x + barW},${top + r} V${base} Z`}
                  style={{ fill: 'var(--chart-1)' }} opacity={hover === null || hover === i ? 1 : 0.45} />
              )}
              {(i % Math.ceil(buckets.length / 5) === 0) && (
                <text x={padL + i * slot + slot / 2} y={H - 8} textAnchor="middle" fontSize={10} style={{ fill: 'var(--text-s)' }}>
                  {money(b.from, currency, 0)}
                </text>
              )}
            </g>
          )
        })}
        <line x1={padL} x2={W} y1={y(0)} y2={y(0)} style={{ stroke: 'var(--text-s)' }} strokeOpacity={0.5} strokeWidth={1} />
      </svg>
      {h && hover !== null && (
        <div className="absolute pointer-events-none px-2.5 py-1.5 rounded-lg text-[11.5px] whitespace-nowrap"
          style={{ left: `${((padL + hover * slot + slot / 2) / W) * 100}%`, top: 0, transform: 'translateX(-50%)', background: 'var(--card)', border: '1px solid var(--card-border)', boxShadow: '0 6px 18px rgba(0,0,0,.16)', color: 'var(--text-b)' }}>
          <b style={{ color: 'var(--text-h)' }}>{label(h)}</b> · {h.listings} listings
        </div>
      )}
      {median !== undefined && (
        <div className="text-[11.5px] mt-1" style={{ color: 'var(--text-m)' }}>Mediaanprijs {money(median, currency)}</div>
      )}
    </div>
  )
}

export default function TrendsPage({ params }: { params: Promise<{ shopId: string }> }) {
  const { shopId } = use(params)
  const [input, setInput] = useState('')
  const [keywords, setKeywords] = useState<string[]>([])
  const [report, setReport] = useState<TrendReport | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [priceTable, setPriceTable] = useState(false)

  useEffect(() => {
    fetch(`/api/shops/${shopId}/trends`).then(r => r.json()).then(d => {
      const saved: string[] = d.keywords || []
      setKeywords(saved)
      if (saved[0]) search(saved[0])
    }).catch(() => {})
  }, [shopId])

  const search = async (q: string) => {
    const query = q.trim()
    if (!query) return
    setInput(query)
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/shops/${shopId}/trends?q=${encodeURIComponent(query)}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
      setReport(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Zoeken mislukt')
    }
    setLoading(false)
  }

  const saveKeywords = async (next: string[]) => {
    setKeywords(next)
    const res = await fetch(`/api/shops/${shopId}/trends`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ keywords: next }),
    }).catch(() => null)
    if (res?.ok) setKeywords((await res.json()).keywords)
  }

  const current = report?.query.toLowerCase()
  const isSaved = !!current && keywords.includes(current)

  return (
    <>
      <Topbar title="Markttrends" subtitle="Wat er op Etsy populair is: tags, prijzen en snelstijgende listings" />
      <PageBody>
        <div className="fynn-card p-[18px] mb-[18px]">
          <form className="flex flex-wrap gap-2.5" onSubmit={e => { e.preventDefault(); search(input) }}>
            <div className="relative flex-1 min-w-[240px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-s)' }} />
              <input className="fynn-inp" style={{ paddingLeft: 34 }} value={input} onChange={e => setInput(e.target.value)}
                placeholder="Zoekwoord of niche, bijv. 'minimalist poster' of 'dog mom shirt'" />
            </div>
            <button className="fynn-btn" type="submit" disabled={loading || !input.trim()}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <TrendingUp className="w-4 h-4" />} Analyseren
            </button>
            {report && (
              <button type="button" className="fynn-btn-ghost" onClick={() => saveKeywords(isSaved ? keywords.filter(k => k !== current) : [...keywords, current!])}>
                <Bookmark className="w-4 h-4" fill={isSaved ? 'currentColor' : 'none'} /> {isSaved ? 'Bewaard' : 'Bewaar zoekwoord'}
              </button>
            )}
          </form>
          {keywords.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {keywords.map(k => (
                <span key={k} className="inline-flex items-center rounded-full text-[11.5px] font-semibold"
                  style={{ background: k === current ? 'rgba(143,57,172,.18)' : 'var(--well)', border: '1px solid var(--well-border)', color: k === current ? 'var(--fyn-purple)' : 'var(--text-m)' }}>
                  <button type="button" className="pl-2.5 pr-1 py-1 cursor-pointer" onClick={() => search(k)}>{k}</button>
                  <button type="button" className="pr-2 py-1 cursor-pointer opacity-60 hover:opacity-100" aria-label={`${k} verwijderen`}
                    onClick={() => saveKeywords(keywords.filter(x => x !== k))}><X className="w-3 h-3" /></button>
                </span>
              ))}
            </div>
          )}
        </div>

        {error && <p className="text-[12.5px] px-3.5 py-2.5 rounded-lg mb-[18px]" style={{ background: 'var(--fyn-danger-light)', color: '#b91c1c' }}>{error}</p>}

        {!report && !loading && !error && (
          <div className="fynn-card py-16 text-center">
            <TrendingUp className="w-8 h-8 mx-auto mb-3" style={{ color: 'var(--fyn-purple)' }} />
            <div className="text-[14px] font-semibold" style={{ color: 'var(--text-h)' }}>Onderzoek een niche</div>
            <p className="text-[12.5px] mt-1 max-w-[460px] mx-auto" style={{ color: 'var(--text-m)' }}>
              Typ een zoekwoord zoals klanten dat op Etsy doen. Je ziet de meest gebruikte tags, de prijsverdeling en welke listings het snelst favorieten verzamelen.
            </p>
          </div>
        )}

        {report && (
          <div style={{ opacity: loading ? 0.5 : 1, transition: 'opacity .2s' }}>
            <div className="flex items-start gap-2 text-[12px] px-3.5 py-2.5 rounded-lg mb-[18px]"
              style={report.source === 'demo'
                ? { background: 'rgba(217,119,6,.12)', color: '#b45309' }
                : { background: 'var(--well)', color: 'var(--text-m)' }}>
              <Info className="w-4 h-4 flex-none mt-px" />
              <span>
                {report.notice ?? `Live van Etsy: steekproef van de ${report.sampleSize} meest relevante actieve listings voor "${report.query}".`}
                {' '}Etsy deelt geen verkoopaantallen van andere winkels; favorieten en views zijn de populariteitsmaat.
              </span>
            </div>

            <div className="grid gap-4 mb-[18px]" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))' }}>
              <StatTile label="Resultaten op Etsy" value={nf.format(report.totalResults)} sub="actieve listings voor dit zoekwoord" />
              <StatTile label="Mediaanprijs" value={report.price ? money(report.price.median, report.currency) : '—'}
                sub={report.price ? `middelste helft ${money(report.price.p25, report.currency)} – ${money(report.price.p75, report.currency)}` : undefined} />
              <StatTile label="Gem. favorieten" value={nf.format(report.avgFavorites)} sub="per listing in de steekproef" />
              <StatTile label="Gem. views" value={nf.format(report.avgViews)} sub="per listing in de steekproef" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-[18px]">
              <div className="fynn-card p-[22px]">
                <CardHead icon={Tag} title="Populairste tags" hint="Aantal listings in de steekproef dat de tag gebruikt. Klik op een tag om erop te zoeken." />
                {report.tags.length ? <TagBars tags={report.tags} onPick={search} />
                  : <div className="text-xs" style={{ color: 'var(--text-s)' }}>Geen tags gevonden</div>}
              </div>
              <div className="fynn-card p-[22px]">
                <CardHead icon={Coins} title="Prijsverdeling" hint={`Aantal listings per prijsklasse (${report.currency}), zonder de 5% uitschieters aan beide kanten.`}>
                  <button type="button" className="fynn-zoom-btn" onClick={() => setPriceTable(t => !t)} title={priceTable ? 'Grafiek' : 'Tabel'}
                    aria-label={priceTable ? 'Toon grafiek' : 'Toon tabel'}>
                    {priceTable ? <BarChart3 className="w-4 h-4" /> : <Table2 className="w-4 h-4" />}
                  </button>
                </CardHead>
                {report.priceBuckets.length === 0 ? <div className="text-xs" style={{ color: 'var(--text-s)' }}>Te weinig prijzen</div>
                  : priceTable ? (
                    <table className="w-full text-[12.5px]">
                      <thead><tr style={{ color: 'var(--text-s)' }}><th className="text-left font-semibold pb-1.5">Prijsklasse</th><th className="text-right font-semibold pb-1.5">Listings</th></tr></thead>
                      <tbody>
                        {report.priceBuckets.map((b, i) => (
                          <tr key={i} style={{ borderTop: '1px solid var(--divide)', color: 'var(--text-b)' }}>
                            <td className="py-1.5">{money(b.from, report.currency, 0)} – {money(b.to, report.currency, 0)}</td>
                            <td className="py-1.5 text-right tabular-nums">{b.listings}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : <PriceHistogram buckets={report.priceBuckets} currency={report.currency} median={report.price?.median} />}
              </div>
            </div>

            <div className="fynn-card p-[22px]">
              <CardHead icon={Flame} title="Snelst stijgende listings" hint="Gesorteerd op favorieten per dag sinds publicatie: wat nu aanslaat, niet alleen wat al jaren bestaat." />
              <div className="overflow-x-auto">
                <table className="w-full text-[12.5px]" style={{ minWidth: 640 }}>
                  <thead>
                    <tr className="text-left" style={{ color: 'var(--text-s)' }}>
                      <th className="font-semibold pb-2">Listing</th>
                      <th className="font-semibold pb-2 text-right">Prijs</th>
                      <th className="font-semibold pb-2 text-right">Favorieten</th>
                      <th className="font-semibold pb-2 text-right">Views</th>
                      <th className="font-semibold pb-2 text-right">Fav. / dag</th>
                      <th className="font-semibold pb-2 text-right">Leeftijd</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.hot.map(l => (
                      <tr key={l.id} style={{ borderTop: '1px solid var(--divide)', color: 'var(--text-b)' }}>
                        <td className="py-2 pr-3">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-10 h-8 rounded-md flex-none overflow-hidden" style={{ background: 'var(--well)' }}>
                              {l.image && <img src={l.image} alt="" className="w-full h-full object-cover" loading="lazy" />}
                            </div>
                            {report.source === 'etsy' ? (
                              <a href={l.url} target="_blank" rel="noopener noreferrer" className="truncate max-w-[340px] inline-flex items-center gap-1" title={l.title}>
                                <span className="truncate">{l.title}</span><ExternalLink className="w-3 h-3 flex-none" />
                              </a>
                            ) : <span className="truncate max-w-[340px]" title={l.title}>{l.title}</span>}
                          </div>
                        </td>
                        <td className="py-2 text-right tabular-nums">{money(l.price, report.currency)}</td>
                        <td className="py-2 text-right tabular-nums">{nf.format(l.favorites)}</td>
                        <td className="py-2 text-right tabular-nums">{nf.format(l.views)}</td>
                        <td className="py-2 text-right tabular-nums font-semibold" style={{ color: 'var(--text-h)' }}>{l.favoritesPerDay.toLocaleString('nl-NL')}</td>
                        <td className="py-2 text-right tabular-nums" style={{ color: 'var(--text-m)' }}>{l.ageDays} d</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </PageBody>
    </>
  )
}
