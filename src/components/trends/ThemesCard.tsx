'use client'

import { useEffect, useState } from 'react'
import { CalendarRange, Plus, Pencil, X, Loader2, TrendingUp, RotateCcw } from 'lucide-react'
import { isActive, isSeasonal, formatMonthDay, type DesignTheme } from '@/lib/themes'

type Draft = Omit<DesignTheme, 'id'> & { id?: string; temporary: boolean }

const EMPTY: Draft = { name: '', search: '', start: null, end: null, notes: '', enabled: true, temporary: true }

// "MM-DD" (repeats yearly) <-> the value of a date input, using the current year
const toInput = (md: string | null) => (md ? `${new Date().getFullYear()}-${md}` : '')
const fromInput = (value: string) => (value ? value.slice(5) : null)

function period(t: DesignTheme) {
  return isSeasonal(t) ? `${formatMonthDay(t.start!)} – ${formatMonthDay(t.end!)}` : 'Altijd'
}

function StatusPill({ theme }: { theme: DesignTheme }) {
  const active = isActive(theme)
  const [bg, color, label] = !theme.enabled
    ? ['var(--track)', 'var(--text-s)', 'Uit']
    : active
      ? ['rgba(16,185,129,.15)', '#059669', 'Nu actief']
      : ['var(--well)', 'var(--text-m)', `Vanaf ${formatMonthDay(theme.start!)}`]
  return <span className="fynn-pill flex-none" style={{ background: bg, color }}>{label}</span>
}

// Sort order: running themes first (seasonal before evergreen), then upcoming by start date, then switched off
function rank(t: DesignTheme) {
  if (!t.enabled) return 3
  if (isActive(t)) return isSeasonal(t) ? 0 : 1
  return 2
}

// The themes Luna designs for. Seasonal themes only count inside their period and get most of her work then.
export function ThemesCard({ shopId, onSearch }: { shopId: string; onSearch: (query: string) => void }) {
  const [themes, setThemes] = useState<DesignTheme[]>([])
  const [defaults, setDefaults] = useState<DesignTheme[]>([])
  const [draft, setDraft] = useState<Draft | null>(null)
  const [showAll, setShowAll] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/shops/${shopId}/themes`).then(r => r.json()).then(d => {
      setThemes(d.themes || [])
      setDefaults(d.defaults || [])
    }).catch(() => {})
  }, [shopId])

  const save = async (next: DesignTheme[]): Promise<boolean> => {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/shops/${shopId}/themes`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ themes: next }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Opslaan mislukt')
      setThemes(data.themes)
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Opslaan mislukt')
      return false
    } finally {
      setSaving(false)
    }
  }

  const submitDraft = async () => {
    if (!draft) return
    const { temporary, ...rest } = draft
    const theme = { ...rest, id: draft.id ?? '', start: temporary ? draft.start : null, end: temporary ? draft.end : null }
    const next = draft.id ? themes.map(t => (t.id === draft.id ? theme : t)) : [...themes, theme]
    if (await save(next)) setDraft(null)
  }

  const sorted = [...themes].sort((a, b) => rank(a) - rank(b) || (a.start ?? '').localeCompare(b.start ?? ''))
  const running = sorted.filter(t => isActive(t))
  const visible = showAll ? sorted : running
  const seasonalRunning = running.filter(isSeasonal).length

  return (
    <div className="fynn-card p-[22px] mb-[18px]">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-1">
        <div className="flex items-center gap-[9px]">
          <CalendarRange className="w-[18px] h-[18px]" style={{ color: 'var(--fyn-purple)' }} />
          <h3 className="fynn-section-title">Thema&apos;s voor Luna</h3>
        </div>
        <button type="button" className="fynn-btn-ghost" style={{ height: 34, fontSize: 12.5 }}
          onClick={() => setDraft({ ...EMPTY })} disabled={saving}>
          <Plus className="w-4 h-4" /> Thema toevoegen
        </button>
      </div>
      <div className="fynn-hint mb-3.5">
        Luna ontwerpt alleen voor actieve thema&apos;s. Tijdelijke thema&apos;s komen elk jaar terug in hun periode en krijgen dan
        het meeste werk{seasonalRunning ? ` (nu ${seasonalRunning} actief)` : ''}. Met een Etsy-sleutel krijgen Luna en Nova de
        echte marktcijfers van elk thema mee.
      </div>

      {error && <p className="text-xs px-3 py-2 rounded-lg mb-3" style={{ background: 'var(--fyn-danger-light)', color: '#b91c1c' }}>{error}</p>}

      {draft && (
        <div className="rounded-xl p-4 mb-3.5" style={{ background: 'var(--well)', border: '1px solid var(--well-border)' }}>
          <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))' }}>
            <div>
              <label className="fynn-label">Naam</label>
              <input className="fynn-inp" value={draft.name} maxLength={60} placeholder="bijv. Koningsdag"
                onChange={e => setDraft({ ...draft, name: e.target.value })} />
            </div>
            <div>
              <label className="fynn-label">Etsy-zoekwoorden (Engels)</label>
              <input className="fynn-inp" value={draft.search} maxLength={80} placeholder="bijv. kings day orange"
                onChange={e => setDraft({ ...draft, search: e.target.value })} />
            </div>
          </div>
          <div className="flex flex-wrap items-end gap-3 mt-3">
            <div>
              <label className="fynn-label">Periode</label>
              <select className="fynn-inp" style={{ width: 'auto' }} value={draft.temporary ? 'temp' : 'always'}
                onChange={e => setDraft({ ...draft, temporary: e.target.value === 'temp' })}>
                <option value="temp">Tijdelijk (elk jaar)</option>
                <option value="always">Altijd</option>
              </select>
            </div>
            {draft.temporary && (
              <>
                <div>
                  <label className="fynn-label">Van</label>
                  <input type="date" className="fynn-inp" value={toInput(draft.start)}
                    onChange={e => setDraft({ ...draft, start: fromInput(e.target.value) })} />
                </div>
                <div>
                  <label className="fynn-label">Tot en met</label>
                  <input type="date" className="fynn-inp" value={toInput(draft.end)}
                    onChange={e => setDraft({ ...draft, end: fromInput(e.target.value) })} />
                </div>
              </>
            )}
          </div>
          {draft.temporary && (
            <div className="text-[11.5px] mt-1.5" style={{ color: 'var(--text-s)' }}>
              Het jaartal telt niet mee. Begin een paar weken voor de feestdag: kopers bestellen vroeg en nieuwe listings hebben tijd nodig.
            </div>
          )}
          <label className="fynn-label mt-3">Aanwijzingen voor Luna (optioneel)</label>
          <textarea className="fynn-inp" rows={2} maxLength={300} value={draft.notes}
            placeholder="bijv. oranje en rood-wit-blauw, vrolijk, geen kroon-logo's"
            onChange={e => setDraft({ ...draft, notes: e.target.value })} />
          <div className="flex gap-2.5 mt-3">
            <button type="button" className="fynn-btn" onClick={submitDraft}
              disabled={saving || !draft.name.trim() || (draft.temporary && (!draft.start || !draft.end))}>
              {saving && <Loader2 className="w-4 h-4 animate-spin" />} {draft.id ? 'Opslaan' : 'Toevoegen'}
            </button>
            <button type="button" className="fynn-btn-ghost" onClick={() => setDraft(null)}>Annuleren</button>
          </div>
        </div>
      )}

      {visible.length === 0 ? (
        <div className="text-[12.5px] py-3" style={{ color: 'var(--text-m)' }}>
          Geen actief thema. Luna valt terug op algemene trending ontwerpen.
        </div>
      ) : (
        <div>
          {visible.map(t => (
            <div key={t.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2" style={{ borderTop: '1px solid var(--divide)' }}>
              <input type="checkbox" checked={t.enabled} disabled={saving} aria-label={`${t.name} aan of uit`}
                className="w-4 h-4 cursor-pointer accent-[var(--fyn-purple)]"
                onChange={() => save(themes.map(x => (x.id === t.id ? { ...x, enabled: !x.enabled } : x)))} />
              <div className="flex-1 min-w-[160px]">
                <div className="text-[13px] font-semibold" style={{ color: t.enabled ? 'var(--text-h)' : 'var(--text-s)' }}>{t.name}</div>
                <div className="text-[11.5px] truncate" style={{ color: 'var(--text-s)' }} title={t.notes || undefined}>
                  {period(t)} · zoekt op &quot;{t.search}&quot;{t.notes ? ` · ${t.notes}` : ''}
                </div>
              </div>
              <StatusPill theme={t} />
              <div className="flex items-center">
                <button type="button" className="fynn-zoom-btn" title="Bekijk de markt voor dit thema" aria-label={`Markt voor ${t.name}`}
                  onClick={() => onSearch(t.search)}><TrendingUp className="w-4 h-4" /></button>
                <button type="button" className="fynn-zoom-btn" title="Bewerken" aria-label={`${t.name} bewerken`}
                  onClick={() => setDraft({ ...t, temporary: isSeasonal(t) })}><Pencil className="w-4 h-4" /></button>
                <button type="button" className="fynn-zoom-btn" title="Verwijderen" aria-label={`${t.name} verwijderen`} disabled={saving}
                  onClick={() => save(themes.filter(x => x.id !== t.id))}><X className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 pt-3" style={{ borderTop: '1px solid var(--divide)' }}>
        <button type="button" className="text-[12.5px] font-semibold cursor-pointer" style={{ color: 'var(--fyn-purple)' }}
          onClick={() => setShowAll(s => !s)}>
          {showAll ? 'Alleen actieve thema\'s' : `Alle thema's tonen (${themes.length})`}
        </button>
        {showAll && defaults.length > 0 && (
          <button type="button" className="inline-flex items-center gap-1.5 text-[12px] cursor-pointer" style={{ color: 'var(--text-m)' }}
            disabled={saving}
            onClick={() => { if (window.confirm('Je eigen thema\'s vervangen door de standaardlijst?')) save(defaults) }}>
            <RotateCcw className="w-3.5 h-3.5" /> Standaardlijst terugzetten
          </button>
        )}
      </div>
    </div>
  )
}
