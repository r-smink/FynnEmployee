'use client'

import { useId, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { ModelBrowser } from './ModelBrowser'
import { useModels, featuredModels, formatPrice } from '@/hooks/use-models'

interface Props {
  value: string
  onChange: (model: string) => void
  // Agent form: empty value means "use the global default"
  allowDefault?: boolean
}

export function ModelPicker({ value, onChange, allowDefault }: Props) {
  const listId = useId()
  const [browsing, setBrowsing] = useState(false)
  const { models, defaultModel, live, loading } = useModels()
  const trimmed = value.trim()
  const selected = models.find(m => m.id === trimmed)
  const featured = featuredModels(models)

  return (
    <div>
      <input
        className="fynn-inp"
        list={listId}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={allowDefault ? `Standaard (${defaultModel || '…'})` : 'provider/model, bijv. anthropic/claude-haiku-5.5'}
        spellCheck={false}
      />
      <datalist id={listId}>
        {models.map(m => <option key={m.id} value={m.id}>{`${m.name} · ${formatPrice(m)}`}</option>)}
      </datalist>

      <div className="text-[11.5px] mt-1.5 min-h-4" style={{ color: 'var(--text-s)' }}>
        {loading ? 'Modellen laden…'
          : selected ? <span><b style={{ color: 'var(--text-b)' }}>{selected.name}</b> · {formatPrice(selected)} · {Math.round(selected.context / 1000)}K context</span>
          : trimmed && live ? <span style={{ color: '#d97706' }}>Onbekend model op OpenRouter — controleer de ID</span>
          : !trimmed && allowDefault ? 'Gebruikt het standaardmodel uit Instellingen'
          : !live ? 'Modellijst niet bereikbaar — je kunt een model-ID handmatig invullen'
          : `${models.length} modellen beschikbaar — typ om te zoeken`}
      </div>

      {featured.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {allowDefault && (
            <button type="button" onClick={() => onChange('')} className="px-2.5 py-1 rounded-full text-[11px] font-semibold cursor-pointer"
              style={{ background: !trimmed ? 'rgba(143,57,172,.18)' : 'var(--well)', border: '1px solid var(--well-border)', color: !trimmed ? 'var(--fyn-purple)' : 'var(--text-m)' }}>
              Standaard
            </button>
          )}
          {featured.map(m => (
            <button key={m.id} type="button" onClick={() => onChange(m.id)} title={`${m.id} · ${formatPrice(m)}`}
              className="px-2.5 py-1 rounded-full text-[11px] font-semibold cursor-pointer"
              style={{ background: trimmed === m.id ? 'rgba(143,57,172,.18)' : 'var(--well)', border: '1px solid var(--well-border)', color: trimmed === m.id ? 'var(--fyn-purple)' : 'var(--text-m)' }}>
              {m.name}
            </button>
          ))}
          {models.length > featured.length && (
            <button type="button" onClick={() => setBrowsing(b => !b)}
              className="px-2.5 py-1 rounded-full text-[11px] font-semibold cursor-pointer inline-flex items-center gap-1"
              style={{ background: 'transparent', border: '1px dashed var(--well-border)', color: 'var(--fyn-blue)' }}>
              {browsing ? 'Verberg lijst' : `Alle ${models.length} modellen`}
              <ChevronDown className="w-3 h-3" style={{ transform: browsing ? 'rotate(180deg)' : 'none' }} />
            </button>
          )}
        </div>
      )}

      {browsing && (
        <div className="mt-3">
          <ModelBrowser models={models} selected={trimmed} onSelect={id => { onChange(id); setBrowsing(false) }} />
        </div>
      )}
    </div>
  )
}
