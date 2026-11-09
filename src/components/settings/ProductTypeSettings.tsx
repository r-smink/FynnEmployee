'use client'

import { useEffect, useState } from 'react'
import { Shirt, Loader2 } from 'lucide-react'
import { PRODUCT_TYPES } from '@/lib/product-specs'

const KEY = 'disabled_product_types'

const LABELS: Record<string, string> = {
  'T-Shirt': 'T-shirts', 'Tote Bag': 'Tassen', Mug: 'Mokken', Poster: 'Posters', Sticker: 'Stickers',
}

// Which product types Luna makes for this shop; switch one off for a while (e.g. no stickers this month)
export function ProductTypeSettings({ shopId }: { shopId: string }) {
  const [off, setOff] = useState<string[] | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/shops/${shopId}/settings`).then(r => r.json()).then(data => {
      try { setOff(JSON.parse(data[KEY] || '[]')) } catch { setOff([]) }
    }).catch(() => setOff([]))
  }, [shopId])

  const toggle = async (type: string) => {
    if (!off) return
    const next = off.includes(type) ? off.filter(t => t !== type) : [...off, type]
    setOff(next)
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/shops/${shopId}/settings`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ [KEY]: next }),
      })
      if (!res.ok) throw new Error()
    } catch {
      setOff(off)
      setError('Opslaan mislukt')
    }
    setSaving(false)
  }

  const allOff = off !== null && off.length === PRODUCT_TYPES.length

  return (
    <div className="fynn-card p-[22px] mb-[18px]">
      <div className="flex items-center gap-[9px] mb-1">
        <Shirt className="w-[18px] h-[18px]" style={{ color: 'var(--fyn-purple)' }} />
        <h3 className="fynn-section-title">Producttypes</h3>
        {saving && <Loader2 className="w-4 h-4 animate-spin ml-auto" style={{ color: 'var(--text-s)' }} />}
      </div>
      <div className="fynn-hint mb-4">
        Luna maakt alleen ontwerpen voor de producttypes die aan staan. Zet er tijdelijk een uit als je die even niet wilt verkopen.
        Wat al op Etsy staat of nog beoordeeld moet worden, blijft gewoon staan.
      </div>
      {off === null ? (
        <Loader2 className="w-4 h-4 animate-spin" style={{ color: 'var(--text-s)' }} />
      ) : (
        <div className="flex flex-wrap gap-2">
          {PRODUCT_TYPES.map(type => {
            const on = !off.includes(type)
            return (
              <button key={type} role="switch" aria-checked={on} onClick={() => toggle(type)}
                className="h-9 px-3.5 rounded-[9px] text-[13px] font-semibold inline-flex items-center gap-2 cursor-pointer"
                style={on
                  ? { background: 'var(--fyn-gradient)', color: '#fff', border: '1px solid transparent' }
                  : { background: 'var(--well)', color: 'var(--text-s)', border: '1px solid var(--well-border)', textDecoration: 'line-through' }}>
                {LABELS[type] ?? type}
              </button>
            )
          })}
        </div>
      )}
      {allOff && (
        <p className="text-xs px-3 py-2 rounded-lg mt-3 mb-0" style={{ background: 'var(--fyn-warning-light, var(--well))', color: '#b45309' }}>
          Alles staat uit, dus Luna maakt nu geen ontwerpen.
        </p>
      )}
      {error && <p className="text-xs px-3 py-2 rounded-lg mt-3 mb-0" style={{ background: 'var(--fyn-danger-light)', color: '#b91c1c' }}>{error}</p>}
    </div>
  )
}
