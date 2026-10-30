'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Bot, Store, LayoutGrid, Building2 } from 'lucide-react'
import { StreetView, shopColor } from '@/components/street/StreetView'
import type { StreetShop } from '@/app/api/street/route'

const REFRESH_MS = 5000

export default function StreetPage() {
  const router = useRouter()
  const [shops, setShops] = useState<StreetShop[] | null>(null)

  // Light polling keeps the lit windows in sync with what the agents are doing
  useEffect(() => {
    const load = () => fetch('/api/street').then(r => r.json()).then(d => Array.isArray(d) && setShops(d)).catch(() => {})
    load()
    const t = setInterval(load, REFRESH_MS)
    return () => clearInterval(t)
  }, [])

  const working = shops?.reduce((n, s) => n + s.working, 0) ?? 0

  return (
    <div className="min-h-screen p-6 md:p-8" style={{ background: 'var(--page-glow)' }}>
      <div className="max-w-[1400px] mx-auto animate-fade-in">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-[42px] h-[42px] rounded-[12px] flex items-center justify-center"
              style={{ background: 'var(--fyn-gradient)', boxShadow: '0 6px 18px rgba(143,57,172,.45)' }}>
              <Bot className="w-[22px] h-[22px] text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-[-.02em]" style={{ color: 'var(--text-h)' }}>Winkelstraat</h1>
              <p className="text-[13px]" style={{ color: 'var(--text-m)' }}>
                {shops ? `${shops.length} ${shops.length === 1 ? 'winkel' : 'winkels'} · ${working} agents aan het werk` : 'Laden…'} — klik op een winkel om naar binnen te gaan
              </p>
            </div>
          </div>
          <Link href="/shops" className="fynn-btn-ghost" style={{ height: 38 }}>
            <LayoutGrid className="w-4 h-4" /> Winkeloverzicht
          </Link>
        </div>

        <div className="fynn-card overflow-hidden mb-5"
          style={{ backgroundImage: 'radial-gradient(900px 380px at 50% 10%,rgba(55,159,211,.14),transparent 70%)' }}>
          {shops ? (
            <div className="overflow-x-auto">
              {/* grows with the number of shops instead of blowing one shop up to full width */}
              <div className="mx-auto" style={{ minWidth: Math.max(720, (shops.length + 1) * 260), maxWidth: Math.max(820, (shops.length + 1) * 440) }}>
                <StreetView shops={shops} onOpenShop={id => router.push(`/shops/${id}/office`)} onCreateShop={() => router.push('/shops')} />
              </div>
            </div>
          ) : (
            <div className="py-28 text-center">
              <div className="w-8 h-8 border-2 rounded-full animate-spin mx-auto mb-3" style={{ borderColor: 'var(--fyn-purple)', borderTopColor: 'transparent' }} />
              <p className="text-xs" style={{ color: 'var(--text-m)' }}>Straat laden…</p>
            </div>
          )}
        </div>

        {shops && (
          <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))' }}>
            {shops.map(shop => (
              <div key={shop.id} className="fynn-card flex items-center gap-3 px-4 py-3" style={{ borderRadius: 12 }}>
                <div className="w-9 h-9 rounded-[10px] flex items-center justify-center flex-none" style={{ background: `${shopColor(shop.id)}26` }}>
                  <Store className="w-[18px] h-[18px]" style={{ color: shopColor(shop.id) }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-semibold truncate" style={{ color: 'var(--text-h)' }}>{shop.name}</div>
                  <div className="text-[11.5px] truncate" style={{ color: 'var(--text-m)' }}>
                    {shop.products} producten · {shop.tasksCompleted} taken voltooid
                  </div>
                </div>
                <Link href={`/shops/${shop.id}/office`} className="fynn-zoom-btn" title="Kantoor" aria-label={`Kantoor van ${shop.name}`}>
                  <Building2 className="w-4 h-4" />
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
