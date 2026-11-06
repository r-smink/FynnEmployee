'use client'

import { useState } from 'react'
import { Check, X, Loader2, Palette } from 'lucide-react'
import { euro } from '@/lib/labels'

export interface ReviewProduct {
  id: string
  title: string
  description: string
  category: string
  price: number
  design_url: string | null
}

// Checkerboard behind designs so transparent areas are visible
export const CHECKER = 'repeating-conic-gradient(var(--well) 0% 25%, var(--card) 0% 50%) 50% / 18px 18px'

// Luna's designs waiting for a person: nothing goes further until it is approved here
export function DesignReview({ shopId, products, onChange }: { shopId: string; products: ReviewProduct[]; onChange: () => void }) {
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (products.length === 0) return null

  const decide = async (id: string, action: 'approve' | 'reject') => {
    setBusy(id)
    setError(null)
    try {
      const res = await fetch(`/api/shops/${shopId}/products/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Opslaan mislukt')
      onChange()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Opslaan mislukt')
    }
    setBusy(null)
  }

  return (
    <div className="fynn-card p-[18px] mb-[22px]" style={{ border: '1px solid rgba(143,57,172,.35)' }}>
      <div className="flex items-center gap-[9px] mb-1">
        <Palette className="w-[18px] h-[18px]" style={{ color: 'var(--fyn-purple)' }} />
        <h3 className="m-0 text-[15px] font-bold" style={{ color: 'var(--text-h)' }}>Te beoordelen ({products.length})</h3>
      </div>
      <p className="text-[12.5px] mb-4" style={{ color: 'var(--text-m)' }}>
        Ontwerpen van Luna. Controleer ze op fouten en op gelijkenis met bestaande merken of logo&apos;s voordat je ze goedkeurt.
      </p>
      {error && <p className="text-xs px-3 py-2 rounded-lg mb-3" style={{ background: 'var(--fyn-danger-light)', color: '#b91c1c' }}>{error}</p>}
      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(230px,1fr))' }}>
        {products.map(p => (
          <div key={p.id} className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--card-border)' }}>
            <a href={p.design_url || undefined} target="_blank" rel="noopener noreferrer" title="Open op ware grootte"
              className="block h-[200px]" style={{ background: CHECKER }}>
              {p.design_url && <img src={p.design_url} alt={p.title} className="w-full h-full object-contain p-3" />}
            </a>
            <div className="p-3.5">
              <div className="text-[13px] font-bold leading-[1.3] mb-1" style={{ color: 'var(--text-h)' }}>{p.title}</div>
              <div className="text-[11.5px] leading-[1.45] mb-3 line-clamp-2" style={{ color: 'var(--text-m)' }}>{p.description}</div>
              <div className="text-[11.5px] mb-3" style={{ color: 'var(--text-s)' }}>{p.category} · {euro(p.price)}</div>
              <div className="flex gap-2">
                <button className="fynn-btn flex-1" style={{ height: 36, fontSize: 12.5 }} disabled={busy === p.id} onClick={() => decide(p.id, 'approve')}>
                  {busy === p.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Goedkeuren
                </button>
                <button className="fynn-btn-ghost" style={{ height: 36, fontSize: 12.5 }} disabled={busy === p.id} onClick={() => decide(p.id, 'reject')}>
                  <X className="w-4 h-4" /> Afkeuren
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
