'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useShops } from '@/hooks/use-shops'
import Link from 'next/link'
import { Store, Plus, Users, Loader2, Bot, Map as MapIcon } from 'lucide-react'

export default function ShopsPage() {
  const { shops } = useShops()
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
    <div className="min-h-screen p-8" style={{ background: 'var(--page-glow)' }}>
      <div className="max-w-4xl mx-auto animate-fade-in">
        <div className="flex items-center gap-3 mb-8 flex-wrap">
          <div className="w-[42px] h-[42px] rounded-[12px] flex items-center justify-center"
            style={{ background: 'var(--fyn-gradient)', boxShadow: '0 6px 18px rgba(143,57,172,.45)' }}>
            <Bot className="w-[22px] h-[22px] text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-[-.02em]" style={{ color: 'var(--text-h)' }}>Je winkels</h1>
            <p className="text-[13px]" style={{ color: 'var(--text-m)' }}>Beheer je AI-gestuurde winkels</p>
          </div>
          <Link href="/street" className="fynn-btn-ghost ml-auto" style={{ height: 38 }}>
            <MapIcon className="w-4 h-4" /> Winkelstraat
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {shops.map(shop => (
            <button key={shop.id} onClick={() => router.push(`/shops/${shop.id}/dashboard`)}
              className="fynn-card p-5 text-left transition-transform hover:scale-[1.02] cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-[10px] flex items-center justify-center" style={{ background: 'rgba(255,158,74,.16)' }}>
                  <Store className="w-5 h-5" style={{ color: '#ff9e4a' }} />
                </div>
                <div>
                  <h3 className="text-sm font-bold" style={{ color: 'var(--text-h)' }}>{shop.name}</h3>
                  <p className="text-xs flex items-center gap-1" style={{ color: 'var(--text-m)' }}>
                    <Users className="w-3 h-3" />AI-team
                  </p>
                </div>
              </div>
            </button>
          ))}

          <div className="fynn-card p-5">
            <h3 className="text-sm font-bold mb-3 flex items-center gap-1.5" style={{ color: 'var(--text-h)' }}>
              <Plus className="w-4 h-4" /> Nieuwe winkel
            </h3>
            <input className="fynn-inp mb-3" placeholder="Naam van de winkel…" value={name}
              onChange={e => setName(e.target.value)} onKeyDown={e => e.key === 'Enter' && createShop()} />
            <button onClick={createShop} disabled={creating || !name.trim()} className="fynn-btn w-full justify-center">
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Winkel aanmaken
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
