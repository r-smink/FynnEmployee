'use client'

import { useEffect, useState } from 'react'
import { Check, Loader2, Store } from 'lucide-react'

// Fired after a shop is renamed so the sidebar and street refresh their shop list
export const SHOPS_CHANGED_EVENT = 'fynn:shops-changed'

const PROMPT_MAX = 4000

interface Profile { name: string; description: string; shop_prompt: string }

export function ShopProfileCard({ shopId }: { shopId: string }) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [saved, setSaved] = useState<Profile | null>(null)
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/shops/${shopId}`).then(r => r.json()).then(data => {
      const p = { name: data.name || '', description: data.description || '', shop_prompt: data.shop_prompt || '' }
      setProfile(p)
      setSaved(p)
    }).catch(() => setError('Winkelgegevens laden mislukt'))
  }, [shopId])

  const dirty = !!profile && !!saved && (Object.keys(profile) as (keyof Profile)[]).some(k => profile[k] !== saved[k])
  const set = (key: keyof Profile, value: string) => setProfile(p => p && { ...p, [key]: value })

  const save = async () => {
    if (!profile) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/shops/${shopId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
      const p = { name: data.name, description: data.description || '', shop_prompt: data.shop_prompt || '' }
      setProfile(p)
      setSaved(p)
      window.dispatchEvent(new Event(SHOPS_CHANGED_EVENT))
      setDone(true)
      setTimeout(() => setDone(false), 3000)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Opslaan mislukt')
    }
    setSaving(false)
  }

  return (
    <div className="fynn-card p-[22px] mb-[18px]">
      <div className="flex items-center gap-[9px] mb-4">
        <Store className="w-[18px] h-[18px]" style={{ color: '#ff9e4a' }} />
        <h3 className="fynn-section-title">Winkel</h3>
      </div>

      {!profile ? (
        <div className="text-xs py-4" style={{ color: error ? '#b91c1c' : 'var(--text-m)' }}>{error || 'Laden…'}</div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="fynn-label">Winkelnaam</label>
              <input className="fynn-inp" value={profile.name} maxLength={80} onChange={e => set('name', e.target.value)} placeholder="Naam van je winkel" />
            </div>
            <div>
              <label className="fynn-label">Korte omschrijving</label>
              <input className="fynn-inp" value={profile.description} maxLength={500} onChange={e => set('description', e.target.value)}
                placeholder="Bijv. Handgemaakte posters met een retro-vibe" />
            </div>
          </div>

          <label className="fynn-label">Shop-prompt</label>
          <div className="fynn-hint">
            Geldt voor <b>alle agents</b> van deze winkel, bovenop hun eigen prompt. Denk aan doelgroep, merkstem, stijl, taal en wat ze nooit moeten doen.
          </div>
          <textarea className="fynn-inp" rows={7} style={{ height: 'auto', minHeight: 150, padding: '11px 13px', resize: 'vertical', lineHeight: 1.5 }}
            value={profile.shop_prompt} maxLength={PROMPT_MAX} onChange={e => set('shop_prompt', e.target.value)}
            placeholder={'Bijv.\n- We verkopen minimalistische posters voor jonge gezinnen.\n- Schrijf vriendelijk en in het Engels voor Etsy.\n- Gebruik nooit merknamen of auteursrechtelijk beschermde figuren.'} />
          <div className="flex items-center justify-between gap-3 mt-1.5 mb-3">
            <span className="text-[11.5px]" style={{ color: 'var(--text-s)' }}>{profile.shop_prompt.length} / {PROMPT_MAX}</span>
          </div>

          {error && <p className="text-xs px-3 py-2 rounded-lg mb-3" style={{ background: 'var(--fyn-danger-light)', color: '#b91c1c' }}>{error}</p>}
          <button className="fynn-btn" onClick={save} disabled={saving || !dirty || !profile.name.trim()}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : done ? <Check className="w-4 h-4" /> : null}
            {saving ? 'Opslaan…' : done ? 'Opgeslagen!' : 'Winkel opslaan'}
          </button>
        </>
      )}
    </div>
  )
}
