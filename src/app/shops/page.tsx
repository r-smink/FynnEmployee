'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useShops } from '@/hooks/use-shops'
import { Store, Plus, Users, Loader2 } from 'lucide-react'

export default function ShopsPage() {
  const { shops, loading } = useShops()
  const router = useRouter()
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')

  const createShop = async () => {
    if (!name.trim()) return
    setCreating(true)
    const res = await fetch('/api/shops', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim() }),
    })
    const shop = await res.json()
    router.push(`/shops/${shop.id}/dashboard`)
  }

  return (
    <div className="min-h-screen p-8" style={{ background: 'var(--bg-primary)' }}>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Your Shops</h1>
        <p className="text-sm mb-8" style={{ color: 'var(--text-secondary)' }}>Manage your AI-powered stores</p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {shops.map(shop => (
            <button
              key={shop.id}
              onClick={() => router.push(`/shops/${shop.id}/dashboard`)}
              className="glass-card p-5 text-left transition-all hover:scale-[1.02]"
              style={{ cursor: 'pointer' }}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ background: 'rgba(255, 158, 74, 0.15)' }}>
                  <Store className="w-5 h-5" style={{ color: 'var(--accent-orange)' }} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{shop.name}</h3>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    <Users className="w-3 h-3 inline mr-1" />6 agents
                  </p>
                </div>
              </div>
            </button>
          ))}

          {/* Create new shop card */}
          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
              <Plus className="w-4 h-4 inline mr-1" /> New Shop
            </h3>
            <input
              type="text"
              placeholder="Shop name..."
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && createShop()}
              className="w-full px-3 py-2 rounded-lg text-sm outline-none mb-3"
              style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            />
            <button
              onClick={createShop}
              disabled={creating || !name.trim()}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
              style={{ background: 'var(--accent-green)', color: '#0a0a0f' }}>
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Create Shop
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
