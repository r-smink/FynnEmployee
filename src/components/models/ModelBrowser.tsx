'use client'

import { useMemo, useState } from 'react'
import { Search, Check, Eye } from 'lucide-react'
import { formatPrice, type ModelInfo } from '@/hooks/use-models'

type Sort = 'newest' | 'cheapest' | 'context' | 'name'

const SORTS: [Sort, string][] = [['newest', 'Nieuwste'], ['cheapest', 'Goedkoopste'], ['context', 'Grootste context'], ['name', 'Naam']]
const PAGE = 40

// Average of input and output price; unknown prices sort last
const cost = (m: ModelInfo) => m.inputPrice === null || m.outputPrice === null ? Infinity : (m.inputPrice + m.outputPrice) / 2

interface Props {
  models: ModelInfo[]
  selected?: string
  onSelect: (id: string) => void
}

// Searchable list of every OpenRouter model, with provider filter, sorting and a free-only toggle
export function ModelBrowser({ models, selected, onSelect }: Props) {
  const [query, setQuery] = useState('')
  const [provider, setProvider] = useState('')
  const [sort, setSort] = useState<Sort>('newest')
  const [freeOnly, setFreeOnly] = useState(false)
  const [visionOnly, setVisionOnly] = useState(false)
  const [limit, setLimit] = useState(PAGE)

  const providers = useMemo(() => {
    const counts = new Map<string, number>()
    for (const m of models) counts.set(m.provider, (counts.get(m.provider) || 0) + 1)
    return [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  }, [models])

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = models.filter(m =>
      (!provider || m.provider === provider) &&
      (!freeOnly || (m.inputPrice === 0 && m.outputPrice === 0)) &&
      (!visionOnly || m.vision) &&
      (!q || m.id.toLowerCase().includes(q) || m.name.toLowerCase().includes(q)))
    const by: Record<Sort, (a: ModelInfo, b: ModelInfo) => number> = {
      newest: (a, b) => b.created - a.created,
      cheapest: (a, b) => cost(a) - cost(b) || b.created - a.created,
      context: (a, b) => b.context - a.context,
      name: (a, b) => a.name.localeCompare(b.name),
    }
    return list.sort(by[sort])
  }, [models, query, provider, sort, freeOnly, visionOnly])

  const reset = <T,>(fn: (v: T) => void) => (v: T) => { fn(v); setLimit(PAGE) }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-s)' }} />
          <input className="fynn-inp" style={{ paddingLeft: 34 }} value={query} onChange={e => reset(setQuery)(e.target.value)}
            placeholder="Zoek op naam of ID, bijv. claude, gemini, llama…" spellCheck={false} />
        </div>
        <select className="fynn-inp" style={{ width: 'auto' }} value={provider} onChange={e => reset(setProvider)(e.target.value)} aria-label="Provider">
          <option value="">Alle providers ({models.length})</option>
          {providers.map(([p, n]) => <option key={p} value={p}>{p} ({n})</option>)}
        </select>
        <select className="fynn-inp" style={{ width: 'auto' }} value={sort} onChange={e => setSort(e.target.value as Sort)} aria-label="Sorteren">
          {SORTS.map(([v, label]) => <option key={v} value={v}>{label}</option>)}
        </select>
      </div>
      <div className="flex flex-wrap items-center gap-4 mb-3 text-xs" style={{ color: 'var(--text-m)' }}>
        <label className="inline-flex items-center gap-1.5 cursor-pointer">
          <input type="checkbox" checked={freeOnly} onChange={e => reset(setFreeOnly)(e.target.checked)} /> Alleen gratis
        </label>
        <label className="inline-flex items-center gap-1.5 cursor-pointer">
          <input type="checkbox" checked={visionOnly} onChange={e => reset(setVisionOnly)(e.target.checked)} /> Kan afbeeldingen lezen
        </label>
        <span className="ml-auto" style={{ color: 'var(--text-s)' }}>{results.length} modellen</span>
      </div>

      <div className="max-h-[440px] overflow-y-auto pr-1">
        {results.slice(0, limit).map(m => {
          const active = m.id === selected
          return (
            <button key={m.id} type="button" onClick={() => onSelect(m.id)}
              className="fynn-well w-full flex items-center justify-between gap-3 px-3.5 py-[10px] mb-1.5 text-left cursor-pointer"
              style={{ borderRadius: 10, borderColor: active ? 'var(--fyn-purple)' : undefined, background: active ? 'rgba(143,57,172,.12)' : undefined }}>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 min-w-0">
                  {active && <Check className="w-3.5 h-3.5 flex-none" style={{ color: 'var(--fyn-purple)' }} />}
                  <span className="text-[13px] font-semibold truncate" style={{ color: 'var(--text-h)' }}>{m.name}</span>
                  {m.vision && <span title="Kan afbeeldingen lezen"><Eye className="w-3.5 h-3.5 flex-none" style={{ color: 'var(--fyn-blue)' }} /></span>}
                </div>
                <div className="text-[11.5px] truncate" style={{ color: 'var(--text-m)' }}>
                  <code style={{ color: 'var(--fyn-blue)' }}>{m.id}</code> · {Math.round(m.context / 1000)}K context
                </div>
              </div>
              <span className="text-xs font-bold flex-none" style={{ color: '#10b981' }}>{formatPrice(m)}</span>
            </button>
          )
        })}
        {results.length === 0 && <div className="text-xs py-6 text-center" style={{ color: 'var(--text-s)' }}>Geen modellen gevonden</div>}
        {results.length > limit && (
          <button type="button" className="fynn-btn-ghost w-full justify-center mt-1" style={{ height: 36 }} onClick={() => setLimit(l => l + PAGE)}>
            Toon meer ({results.length - limit} over)
          </button>
        )}
      </div>
    </div>
  )
}
