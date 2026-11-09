'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { nl } from 'date-fns/locale'
import { Send, Loader2, X, ChevronDown } from 'lucide-react'
import { parseDbDate } from '@/lib/revenue'
import type { AgentData } from '@/hooks/use-agents'

interface Assignment {
  id: string
  text: string | null
  status: 'queued' | 'in_progress' | 'completed' | 'failed'
  priority: number
  created_at: string
  result: string | null
  design: string | null
  error: string | null
}

const PRIORITIES = [
  { value: 1, label: 'Normaal' },
  { value: 2, label: 'Hoog' },
  { value: 3, label: 'Urgent' },
]

const STATUS: Record<Assignment['status'], { label: string; color: string }> = {
  queued: { label: 'In de wachtrij', color: '#d97706' },
  in_progress: { label: 'Bezig', color: 'var(--fyn-purple)' },
  completed: { label: 'Klaar', color: '#059669' },
  failed: { label: 'Mislukt', color: '#dc2626' },
}

const ago = (value: string) => {
  try { return formatDistanceToNow(parseDbDate(value), { addSuffix: true, locale: nl }) } catch { return '' }
}

// Give an agent an assignment that goes before its own work, and see what came of the last ones
export function AgentAssignments({ agent }: { agent: AgentData }) {
  const [text, setText] = useState('')
  const [priority, setPriority] = useState(2)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [items, setItems] = useState<Assignment[]>([])
  const [open, setOpen] = useState<string | null>(null)
  const base = `/api/shops/${agent.shop_id}/agents/${agent.id}/tasks`
  const isDesigner = agent.template_type === 'design'

  const load = useCallback(() => fetch(base).then(r => r.json()).then(d => {
    if (Array.isArray(d)) setItems(d)
  }).catch(() => {}), [base])

  useEffect(() => {
    load()
    const interval = setInterval(load, 5000)
    return () => clearInterval(interval)
  }, [load])

  const send = async () => {
    setSending(true)
    setError(null)
    try {
      const res = await fetch(base, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text, priority }) })
      const r = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(r.error || 'Opdracht geven mislukt')
      setText('')
      if (r.paused) setError(`${agent.name} staat uit. De opdracht wacht tot je ${agent.name} weer aanzet.`)
      load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Opdracht geven mislukt')
    }
    setSending(false)
  }

  const cancel = async (id: string) => {
    await fetch(`${base}?taskId=${id}`, { method: 'DELETE' }).catch(() => {})
    load()
  }

  return (
    <div>
      <h4 className="text-xs font-bold uppercase tracking-[.05em] mb-2" style={{ color: 'var(--text-m)' }}>Opdracht geven</h4>
      <div className="fynn-well p-3">
        <textarea className="fynn-inp" rows={3} value={text} onChange={e => setText(e.target.value)} maxLength={2000}
          placeholder={isDesigner
            ? 'Bijv. "Maak een mok met een slapende kat in pastelkleuren"'
            : `Wat moet ${agent.name} nu doen?`}
          style={{ height: 'auto', resize: 'vertical', paddingTop: 8, paddingBottom: 8 }} />
        <p className="text-[11.5px] mt-1.5 mb-2 leading-[1.45]" style={{ color: 'var(--text-s)' }}>
          {isDesigner
            ? `${agent.name} maakt er een echt ontwerp van, ook boven de daglimiet. Noem een producttype (shirt, tas, mok, poster, sticker) of ze kiest er zelf een.`
            : `${agent.name} werkt het uit en zet het resultaat hieronder. Gaat voor het gewone werk.`}
        </p>
        <div className="flex items-center gap-2">
          <select className="fynn-inp" style={{ width: 'auto', height: 34, fontSize: 12.5 }} value={priority}
            onChange={e => setPriority(Number(e.target.value))} aria-label="Prioriteit">
            {PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
          <button className="fynn-btn flex-1" style={{ height: 34, fontSize: 12.5 }} disabled={sending || text.trim().length < 3} onClick={send}>
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Opdracht geven
          </button>
        </div>
        {error && <p className="text-xs px-3 py-2 rounded-lg mt-2.5 mb-0" style={{ background: 'var(--fyn-danger-light)', color: '#b91c1c' }}>{error}</p>}
      </div>

      {items.length > 0 && (
        <div className="mt-2.5 space-y-1.5">
          {items.map(a => {
            const st = STATUS[a.status] ?? STATUS.queued
            const expanded = open === a.id
            const detail = a.error || a.result
            return (
              <div key={a.id} className="fynn-well px-3 py-2">
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-[12.5px] leading-[1.45] m-0 line-clamp-2" style={{ color: 'var(--text-b)' }}>{a.text}</p>
                    <p className="text-[11px] m-0 mt-0.5" style={{ color: 'var(--text-s)' }}>
                      <span className="font-bold" style={{ color: st.color }}>
                        {a.status === 'in_progress' && <Loader2 className="w-3 h-3 animate-spin inline mr-1 -mt-px" />}{st.label}
                      </span>
                      {' · '}{PRIORITIES.find(p => p.value === a.priority)?.label ?? 'Normaal'} · {ago(a.created_at)}
                    </p>
                  </div>
                  {a.status === 'queued' && (
                    <button onClick={() => cancel(a.id)} title="Annuleren" aria-label="Opdracht annuleren" className="flex-none p-0.5 cursor-pointer" style={{ color: 'var(--text-s)' }}>
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {detail && (
                    <button onClick={() => setOpen(expanded ? null : a.id)} title={expanded ? 'Inklappen' : 'Resultaat bekijken'}
                      aria-label={expanded ? 'Inklappen' : 'Resultaat bekijken'} className="flex-none p-0.5 cursor-pointer" style={{ color: 'var(--text-s)' }}>
                      <ChevronDown className="w-3.5 h-3.5 transition-transform" style={{ transform: expanded ? 'rotate(180deg)' : 'none' }} />
                    </button>
                  )}
                </div>
                {expanded && detail && (
                  <div className="text-[12px] leading-[1.5] mt-2 pt-2 whitespace-pre-wrap break-words" style={{ borderTop: '1px solid var(--divide)', color: a.error ? '#b91c1c' : 'var(--text-b)' }}>
                    {a.error ? a.error.replace(/^Mislukt: .*? - /, '') : a.result}
                    {a.design && (
                      <Link href={`/shops/${agent.shop_id}/products`} className="block mt-1.5 font-semibold" style={{ color: 'var(--fyn-blue)' }}>Naar Producten</Link>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
