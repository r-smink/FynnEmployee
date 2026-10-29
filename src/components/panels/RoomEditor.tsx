'use client'

import { useEffect, useState } from 'react'
import { Minus, Plus, Trash2, Loader2, Check } from 'lucide-react'
import { ROOM_FUNCTIONS, ROOM_FUNCTION_IDS, ROOM_SIZE_MAX, validatePlacement, type OfficeGrid, type Room, type RoomFunction } from '@/lib/office'
import type { AgentData } from '@/hooks/use-agents'
import type { RoomInput } from '@/hooks/use-office'

export type RoomDraft = Required<Omit<RoomInput, 'agent_id'>> & { agent_id: string | null }

export function draftFor(fn: RoomFunction, col: number, row: number): RoomDraft {
  const def = ROOM_FUNCTIONS[fn]
  return { name: def.label, function: fn, color: def.color, col, row, width: 1, depth: 1, agent_id: null }
}

function Stepper({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void }) {
  const btn = 'w-9 h-9 flex items-center justify-center rounded-lg cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed'
  return (
    <div>
      <label className="fynn-label">{label}</label>
      <div className="flex items-center gap-1.5">
        <button type="button" className={btn} style={{ background: 'var(--well)', border: '1px solid var(--well-border)' }}
          disabled={value <= min} onClick={() => onChange(value - 1)} aria-label={`${label} verlagen`}>
          <Minus className="w-3.5 h-3.5" style={{ color: 'var(--text-b)' }} />
        </button>
        <span className="w-8 text-center text-[15px] font-bold" style={{ color: 'var(--text-h)' }}>{value}</span>
        <button type="button" className={btn} style={{ background: 'var(--well)', border: '1px solid var(--well-border)' }}
          disabled={value >= max} onClick={() => onChange(value + 1)} aria-label={`${label} verhogen`}>
          <Plus className="w-3.5 h-3.5" style={{ color: 'var(--text-b)' }} />
        </button>
      </div>
    </div>
  )
}

interface Props {
  room: Room | null          // null = new room
  initial: RoomDraft
  grid: OfficeGrid
  rooms: Room[]
  agents: AgentData[]
  onSave: (draft: RoomDraft) => Promise<string | null>
  onDelete?: () => Promise<string | null>
  onDone: () => void
}

export function RoomEditor({ room, initial, grid, rooms, agents, onSave, onDelete, onDone }: Props) {
  const [draft, setDraft] = useState<RoomDraft>(initial)
  const [saving, setSaving] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  useEffect(() => { setDraft(initial); setServerError(null) }, [initial])

  const set = <K extends keyof RoomDraft>(key: K, value: RoomDraft[K]) => {
    setDraft(d => ({ ...d, [key]: value }))
    setServerError(null)
  }

  const changeFunction = (fn: RoomFunction) => {
    const prev = ROOM_FUNCTIONS[draft.function]
    const next = ROOM_FUNCTIONS[fn]
    setDraft(d => ({
      ...d,
      function: fn,
      // keep custom names/colors, replace untouched defaults
      name: d.name === prev.label ? next.label : d.name,
      color: d.color === prev.color ? next.color : d.color,
    }))
    setServerError(null)
  }

  const placementError = validatePlacement({ ...draft, id: room?.id }, rooms, grid)
  const error = placementError || serverError
  const roomOfAgent = (agentId: string) => rooms.find(r => r.agent_id === agentId && r.id !== room?.id)

  const save = async () => {
    setSaving(true)
    const err = await onSave(draft)
    setSaving(false)
    if (err) setServerError(err)
    else onDone()
  }

  const remove = async () => {
    if (!onDelete || !confirm(`Kamer "${room?.name}" verwijderen?`)) return
    setSaving(true)
    const err = await onDelete()
    setSaving(false)
    if (err) setServerError(err)
    else onDone()
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="fynn-label">Functie</label>
        <select className="fynn-inp" value={draft.function} onChange={e => changeFunction(e.target.value as RoomFunction)}>
          {ROOM_FUNCTION_IDS.map(id => <option key={id} value={id}>{ROOM_FUNCTIONS[id].label}</option>)}
        </select>
        <p className="fynn-hint mt-1.5 mb-0">{ROOM_FUNCTIONS[draft.function].description}</p>
      </div>

      <div>
        <label className="fynn-label">Naam</label>
        <input className="fynn-inp" value={draft.name} maxLength={40} onChange={e => set('name', e.target.value)} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Stepper label="Breedte" value={draft.width} min={1} max={Math.min(ROOM_SIZE_MAX, grid.cols)} onChange={v => set('width', v)} />
        <Stepper label="Diepte" value={draft.depth} min={1} max={Math.min(ROOM_SIZE_MAX, grid.rows)} onChange={v => set('depth', v)} />
        <Stepper label="Kolom" value={draft.col + 1} min={1} max={grid.cols} onChange={v => set('col', v - 1)} />
        <Stepper label="Rij" value={draft.row + 1} min={1} max={grid.rows} onChange={v => set('row', v - 1)} />
      </div>

      <div>
        <label className="fynn-label">Kleur</label>
        <div className="flex items-center gap-3">
          <input type="color" value={draft.color} onChange={e => set('color', e.target.value)}
            className="w-11 h-11 rounded-lg cursor-pointer" style={{ border: '2px solid var(--input-border)', background: 'var(--input-bg)' }} />
          <code className="text-[12.5px]" style={{ color: 'var(--text-m)' }}>{draft.color}</code>
        </div>
      </div>

      <div>
        <label className="fynn-label">Medewerker</label>
        <select className="fynn-inp" value={draft.agent_id || ''} onChange={e => set('agent_id', e.target.value || null)}>
          <option value="">Geen (lege kamer)</option>
          {agents.map(a => {
            const other = roomOfAgent(a.id)
            return <option key={a.id} value={a.id}>{a.name}{other ? ` — verhuist uit ${other.name}` : ''}</option>
          })}
        </select>
      </div>

      {error && (
        <p className="text-[12.5px] px-3 py-2.5 rounded-lg" style={{ background: 'var(--fyn-danger-light)', color: '#b91c1c' }}>{error}</p>
      )}

      <div className="flex items-center gap-2.5 pt-1">
        <button className="fynn-btn" onClick={save} disabled={saving || !!placementError || !draft.name.trim()}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          {room ? 'Opslaan' : 'Kamer toevoegen'}
        </button>
        <button className="fynn-btn-ghost" onClick={onDone} disabled={saving}>Annuleren</button>
        {room && onDelete && (
          <button className="ml-auto w-[42px] h-[42px] rounded-[9px] flex items-center justify-center cursor-pointer"
            style={{ background: 'var(--fyn-danger-light)' }} onClick={remove} disabled={saving} title="Kamer verwijderen">
            <Trash2 className="w-4 h-4" style={{ color: '#b91c1c' }} />
          </button>
        )}
      </div>
    </div>
  )
}
