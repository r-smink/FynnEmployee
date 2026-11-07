'use client'

import { useEffect, useId, useState } from 'react'
import { Palette, Check, Loader2, ExternalLink } from 'lucide-react'
import { useModels } from '@/hooks/use-models'

const DEFAULT_LIMIT = '5'

// Image model and daily limit for Luna's real designs (AI Live only)
export function DesignSettings() {
  const listId = useId()
  const { imageModels, imageModel } = useModels()
  const [model, setModel] = useState('')
  const [limit, setLimit] = useState(DEFAULT_LIMIT)
  const [publishLive, setPublishLive] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(data => {
      if (data.luna_daily_designs) setLimit(data.luna_daily_designs)
      setPublishLive(data.etsy_publish_live === '1')
    }).catch(() => {})
  }, [])
  useEffect(() => { if (imageModel) setModel(m => m || imageModel) }, [imageModel])

  const selected = imageModels.find(m => m.id === model.trim())
  // Style models need example images, which Luna doesn't send; they are left out of the suggestions
  const usable = imageModels.filter(m => !m.needsReference)
  const vector = usable.filter(m => m.formats.includes('svg')).slice(0, 6)
  const unusable = !!selected?.needsReference

  const save = async () => {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ openrouter_image_model: model.trim(), luna_daily_designs: String(Math.max(0, Math.min(50, parseInt(limit, 10) || 0))), etsy_publish_live: publishLive ? '1' : '0' }),
      })
      if (!res.ok) throw new Error()
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch {
      setError('Opslaan mislukt, probeer het opnieuw')
    }
    setSaving(false)
  }

  return (
    <div className="fynn-card p-[22px] mb-[18px]">
      <div className="flex items-center gap-[9px] mb-1">
        <Palette className="w-[18px] h-[18px]" style={{ color: 'var(--fyn-purple)' }} />
        <h3 className="fynn-section-title">Ontwerpen door Luna</h3>
      </div>
      <div className="fynn-hint mb-4">
        In AI Live tekent Luna echte ontwerpen met een beeldmodel. Elk ontwerp komt eerst bij Producten te staan om te beoordelen.
        Keur je het goed, dan maakt de app automatisch het Printful-product, de mockupfoto&apos;s en een listing op Etsy.
      </div>

      <label className="fynn-label">Beeldmodel</label>
      <input className="fynn-inp" list={listId} value={model} onChange={e => setModel(e.target.value)}
        placeholder="recraft/recraft-v4-vector" spellCheck={false} />
      <datalist id={listId}>
        {usable.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
      </datalist>
      <div className="text-[11.5px] mt-1.5 min-h-4" style={{ color: 'var(--text-s)' }}>
        {unusable
          ? <span style={{ color: '#dc2626' }}><b>{selected!.name}</b> werkt niet voor Luna: dit stijlmodel heeft verplicht een voorbeeldafbeelding nodig. Kies een ander model.</span>
          : selected
          ? <span><b style={{ color: 'var(--text-b)' }}>{selected.name}</b>{selected.formats.includes('svg') ? ' · vector (SVG), schaalbaar voor print' : ' · pixelafbeelding'}</span>
          : model.trim() && imageModels.length > 0
            ? <span style={{ color: '#d97706' }}>Onbekend beeldmodel op OpenRouter, controleer de ID</span>
            : `${imageModels.length} beeldmodellen beschikbaar`}
      </div>
      {vector.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2 mb-4">
          {vector.map(m => (
            <button key={m.id} type="button" onClick={() => setModel(m.id)} title={m.id}
              className="px-2.5 py-1 rounded-full text-[11px] font-semibold cursor-pointer"
              style={{ background: model.trim() === m.id ? 'rgba(143,57,172,.18)' : 'var(--well)', border: '1px solid var(--well-border)', color: model.trim() === m.id ? 'var(--fyn-purple)' : 'var(--text-m)' }}>
              {m.name}
            </button>
          ))}
        </div>
      )}

      <label className="fynn-label">Maximaal aantal ontwerpen per dag</label>
      <div className="fynn-hint">Elk ontwerp kost OpenRouter-tegoed (Recraft V4 Vector: $0,08 per stuk). Zet op 0 om beeldontwerpen uit te zetten.</div>
      <input className="fynn-inp" type="number" min={0} max={50} value={limit} onChange={e => setLimit(e.target.value)} style={{ maxWidth: 140 }} />

      <label className="flex items-start gap-2.5 mt-4 cursor-pointer text-[13px]" style={{ color: 'var(--text-b)' }}>
        <input type="checkbox" className="mt-[3px]" checked={publishLive} onChange={e => setPublishLive(e.target.checked)} />
        <span>
          <b>Goedgekeurde ontwerpen meteen live zetten op Etsy</b>
          <span className="block fynn-hint mt-0.5">
            Uit: de listing komt als concept in je Etsy-shop en jij publiceert hem daar zelf. Aan: hij staat direct te koop. Etsy rekent $0,20 per gepubliceerde listing.
          </span>
        </span>
      </label>

      {error && <p className="text-xs px-3 py-2 rounded-lg mt-3" style={{ background: 'var(--fyn-danger-light)', color: '#b91c1c' }}>{error}</p>}
      <div className="flex flex-wrap gap-2.5 mt-4">
        <button className="fynn-btn" onClick={save} disabled={saving || !model.trim() || unusable}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : null}
          {saving ? 'Opslaan…' : saved ? 'Opgeslagen!' : 'Opslaan'}
        </button>
        <a href="https://openrouter.ai/models?output_modalities=image" target="_blank" rel="noopener noreferrer" className="fynn-btn-ghost">
          <ExternalLink className="w-3.5 h-3.5" /> Beeldmodellen en prijzen
        </a>
      </div>
    </div>
  )
}
