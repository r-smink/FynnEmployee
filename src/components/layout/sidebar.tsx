'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Building2, Users, Package, ShoppingCart, BarChart3, Settings, Bot, ChevronDown, Plus, Store } from 'lucide-react'
import { useAgents } from '@/hooks/use-agents'

interface Shop {
  id: string
  name: string
  slug: string
}

const getNavItems = (shopId: string) => [
  { href: `/shops/${shopId}/dashboard`, label: 'Dashboard', icon: LayoutDashboard },
  { href: `/shops/${shopId}/office`, label: 'Kantoor', icon: Building2 },
  { href: `/shops/${shopId}/agents`, label: 'Agents', icon: Users },
  { href: `/shops/${shopId}/products`, label: 'Producten', icon: Package },
  { href: `/shops/${shopId}/orders`, label: 'Bestellingen', icon: ShoppingCart, badgeKey: 'orders' as const },
  { href: `/shops/${shopId}/analytics`, label: 'Analytics', icon: BarChart3 },
  { href: `/shops/${shopId}/settings`, label: 'Instellingen', icon: Settings },
]

export function Sidebar({ shopId = 'default' }: { shopId?: string }) {
  const pathname = usePathname()
  const { agents } = useAgents(shopId)
  const [shops, setShops] = useState<Shop[]>([])
  const [showSwitcher, setShowSwitcher] = useState(false)
  const [newOrders, setNewOrders] = useState(0)
  const navItems = getNavItems(shopId)
  const currentShop = shops.find(s => s.id === shopId)

  useEffect(() => {
    fetch('/api/shops').then(r => r.json()).then(setShops).catch(() => {})
    fetch(`/api/shops/${shopId}/orders`).then(r => r.json()).then((orders: { status: string }[]) => {
      if (Array.isArray(orders)) setNewOrders(orders.filter(o => o.status === 'new').length)
    }).catch(() => {})
  }, [shopId])

  const working = agents.filter(a => a.status === 'working').length
  const tasksDone = agents.reduce((sum, a) => sum + (a.tasks_completed || 0), 0)

  return (
    <nav className="flex-none w-60 flex flex-col sticky top-0 h-screen z-30"
      style={{ background: 'var(--sidebar)', borderRight: '1px solid var(--sb-border)' }}>

      {/* Brand */}
      <div className="flex items-center gap-[11px] px-[18px] py-5" style={{ borderBottom: '1px solid var(--sb-border)' }}>
        <div className="w-[38px] h-[38px] rounded-[11px] flex items-center justify-center"
          style={{ background: 'var(--fyn-gradient)', boxShadow: '0 6px 18px rgba(143,57,172,.45)' }}>
          <Bot className="w-[21px] h-[21px] text-white" />
        </div>
        <div className="leading-tight">
          <div className="text-[15px] font-bold tracking-[-.01em]" style={{ color: 'var(--text-h)' }}>FynnEmployee</div>
          <div className="text-[10.5px] font-medium uppercase tracking-[.04em]" style={{ color: 'var(--text-s)' }}>AI Store Workforce</div>
        </div>
      </div>

      {/* Shop switcher */}
      <div className="px-3 pt-3">
        <button
          onClick={() => setShowSwitcher(!showSwitcher)}
          className="fynn-well w-full flex items-center justify-between px-3 py-2.5 text-[13px] cursor-pointer"
          style={{ color: 'var(--text-h)' }}>
          <span className="flex items-center gap-2 min-w-0">
            <Store className="w-4 h-4 flex-none" style={{ color: '#ff9e4a' }} />
            <span className="font-semibold truncate">{currentShop?.name || 'Mijn winkel'}</span>
          </span>
          <ChevronDown className="w-4 h-4 flex-none transition-transform" style={{ color: 'var(--text-m)', transform: showSwitcher ? 'rotate(180deg)' : 'none' }} />
        </button>

        {showSwitcher && (
          <div className="fynn-well mt-2 overflow-hidden">
            {shops.map(shop => (
              <Link key={shop.id} href={`/shops/${shop.id}/dashboard`} onClick={() => setShowSwitcher(false)}
                className="flex items-center gap-2 px-3 py-2 text-[13px]"
                style={{ color: shop.id === shopId ? 'var(--fyn-purple)' : 'var(--text-b)', fontWeight: shop.id === shopId ? 700 : 500 }}>
                <Store className="w-3.5 h-3.5" />
                {shop.name}
              </Link>
            ))}
            <Link href="/shops" onClick={() => setShowSwitcher(false)}
              className="flex items-center gap-2 px-3 py-2 text-[13px] font-semibold"
              style={{ color: 'var(--fyn-success)', borderTop: '1px solid var(--divide)' }}>
              <Plus className="w-3.5 h-3.5" />
              Nieuwe winkel
            </Link>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex-1 px-3 py-3.5 overflow-y-auto">
        <div className="px-2.5 pt-2 pb-1.5 text-[10px] font-bold tracking-[.09em] uppercase" style={{ color: 'var(--text-s)' }}>Werkruimte</div>
        {navItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/')
          const badge = item.badgeKey === 'orders' && newOrders > 0 ? newOrders : null
          return (
            <Link
              key={item.href}
              href={item.href}
              className="group flex items-center gap-3 w-full px-3 py-2.5 my-0.5 rounded-[10px] text-[13.5px] font-semibold leading-none transition-colors"
              style={active
                ? { background: 'var(--fyn-gradient)', color: '#fff', boxShadow: '0 6px 16px rgba(143,57,172,.35)' }
                : { color: 'var(--nav-fg)' }}
              onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'var(--nav-hover)'; e.currentTarget.style.color = 'var(--text-h)' } }}
              onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--nav-fg)' } }}>
              <item.icon className="w-[18px] h-[18px] flex-none" />
              <span className="flex-1 text-left">{item.label}</span>
              {badge !== null && (
                <span className="flex-none min-w-[19px] h-[19px] px-1.5 rounded-full text-white text-[10.5px] font-bold flex items-center justify-center"
                  style={{ background: active ? 'rgba(255,255,255,.25)' : 'var(--fyn-purple)' }}>
                  {badge}
                </span>
              )}
            </Link>
          )
        })}

        <div className="mt-[18px] p-3.5 rounded-[13px]"
          style={{ background: 'linear-gradient(135deg,rgba(143,57,172,.14),rgba(55,159,211,.12))', border: '1px solid var(--card-border)' }}>
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 rounded-full animate-fynn-pulse" style={{ background: '#10b981', boxShadow: '0 0 8px #10b981' }} />
            <span className="text-xs font-bold" style={{ color: 'var(--text-h)' }}>Workforce live</span>
          </div>
          <div className="text-[11.5px] leading-normal" style={{ color: 'var(--text-m)' }}>
            {working} van {agents.length} agents actief · {tasksDone} taken voltooid.
          </div>
        </div>
      </div>

      <div className="px-[18px] py-3.5 flex items-center gap-[9px]" style={{ borderTop: '1px solid var(--sb-border)' }}>
        <span className="w-2 h-2 rounded-full" style={{ background: '#10b981', boxShadow: '0 0 8px #10b981' }} />
        <span className="text-[11.5px]" style={{ color: 'var(--text-m)' }}>Systeem online</span>
      </div>
    </nav>
  )
}
