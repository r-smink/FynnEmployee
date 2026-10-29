'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Package, ShoppingCart, BarChart3, Settings, Bot, Users, ChevronDown, Plus, Store } from 'lucide-react'

interface Shop {
  id: string
  name: string
  slug: string
}

const getNavItems = (shopId: string) => [
  { href: `/shops/${shopId}/dashboard`, label: 'Dashboard', icon: LayoutDashboard },
  { href: `/shops/${shopId}/agents`, label: 'Agents', icon: Users },
  { href: `/shops/${shopId}/products`, label: 'Products', icon: Package },
  { href: `/shops/${shopId}/orders`, label: 'Orders', icon: ShoppingCart },
  { href: `/shops/${shopId}/analytics`, label: 'Analytics', icon: BarChart3 },
  { href: `/shops/${shopId}/settings`, label: 'Settings', icon: Settings },
]

export function Sidebar({ shopId }: { shopId: string }) {
  const pathname = usePathname()
  const [shops, setShops] = useState<Shop[]>([])
  const [currentShop, setCurrentShop] = useState<Shop | null>(null)
  const [showSwitcher, setShowSwitcher] = useState(false)
  const navItems = getNavItems(shopId)

  useEffect(() => {
    fetch('/api/shops').then(r => r.json()).then(data => {
      setShops(data)
      setCurrentShop(data.find((s: Shop) => s.id === shopId) || null)
    }).catch(() => {})
  }, [shopId])

  return (
    <aside className="fixed left-0 top-0 h-screen w-60 flex flex-col border-r z-40"
      style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>

      {/* Brand */}
      <div className="flex items-center gap-3 px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="w-9 h-9 rounded-lg flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, var(--accent-purple), var(--accent-blue))' }}>
          <Bot className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>FynnEmployee</h1>
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>AI Store Workforce</p>
        </div>
      </div>

      {/* Shop Switcher */}
      <div className="px-3 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
        <button
          onClick={() => setShowSwitcher(!showSwitcher)}
          className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors"
          style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}>
          <div className="flex items-center gap-2">
            <Store className="w-4 h-4" style={{ color: 'var(--accent-orange)' }} />
            <span className="font-medium truncate">{currentShop?.name || 'My Shop'}</span>
          </div>
          <ChevronDown className="w-4 h-4" style={{ color: 'var(--text-secondary)', transform: showSwitcher ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
        </button>

        {showSwitcher && (
          <div className="mt-2 rounded-lg overflow-hidden border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
            {shops.map(shop => (
              <Link
                key={shop.id}
                href={`/shops/${shop.id}/dashboard`}
                onClick={() => setShowSwitcher(false)}
                className="flex items-center gap-2 px-3 py-2 text-sm transition-colors"
                style={{
                  color: shop.id === shopId ? 'var(--accent-blue)' : 'var(--text-secondary)',
                  background: shop.id === shopId ? 'var(--bg-card-hover)' : 'transparent'
                }}>
                <Store className="w-3.5 h-3.5" />
                {shop.name}
              </Link>
            ))}
            <Link
              href="/shops"
              onClick={() => setShowSwitcher(false)}
              className="flex items-center gap-2 px-3 py-2 text-sm border-t"
              style={{ color: 'var(--accent-green)', borderColor: 'var(--border)' }}>
              <Plus className="w-3.5 h-3.5" />
              New Shop
            </Link>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200"
              style={{
                color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                background: isActive ? 'var(--bg-card)' : 'transparent',
              }}>
              <item.icon className="w-4.5 h-4.5" style={isActive ? { color: 'var(--accent-blue)' } : undefined} />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="px-4 py-4 border-t" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--accent-green)' }} />
          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>System Online</span>
        </div>
      </div>
    </aside>
  )
}
