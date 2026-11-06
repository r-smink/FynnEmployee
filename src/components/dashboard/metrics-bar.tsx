'use client'

import { useEffect, useState } from 'react'
import { Euro, ShoppingCart, Users, CheckCircle2 } from 'lucide-react'
import type { AgentData } from '@/hooks/use-agents'
import { useAiMode, SETTINGS_CHANGED_EVENT } from '@/hooks/use-ai-mode'
import { DemoNotice } from '@/components/layout/demo-notice'
import { alpha, euroWhole } from '@/lib/labels'
import { monthRevenue, todayAndYesterdayCounts, type OrderLike } from '@/lib/revenue'

interface MetricsBarProps {
  shopId: string
  agents: AgentData[]
}

export function MetricsBar({ shopId, agents }: MetricsBarProps) {
  const { showDemoData } = useAiMode()
  const [orders, setOrders] = useState<OrderLike[]>([])

  useEffect(() => {
    const load = () => fetch(`/api/shops/${shopId}/orders`).then(r => r.json()).then(data => {
      if (Array.isArray(data)) setOrders(data)
    }).catch(() => {})
    load()
    window.addEventListener(SETTINGS_CHANGED_EVENT, load)
    return () => window.removeEventListener(SETTINGS_CHANGED_EVENT, load)
  }, [shopId])

  const working = agents.filter(a => a.status === 'working')
  const totalTasks = agents.reduce((sum, a) => sum + a.tasks_completed, 0)

  // Example figures only in demo mode while there are no real orders
  const demo = showDemoData && orders.length === 0
  const counts = todayAndYesterdayCounts(orders)
  const diff = counts.today - counts.yesterday

  const metrics = [
    demo
      ? { label: 'Totale omzet', value: '€4.827', sub: 'deze maand', icon: Euro, color: '#10b981' }
      : { label: 'Totale omzet', value: euroWhole(monthRevenue(orders)), sub: 'deze maand', icon: Euro, color: '#10b981' },
    demo
      ? { label: 'Bestellingen vandaag', value: '23', sub: '+5 vs gisteren', icon: ShoppingCart, color: '#379FD3' }
      : {
        label: 'Bestellingen vandaag', value: String(counts.today), icon: ShoppingCart, color: '#379FD3',
        sub: orders.length === 0 ? 'nog geen bestellingen' : `${diff >= 0 ? '+' : ''}${diff} vs gisteren`,
      },
    {
      label: 'Actieve agents', value: `${working.length} / ${agents.length}`, icon: Users, color: '#9e4aff',
      sub: working.length === 0 ? 'iedereen pauzeert' : working.length === 1 ? `${working[0].name} werkt` : `${working.length} agents werken`,
    },
    { label: 'Taken voltooid', value: totalTasks.toString(), sub: 'totaal', icon: CheckCircle2, color: '#ff9e4a' },
  ]

  return (
    <>
      {demo && <DemoNotice />}
      <div className="grid gap-4 mb-[22px]" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(210px,1fr))' }}>
        {metrics.map((m) => (
          <div key={m.label} className="fynn-card relative overflow-hidden px-5 py-[18px]">
            <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: 'linear-gradient(90deg,#8F39AC,#379FD3)' }} />
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <div className="text-[11.5px] font-semibold uppercase tracking-[.04em]" style={{ color: 'var(--text-m)' }}>{m.label}</div>
                <div className="text-[26px] font-bold tracking-[-.02em] mt-2 leading-none" style={{ color: 'var(--text-h)' }}>{m.value}</div>
                <div className="text-xs mt-[7px]" style={{ color: 'var(--text-m)' }}>{m.sub}</div>
              </div>
              <div className="w-[46px] h-[46px] rounded-[13px] flex items-center justify-center flex-none" style={{ background: alpha(m.color, '1e') }}>
                <m.icon className="w-[22px] h-[22px]" style={{ color: m.color }} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
