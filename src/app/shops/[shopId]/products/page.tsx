'use client'

import { use, useState, useEffect, useCallback } from 'react'
import { Search, TrendingUp, Package, Shirt, ShoppingBag, Coffee, Smartphone, Image as ImageIcon, Sparkles, Home, Loader2, ExternalLink, AlertTriangle, RotateCw, Trash2 } from 'lucide-react'
import { Topbar } from '@/components/layout/topbar'
import { PageBody } from '@/components/layout/app-shell'
import { euro } from '@/lib/labels'
import { useAiMode, SETTINGS_CHANGED_EVENT } from '@/hooks/use-ai-mode'
import { DemoNotice } from '@/components/layout/demo-notice'
import { DesignReview, CHECKER } from '@/components/products/DesignReview'

interface Product {
  id: string
  title: string
  description: string
  category: string
  price: number
  base_cost: number
  status: string
  sales_count: number
  tags: string
  design_url?: string | null
  created_at: string
  etsy_listing_id?: string | null
  publish_status?: string | null
  publish_step?: string | null
  publish_error?: string | null
}

const DEMO_PRODUCTS: Product[] = [
  { id: '1', title: 'Tropical Sunset T-Shirt', description: 'Levendig zonsondergang-ontwerp op premium katoen', category: 'T-Shirts', price: 29.99, base_cost: 12.50, status: 'listed', sales_count: 47, tags: '["sunset","tropical","summer"]', created_at: '2024-10-15' },
  { id: '2', title: 'Mountain Adventure Tote Bag', description: 'Natuur-geïnspireerde tote voor outdoor-liefhebbers', category: 'Bags', price: 24.99, base_cost: 8.75, status: 'listed', sales_count: 32, tags: '["mountain","adventure","nature"]', created_at: '2024-10-16' },
  { id: '3', title: 'Ocean Waves Mug', description: 'Rustgevend oceaan-ontwerp op keramische mok', category: 'Mugs', price: 16.99, base_cost: 5.50, status: 'listed', sales_count: 58, tags: '["ocean","waves","blue"]', created_at: '2024-10-17' },
  { id: '4', title: 'Boho Mandala Phone Case', description: 'Fijn mandala-patroon op duurzaam hoesje', category: 'Phone Cases', price: 19.99, base_cost: 6.00, status: 'listed', sales_count: 23, tags: '["boho","mandala","pattern"]', created_at: '2024-10-18' },
  { id: '5', title: 'Retro Space Poster', description: 'Vintage ruimtevaart-kunstprint', category: 'Posters', price: 22.99, base_cost: 4.25, status: 'listed', sales_count: 41, tags: '["space","retro","vintage"]', created_at: '2024-10-19' },
  { id: '6', title: 'Nordic Forest Hoodie', description: 'Minimalistisch bos-ontwerp op warme hoodie', category: 'Hoodies', price: 44.99, base_cost: 18.00, status: 'listed', sales_count: 19, tags: '["nordic","forest","minimalist"]', created_at: '2024-10-20' },
  { id: '7', title: 'Cosmic Galaxy Sticker Set', description: '12 vinyl stickers met galaxy-thema', category: 'Stickers', price: 12.99, base_cost: 2.50, status: 'listed', sales_count: 89, tags: '["galaxy","cosmic","stickers"]', created_at: '2024-10-21' },
  { id: '8', title: 'Zen Garden Pillow Cover', description: 'Rustige zen-tuin illustratie', category: 'Home', price: 34.99, base_cost: 11.00, status: 'draft', sales_count: 0, tags: '["zen","garden","peaceful"]', created_at: '2024-10-22' },
]

const THUMBS = [
  'linear-gradient(135deg,#f97316,#fb7185)', 'linear-gradient(135deg,#059669,#10b981)', 'linear-gradient(135deg,#0ea5e9,#2563eb)',
  'linear-gradient(135deg,#8F39AC,#c026d3)', 'linear-gradient(135deg,#6366f1,#8b5cf6)', 'linear-gradient(135deg,#0f766e,#14b8a6)',
  'linear-gradient(135deg,#7c3aed,#ec4899)', 'linear-gradient(135deg,#334155,#64748b)',
]

const STATUS: Record<string, { bg: string; label: string }> = {
  listed: { bg: 'rgba(16,185,129,.9)', label: 'Listed' },
  draft: { bg: 'rgba(0,0,0,.45)', label: 'Concept' },
  review: { bg: 'rgba(143,57,172,.9)', label: 'Te beoordelen' },
  sold_out: { bg: 'rgba(239,68,68,.9)', label: 'Uitverkocht' },
}

function categoryIcon(category: string) {
  const c = (category || '').toLowerCase()
  if (/shirt|hoodie|tee|apparel/.test(c)) return Shirt
  if (/bag|tote/.test(c)) return ShoppingBag
  if (/mug|cup/.test(c)) return Coffee
  if (/phone|case/.test(c)) return Smartphone
  if (/poster|print|art/.test(c)) return ImageIcon
  if (/sticker/.test(c)) return Sparkles
  if (/home|pillow/.test(c)) return Home
  return Package
}

// Where an approved design is on its way to Etsy (see lib/publish.ts)
function PublishState({ shopId, product, onChange }: { shopId: string; product: Product; onChange: () => void }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { publish_status: status, etsy_listing_id: listingId } = product
  if (!status) return null

  const retry = async () => {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/shops/${shopId}/products/${product.id}/publish`, { method: 'POST' })
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Opnieuw proberen mislukt')
      onChange()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Opnieuw proberen mislukt')
    }
    setBusy(false)
  }

  const link = (href: string, label: string) => (
    <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold" style={{ color: 'var(--fyn-blue)' }}>
      {label} <ExternalLink className="w-3 h-3" />
    </a>
  )

  return (
    <div className="text-[11.5px] leading-[1.45] mb-3 px-2.5 py-2 rounded-lg" style={{ background: 'var(--well)', border: '1px solid var(--well-border)', color: 'var(--text-m)' }}>
      {status === 'publishing' && (
        <span className="inline-flex items-center gap-1.5">
          <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: 'var(--fyn-purple)' }} />
          Naar Etsy: {product.publish_step || 'starten'}…
        </span>
      )}
      {status === 'etsy_draft' && listingId && (
        <span>Concept op Etsy. {link(`https://www.etsy.com/your/shops/me/listing-editor/edit/${listingId}`, 'Bekijken en publiceren')}</span>
      )}
      {status === 'etsy_live' && listingId && (
        <span style={{ color: '#059669' }}>Live op Etsy. {link(`https://www.etsy.com/listing/${listingId}`, 'Bekijk listing')}</span>
      )}
      {status === 'failed' && (
        <>
          <span className="flex items-start gap-1.5" style={{ color: '#b91c1c' }}>
            <AlertTriangle className="w-3.5 h-3.5 mt-px shrink-0" /> {product.publish_error || 'Op Etsy zetten mislukt'}
          </span>
          {error && <span className="block mt-1" style={{ color: '#b91c1c' }}>{error}</span>}
          <button className="fynn-btn-ghost mt-2" style={{ height: 30, fontSize: 12 }} disabled={busy} onClick={retry}>
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCw className="w-3.5 h-3.5" />} Opnieuw proberen
          </button>
        </>
      )}
    </div>
  )
}

// Removes the product here and its listing on Etsy; asks once more inside the card before doing it
function DeleteProduct({ shopId, product, onChange }: { shopId: string; product: Product; onChange: () => void }) {
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  if (product.publish_status === 'publishing') return null

  const remove = async () => {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/shops/${shopId}/products/${product.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Verwijderen mislukt')
      onChange()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Verwijderen mislukt')
      setBusy(false)
    }
  }

  return (
    <div className="mt-3 text-[11.5px]">
      {error && <p className="px-2.5 py-2 rounded-lg mb-2" style={{ background: 'var(--fyn-danger-light)', color: '#b91c1c' }}>{error}</p>}
      {confirming ? (
        <div className="px-2.5 py-2 rounded-lg" style={{ background: 'var(--fyn-danger-light)', color: '#b91c1c' }}>
          <p className="mb-2 leading-[1.45]">
            {product.etsy_listing_id
              ? 'Dit verwijdert het product hier én de listing op Etsy. Dat kan niet ongedaan worden.'
              : 'Dit verwijdert het product. Dat kan niet ongedaan worden.'}
          </p>
          <div className="flex gap-2">
            <button className="fynn-btn-ghost" style={{ height: 30, fontSize: 12, color: '#b91c1c' }} disabled={busy} onClick={remove}>
              {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />} Ja, verwijderen
            </button>
            <button className="fynn-btn-ghost" style={{ height: 30, fontSize: 12 }} disabled={busy} onClick={() => setConfirming(false)}>
              Annuleren
            </button>
          </div>
        </div>
      ) : (
        <button className="inline-flex items-center gap-1.5 font-semibold" style={{ color: 'var(--text-s)' }} onClick={() => setConfirming(true)}>
          <Trash2 className="w-3.5 h-3.5" /> Verwijderen
        </button>
      )}
    </div>
  )
}

function parseTags(raw: string): string[] {
  try { return JSON.parse(raw || '[]') } catch { return [] }
}

export default function ProductsPage({ params }: { params: Promise<{ shopId: string }> }) {
  const { shopId } = use(params)
  const { showDemoData } = useAiMode()
  const [realProducts, setRealProducts] = useState<Product[]>([])
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('')
  const [status, setStatus] = useState('')

  const load = useCallback(() => fetch(`/api/shops/${shopId}/products`).then(r => r.json()).then(data => {
    if (Array.isArray(data)) setRealProducts(data)
  }).catch(() => {}), [shopId])

  useEffect(() => {
    load()
    // Luna adds designs and approved ones move to Etsy while the page is open
    const interval = setInterval(load, 5000)
    window.addEventListener(SETTINGS_CHANGED_EVENT, load)
    return () => {
      clearInterval(interval)
      window.removeEventListener(SETTINGS_CHANGED_EVENT, load)
    }
  }, [load])

  // Designs awaiting review get their own section; rejected and deleted ones are hidden
  const toReview = realProducts.filter(p => p.status === 'review')
  const catalog = realProducts.filter(p => !['review', 'rejected', 'deleted'].includes(p.status))

  // Example products only in demo mode, and only while there are no real ones
  const demo = showDemoData && catalog.length === 0 && toReview.length === 0
  const products = demo ? DEMO_PRODUCTS : catalog

  const categories = [...new Set(products.map(p => p.category).filter(Boolean))].sort()
  const q = query.trim().toLowerCase()
  const visible = products.filter(p =>
    (!category || p.category === category) &&
    (!status || p.status === status) &&
    (!q || p.title.toLowerCase().includes(q) || parseTags(p.tags).some(t => t.toLowerCase().includes(q)))
  )

  return (
    <>
      <Topbar title="Producten" subtitle={`${products.length} producten in de catalogus`} />
      <PageBody>
        {demo && <DemoNotice />}
        <DesignReview shopId={shopId} products={toReview.map(p => ({ ...p, design_url: p.design_url ?? null }))} onChange={load} />
        <div className="flex flex-wrap gap-2.5 items-center mb-[18px]">
          <div className="flex items-center gap-[9px] flex-1 min-w-[220px] h-[42px] px-3.5 rounded-[10px]"
            style={{ background: 'var(--card)', border: '1.5px solid var(--input-border)' }}>
            <Search className="w-4 h-4" style={{ color: 'var(--text-s)' }} />
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Zoek producten of tags…"
              className="flex-1 bg-transparent border-none outline-none text-[13.5px]" style={{ color: 'var(--text-b)' }} />
          </div>
          <select className="fynn-inp" style={{ width: 'auto', height: 42, borderWidth: 1.5, fontWeight: 600, fontSize: 12.5 }}
            value={category} onChange={e => setCategory(e.target.value)}>
            <option value="">Alle categorieën</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select className="fynn-inp" style={{ width: 'auto', height: 42, borderWidth: 1.5, fontWeight: 600, fontSize: 12.5 }}
            value={status} onChange={e => setStatus(e.target.value)}>
            <option value="">Alle statussen</option>
            {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>

        {visible.length === 0 ? (
          <div className="fynn-card py-16 text-center text-[13px]" style={{ color: 'var(--text-m)' }}>
            {products.length === 0
              ? 'Nog geen producten. Ontwerpen van Luna die je goedkeurt verschijnen hier.'
              : 'Geen producten gevonden'}
          </div>
        ) : (
          <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(250px,1fr))' }}>
            {visible.map((p, i) => {
              const st = STATUS[p.status] || STATUS.draft
              const Icon = categoryIcon(p.category)
              return (
                <div key={p.id} className="fynn-card overflow-hidden">
                  <div className="h-[148px] flex items-center justify-center relative" style={{ background: p.design_url ? CHECKER : THUMBS[i % THUMBS.length] }}>
                    {p.design_url
                      ? <img src={p.design_url} alt={p.title} className="w-full h-full object-contain p-2.5" />
                      : <Icon className="w-10 h-10" style={{ color: 'rgba(255,255,255,.92)' }} />}
                    <span className="absolute top-2.5 right-2.5 px-2.5 py-[3px] rounded-full text-white text-[11px] font-bold"
                      style={{ background: st.bg, backdropFilter: 'blur(4px)' }}>{st.label}</span>
                  </div>
                  <div className="p-4">
                    <div className="text-sm font-bold leading-[1.3] mb-1.5" style={{ color: 'var(--text-h)' }}>{p.title}</div>
                    <div className="text-xs leading-[1.45] mb-3 min-h-[34px] line-clamp-2" style={{ color: 'var(--text-m)' }}>{p.description}</div>
                    {!demo && <PublishState shopId={shopId} product={p} onChange={load} />}
                    <div className="flex flex-wrap gap-1.5 mb-3.5">
                      {parseTags(p.tags).slice(0, 3).map(t => (
                        <span key={t} className="px-[9px] py-[3px] rounded-full text-[11px] font-semibold"
                          style={{ background: 'var(--well)', border: '1px solid var(--well-border)', color: 'var(--text-m)' }}>{t}</span>
                      ))}
                    </div>
                    <div className="flex items-center justify-between pt-[13px]" style={{ borderTop: '1px solid var(--divide)' }}>
                      <div className="flex items-baseline gap-[7px]">
                        <span className="text-[17px] font-bold" style={{ color: 'var(--text-h)' }}>{euro(p.price)}</span>
                        <span className="text-xs font-bold" style={{ color: '#10b981' }}>+{euro(p.price - p.base_cost)}</span>
                      </div>
                      <div className="flex items-center gap-[5px] text-xs" style={{ color: 'var(--text-m)' }}>
                        <TrendingUp className="w-3.5 h-3.5" style={{ color: 'var(--fyn-blue)' }} />
                        {p.sales_count} verkocht
                      </div>
                    </div>
                    {!demo && <DeleteProduct shopId={shopId} product={p} onChange={load} />}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </PageBody>
    </>
  )
}
