'use client'

import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { nl } from 'date-fns/locale'
import { X, Check, Loader2, Save, ExternalLink, Trash2, Sparkles } from 'lucide-react'
import { PRODUCT_TYPES, productSpec, productType } from '@/lib/product-specs'
import { parseDbDate } from '@/lib/revenue'

interface Product {
  id: string
  title: string
  description: string | null
  category: string | null
  price: number
  tags: string | null
  design_url: string | null
  created_at: string
}

interface Origin {
  task: string
  assignment: string | null
  prompt: string | null
  model: string | null
  cost: number | null
}

interface Draft {
  title: string
  description: string
  category: string
  price: string
  tags: string[]
}

// Checkerboard behind designs so transparent areas are visible
export const CHECKER = 'repeating-conic-gradient(var(--well) 0% 25%, var(--card) 0% 50%) 50% / 18px 18px'

const MAX_TITLE = 140
const MAX_TAGS = 13
const MAX_TAG = 20

function parseTags(raw: string | null): string[] {
  try {
    const tags = JSON.parse(raw || '[]')
    return Array.isArray(tags) ? tags.map(String) : []
  } catch {
    return []
  }
}

const draftOf = (p: Product): Draft => ({
  title: p.title,
  description: p.description ?? '',
  category: productType(p.category) ?? PRODUCT_TYPES[0],
  price: p.price ? p.price.toFixed(2) : '',
  tags: parseTags(p.tags),
})

// Everything about one design waiting for review, editable before it goes to Etsy
export function DesignDetails({ shopId, productId, onClose, onChange }: {
  shopId: string
  productId: string
  onClose: () => void
  onChange: () => void
}) {
  const [product, setProduct] = useState<Product | null>(null)
  const [origin, setOrigin] = useState<Origin | null>(null)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [saved, setSaved] = useState<Draft | null>(null)
  const [tagInput, setTagInput] = useState('')
  const [size, setSize] = useState<{ w: number; h: number } | null>(null)
  const [busy, setBusy] = useState<'save' | 'approve' | 'reject' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/shops/${shopId}/products/${productId}`).then(r => r.json()).then(data => {
      if (data.error) { setError(data.error); return }
      setProduct(data.product)
      setOrigin(data.origin)
      setDraft(draftOf(data.product))
      setSaved(draftOf(data.product))
    }).catch(() => setError('Geen verbinding met de server'))
  }, [shopId, productId])

  const dirty = !!draft && JSON.stringify(draft) !== JSON.stringify(saved)

  const close = () => {
    if (dirty && !window.confirm('Je wijzigingen zijn nog niet opgeslagen. Toch sluiten?')) return
    onClose()
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    setDraft(d => (d ? { ...d, [key]: value } : d))
    setError(null)
    setNotice(null)
  }

  const addTags = (text: string) => {
    if (!draft) return
    const fresh = text.split(',').map(t => t.replace(/\s+/g, ' ').trim()).filter(Boolean)
      .filter(t => !draft.tags.some(x => x.toLowerCase() === t.toLowerCase()))
    if (fresh.length) set('tags', [...draft.tags, ...fresh])
    setTagInput('')
  }

  const send = async (body: Record<string, unknown>) => {
    const res = await fetch(`/api/shops/${shopId}/products/${productId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.error || 'Opslaan mislukt')
    return data
  }

  const save = async (): Promise<boolean> => {
    if (!draft) return false
    const pending = tagInput.trim() ? [...draft.tags, tagInput.trim()] : draft.tags
    try {
      const data = await send({ action: 'update', ...draft, price: Number(draft.price.replace(',', '.')), tags: pending })
      setProduct(data)
      setDraft(draftOf(data))
      setSaved(draftOf(data))
      setTagInput('')
      onChange()
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Opslaan mislukt')
      return false
    }
  }

  const run = async (kind: 'save' | 'approve' | 'reject') => {
    setBusy(kind)
    setError(null)
    setNotice(null)
    try {
      if (kind === 'save') {
        if (await save()) setNotice('Opgeslagen')
      } else if (kind === 'approve') {
        if ((dirty || tagInput.trim()) && !(await save())) return
        await send({ action: 'approve' })
        onChange()
        onClose()
      } else if (window.confirm('Dit ontwerp afkeuren? De afbeelding wordt verwijderd.')) {
        await send({ action: 'reject' })
        onChange()
        onClose()
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Mislukt')
    } finally {
      setBusy(null)
    }
  }

  const spec = draft ? productSpec(draft.category) : null
  const longTags = draft?.tags.filter(t => t.length > MAX_TAG) ?? []
  const label = 'text-[11px] font-bold uppercase tracking-[.04em] mb-1.5 block'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Ontwerp bekijken en bewerken">
      <div className="absolute inset-0" style={{ background: 'var(--overlay)' }} onClick={close} />

      <div className="relative w-full max-w-[1020px] max-h-[calc(100vh-32px)] flex flex-col rounded-2xl overflow-hidden"
        style={{ background: 'var(--card)', border: '1px solid var(--card-border)', boxShadow: '0 30px 80px -20px rgba(0,0,0,.55)' }}>
        <div className="flex items-center justify-between gap-3 px-5 h-14 flex-none" style={{ borderBottom: '1px solid var(--divide)' }}>
          <div className="min-w-0">
            <h3 className="text-[15px] font-bold truncate m-0" style={{ color: 'var(--text-h)' }}>{draft?.title || 'Ontwerp'}</h3>
            <p className="text-xs m-0" style={{ color: 'var(--text-m)' }}>Concept-ontwerp · nog niet op Etsy</p>
          </div>
          <button onClick={close} className="w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer flex-none"
            style={{ background: 'var(--well)', border: '1px solid var(--well-border)' }} aria-label="Sluiten">
            <X className="w-4 h-4" style={{ color: 'var(--text-m)' }} />
          </button>
        </div>

        {!product || !draft ? (
          <div className="py-24 text-center">
            {error
              ? <p className="text-[13px]" style={{ color: '#b91c1c' }}>{error}</p>
              : <Loader2 className="w-6 h-6 animate-spin mx-auto" style={{ color: 'var(--fyn-purple)' }} />}
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            <div className="grid gap-6 p-5 md:grid-cols-[minmax(0,400px)_minmax(0,1fr)]">
              {/* Design and how it was made */}
              <div className="flex flex-col gap-3 min-w-0">
                <div className="rounded-xl overflow-hidden aspect-square" style={{ background: CHECKER, border: '1px solid var(--card-border)' }}>
                  {product.design_url && (
                    <img src={product.design_url} alt={draft.title} className="w-full h-full object-contain p-4"
                      onLoad={e => setSize({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })} />
                  )}
                </div>
                <div className="flex items-center justify-between text-[12px]" style={{ color: 'var(--text-m)' }}>
                  <span>{size ? `${size.w} × ${size.h} px` : ''}</span>
                  {product.design_url && (
                    <a href={product.design_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold" style={{ color: 'var(--fyn-blue)' }}>
                      Op ware grootte <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>

                <div className="fynn-well p-3.5 text-[12.5px] flex flex-col gap-2" style={{ color: 'var(--text-b)' }}>
                  <div className="flex items-center gap-1.5 font-bold" style={{ color: 'var(--text-h)' }}>
                    <Sparkles className="w-3.5 h-3.5" style={{ color: 'var(--fyn-purple)' }} /> Gemaakt door Luna
                  </div>
                  <Info label="Gemaakt op" value={format(parseDbDate(product.created_at), 'd MMMM yyyy, HH:mm', { locale: nl })} />
                  {origin?.task && <Info label="Opdracht" value={origin.task} />}
                  {origin?.assignment && <Info label="Toelichting" value={origin.assignment} />}
                  {origin?.model && <Info label="Beeldmodel" value={origin.model} />}
                  {origin && origin.cost !== null && <Info label="Kosten" value={`$${origin.cost.toFixed(3)}`} />}
                  {origin?.prompt && (
                    <details>
                      <summary className="cursor-pointer font-semibold" style={{ color: 'var(--text-m)' }}>Beeldprompt</summary>
                      <p className="mt-1.5 mb-0 leading-[1.5]" style={{ color: 'var(--text-b)' }}>{origin.prompt}</p>
                    </details>
                  )}
                  {!origin && <p className="m-0" style={{ color: 'var(--text-s)' }}>Geen gegevens over hoe dit ontwerp gemaakt is.</p>}
                </div>
              </div>

              {/* Listing details, as they go to Etsy */}
              <div className="flex flex-col gap-4 min-w-0">
                <div>
                  <label className={label} style={{ color: 'var(--text-m)' }} htmlFor="dd-title">
                    Titel <span style={{ color: draft.title.length > MAX_TITLE ? '#dc2626' : 'var(--text-s)' }}>({draft.title.length}/{MAX_TITLE})</span>
                  </label>
                  <input id="dd-title" className="fynn-inp" value={draft.title} onChange={e => set('title', e.target.value)} />
                </div>

                <div>
                  <label className={label} style={{ color: 'var(--text-m)' }} htmlFor="dd-desc">Beschrijving</label>
                  <textarea id="dd-desc" className="fynn-inp" rows={5} value={draft.description} onChange={e => set('description', e.target.value)} />
                  <p className="fynn-hint mt-1 mb-0">Op Etsy komen hier nog de productgegevens en een regel over maken-op-bestelling onder.</p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className={label} style={{ color: 'var(--text-m)' }} htmlFor="dd-type">Producttype</label>
                    <select id="dd-type" className="fynn-inp" value={draft.category} onChange={e => set('category', e.target.value)}>
                      {PRODUCT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={label} style={{ color: 'var(--text-m)' }} htmlFor="dd-price">Prijs (€)</label>
                    <input id="dd-price" className="fynn-inp" inputMode="decimal" value={draft.price} onChange={e => set('price', e.target.value)} />
                  </div>
                </div>
                {spec && <p className="fynn-hint -mt-2 mb-0">{spec.details} De prijs is voor de kleinste maat; op Etsy wordt hij minstens 2× de Printful-kostprijs, grotere maten iets duurder.</p>}

                <div>
                  <label className={label} style={{ color: 'var(--text-m)' }} htmlFor="dd-tags">
                    Tags <span style={{ color: draft.tags.length > MAX_TAGS ? '#dc2626' : 'var(--text-s)' }}>({draft.tags.length}/{MAX_TAGS})</span>
                  </label>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {draft.tags.map(t => {
                      const bad = t.length > MAX_TAG
                      return (
                        <span key={t} className="inline-flex items-center gap-1 pl-2.5 pr-1 py-1 rounded-full text-[12px] font-semibold"
                          style={{ background: bad ? 'var(--fyn-danger-light)' : 'var(--well)', color: bad ? '#b91c1c' : 'var(--text-b)', border: '1px solid var(--well-border)' }}
                          title={bad ? `Langer dan ${MAX_TAG} tekens` : undefined}>
                          {t}
                          <button className="w-4 h-4 rounded-full flex items-center justify-center cursor-pointer" aria-label={`Tag ${t} weghalen`}
                            onClick={() => set('tags', draft.tags.filter(x => x !== t))}>
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      )
                    })}
                  </div>
                  <input id="dd-tags" className="fynn-inp" placeholder="Nieuwe tag, Enter om toe te voegen" value={tagInput}
                    maxLength={60}
                    onChange={e => setTagInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTags(tagInput) }
                      else if (e.key === 'Backspace' && !tagInput && draft.tags.length) set('tags', draft.tags.slice(0, -1))
                    }}
                    onBlur={() => tagInput.trim() && addTags(tagInput)} />
                  <p className="fynn-hint mt-1 mb-0" style={{ color: longTags.length ? '#b91c1c' : undefined }}>
                    {longTags.length
                      ? `Etsy staat tags tot ${MAX_TAG} tekens toe. Maak deze korter: ${longTags.join(', ')}`
                      : `Maximaal ${MAX_TAGS} tags van elk maximaal ${MAX_TAG} tekens. Gebruik woorden waar kopers op zoeken.`}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {product && draft && (
          <div className="flex items-center gap-2.5 flex-wrap px-5 py-3.5 flex-none" style={{ borderTop: '1px solid var(--divide)' }}>
            <button className="fynn-btn-ghost" style={{ height: 38, color: '#b91c1c' }} disabled={!!busy} onClick={() => run('reject')}>
              {busy === 'reject' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />} Afkeuren
            </button>
            <div className="flex-1 min-w-0 text-[12.5px]">
              {error && <span style={{ color: '#b91c1c' }}>{error}</span>}
              {!error && notice && <span style={{ color: '#10b981' }}>{notice}</span>}
              {!error && !notice && dirty && <span style={{ color: 'var(--text-m)' }}>Niet opgeslagen wijzigingen</span>}
            </div>
            <button className="fynn-btn-ghost" style={{ height: 38 }} disabled={!!busy || !dirty} onClick={() => run('save')}>
              {busy === 'save' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Opslaan
            </button>
            <button className="fynn-btn" style={{ height: 38 }} disabled={!!busy} onClick={() => run('approve')}>
              {busy === 'approve' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {dirty ? 'Opslaan en goedkeuren' : 'Goedkeuren'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span style={{ color: 'var(--text-m)' }}>{label}: </span>
      <span>{value}</span>
    </div>
  )
}
