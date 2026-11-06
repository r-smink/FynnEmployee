'use client'

import { use, useEffect, useState } from 'react'
import { AreaChart, BarChart3, Users } from 'lucide-react'
import { Topbar } from '@/components/layout/topbar'
import { PageBody } from '@/components/layout/app-shell'
import { useAgents } from '@/hooks/use-agents'
import { euroWhole } from '@/lib/labels'
import { useAiMode, SETTINGS_CHANGED_EVENT } from '@/hooks/use-ai-mode'
import { DemoNotice } from '@/components/layout/demo-notice'
import { lastSevenDays, type OrderLike } from '@/lib/revenue'

const DEMO_REVENUE = [420, 580, 340, 720, 890, 1150, 780]
const DEMO_DAYS = ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo']
const DEMO_PREVIOUS = 4136 // makes the demo week show +18%

const DEMO_TOP: [string, number][] = [
  ['Galaxy Stickers', 89], ['Ocean Mug', 58], ['Sunset Tee', 47], ['Space Poster', 41], ['Mountain Tote', 32], ['Mandala Case', 23],
]

function revenuePaths(revenue: number[]) {
  // With no revenue yet the line sits flat on the bottom instead of dividing by zero
  const W = 900, H = 230, pad = 14, max = Math.max(1, ...revenue) * 1.05
  const pts = revenue.map((v, i) => ({ x: (i / (revenue.length - 1)) * (W - pad * 2) + pad, y: H - pad - (v / max) * (H - pad * 2) }))
  const line = 'M' + pts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' L')
  const area = `${line} L${pts[pts.length - 1].x.toFixed(1)},${H} L${pts[0].x.toFixed(1)},${H} Z`
  return { line, area, pts }
}

export default function AnalyticsPage({ params }: { params: Promise<{ shopId: string }> }) {
  const { shopId } = use(params)
  const { agents } = useAgents(shopId)
  const { showDemoData } = useAiMode()
  const [realTop, setRealTop] = useState<[string, number][]>([])
  const [orders, setOrders] = useState<OrderLike[]>([])

  useEffect(() => {
    const load = () => {
      fetch(`/api/shops/${shopId}/products`).then(r => r.json()).then((data: { title: string; sales_count: number }[]) => {
        if (!Array.isArray(data)) return
        const sold = data.filter(p => p.sales_count > 0).sort((a, b) => b.sales_count - a.sales_count).slice(0, 6)
        setRealTop(sold.map(p => [p.title, p.sales_count]))
      }).catch(() => {})
      fetch(`/api/shops/${shopId}/orders`).then(r => r.json()).then(data => {
        if (Array.isArray(data)) setOrders(data)
      }).catch(() => {})
    }
    load()
    window.addEventListener(SETTINGS_CHANGED_EVENT, load)
    return () => window.removeEventListener(SETTINGS_CHANGED_EVENT, load)
  }, [shopId])

  // Example figures only in demo mode while there are no real orders
  const demo = showDemoData && orders.length === 0
  const week = lastSevenDays(orders)
  const REVENUE = demo ? DEMO_REVENUE : week.values
  const DAYS = demo ? DEMO_DAYS : week.labels
  const previous = demo ? DEMO_PREVIOUS : week.previous
  const top = demo ? DEMO_TOP : realTop

  const { line, area, pts } = revenuePaths(REVENUE)
  const total = REVENUE.reduce((a, b) => a + b, 0)
  const change = previous > 0 ? Math.round((total - previous) / previous * 100) : null
  const topMax = Math.max(1, ...top.map(t => t[1]))
  const agentMax = Math.max(1, ...agents.map(a => a.tasks_completed))

  return (
    <>
      <Topbar title="Analytics" subtitle="Overzicht van je winkelprestaties" />
      <PageBody>
        {demo && <DemoNotice />}
        <div className="fynn-card px-6 py-[22px] mb-[18px]">
          <div className="flex items-center justify-between mb-[18px]">
            <div className="flex items-center gap-[9px]">
              <AreaChart className="w-[18px] h-[18px]" style={{ color: 'var(--fyn-purple)' }} />
              <h3 className="m-0 text-base font-bold" style={{ color: 'var(--text-h)' }}>Omzet deze week</h3>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-[22px] font-bold" style={{ color: 'var(--text-h)' }}>{euroWhole(total)}</span>
              {change !== null && (
                <span className="px-2 py-0.5 rounded-md text-xs font-bold"
                  style={change >= 0 ? { background: 'var(--fyn-success-light)', color: '#047857' } : { background: 'var(--fyn-danger-light)', color: '#b91c1c' }}>
                  {change >= 0 ? '+' : ''}{change}%
                </span>
              )}
            </div>
          </div>
          <svg viewBox="0 0 900 230" preserveAspectRatio="none" className="w-full h-[220px]">
            <defs>
              <linearGradient id="fn-rev" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#8F39AC" stopOpacity=".3" /><stop offset="1" stopColor="#8F39AC" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="fn-line" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0" stopColor="#8F39AC" /><stop offset="1" stopColor="#379FD3" />
              </linearGradient>
            </defs>
            <path d={area} fill="url(#fn-rev)" />
            <path d={line} fill="none" stroke="url(#fn-line)" strokeWidth={3} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
            {pts.map((p, i) => (
              <circle key={i} cx={p.x} cy={p.y} r={4} fill="#fff" stroke="#8F39AC" strokeWidth={2}>
                <title>{`${DAYS[i]}: ${euroWhole(REVENUE[i])}`}</title>
              </circle>
            ))}
          </svg>
          <div className="flex justify-between mt-2">
            {DAYS.map(d => <span key={d} className="text-[11px]" style={{ color: 'var(--text-s)' }}>{d}</span>)}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-[18px]">
          <div className="fynn-card px-6 py-[22px]">
            <div className="flex items-center gap-[9px] mb-[18px]">
              <BarChart3 className="w-[18px] h-[18px]" style={{ color: 'var(--fyn-purple)' }} />
              <h3 className="fynn-section-title">Topproducten op verkoop</h3>
            </div>
            {top.length === 0 && (
              <p className="text-[13px] py-6 text-center" style={{ color: 'var(--text-m)' }}>Nog geen verkopen</p>
            )}
            {top.map(([name, sales]) => (
              <div key={name} className="mb-3.5">
                <div className="flex justify-between text-[12.5px] mb-1.5">
                  <span className="truncate pr-3" style={{ color: 'var(--text-b)' }}>{name}</span>
                  <span className="font-bold" style={{ color: 'var(--text-h)' }}>{sales}</span>
                </div>
                <div className="h-[9px] rounded-full overflow-hidden" style={{ background: 'var(--track)' }}>
                  <div className="h-full rounded-full" style={{ width: `${Math.round(sales / topMax * 100)}%`, background: 'linear-gradient(90deg,#8F39AC,#379FD3)' }} />
                </div>
              </div>
            ))}
          </div>

          <div className="fynn-card px-6 py-[22px]">
            <div className="flex items-center gap-[9px] mb-5">
              <Users className="w-[18px] h-[18px]" style={{ color: 'var(--fyn-purple)' }} />
              <h3 className="fynn-section-title">Taken per agent</h3>
            </div>
            <div className="flex items-end justify-around gap-3.5 h-[200px]">
              {agents.map(a => (
                <div key={a.id} className="flex-1 flex flex-col items-center gap-[9px] h-full justify-end min-w-0">
                  <span className="text-[13px] font-bold" style={{ color: 'var(--text-h)' }}>{a.tasks_completed}</span>
                  <div className="w-full max-w-10 rounded-t-lg transition-all duration-500"
                    style={{ height: `${Math.max(2, Math.round(a.tasks_completed / agentMax * 100))}%`, background: `linear-gradient(180deg,${a.color},${a.color}aa)` }} />
                  <span className="text-[11.5px] font-semibold truncate max-w-full" style={{ color: 'var(--text-m)' }}>{a.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </PageBody>
    </>
  )
}
