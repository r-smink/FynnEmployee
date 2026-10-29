'use client'

import { useState, useEffect } from 'react'
import type { AgentData } from '@/hooks/use-agents'

export function AgentToggle({ agent, onChange }: {
  agent: Pick<AgentData, 'id' | 'shop_id' | 'name' | 'color' | 'enabled'>
  onChange?: () => void
}) {
  const [on, setOn] = useState(agent.enabled !== 0)
  const [saving, setSaving] = useState(false)

  // Follow the polled value; keeps the optimistic state until the server value actually changes
  useEffect(() => { setOn(agent.enabled !== 0) }, [agent.enabled])

  const toggle = async (e: React.MouseEvent) => {
    e.stopPropagation()
    const next = !on
    setOn(next)
    setSaving(true)
    try {
      await fetch(`/api/shops/${agent.shop_id}/agents/${agent.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: next }),
      })
      onChange?.()
    } catch {
      setOn(!next)
    }
    setSaving(false)
  }

  return (
    <button type="button" role="switch" aria-checked={on} onClick={toggle} disabled={saving}
      title={on ? `${agent.name} uitzetten` : `${agent.name} aanzetten`}
      className="relative flex-none w-[38px] h-[22px] rounded-full transition-colors duration-200 cursor-pointer disabled:cursor-wait"
      style={{ background: on ? agent.color : 'var(--track)', border: '1px solid var(--input-border)' }}>
      <span className="absolute top-[2px] w-4 h-4 rounded-full bg-white transition-all duration-200"
        style={{ left: on ? 18 : 2, boxShadow: '0 1px 3px rgba(0,0,0,.25)' }} />
    </button>
  )
}
