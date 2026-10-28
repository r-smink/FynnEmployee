'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Users, Package, ShoppingCart, BarChart3, Settings, Bot } from 'lucide-react'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/products', label: 'Products', icon: Package },
  { href: '/orders', label: 'Orders', icon: ShoppingCart },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/settings', label: 'Settings', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="fixed left-0 top-0 h-screen w-60 flex flex-col border-r"
      style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
      <div className="flex items-center gap-3 px-5 py-5 border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, var(--accent-purple), var(--accent-blue))' }}>
          <Bot className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>FynnEmployee</h1>
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>AI Store Workforce</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200"
              style={{
                color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                background: isActive ? 'var(--bg-card)' : 'transparent',
              }}
            >
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
