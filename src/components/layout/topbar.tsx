'use client'

import { useState, useEffect } from 'react'
import { Sparkles, Zap } from 'lucide-react'
import { useTheme } from '@/hooks/use-theme'

interface TopbarProps {
  title: string
  subtitle?: string
  connected?: boolean
  actions?: React.ReactNode
}

export function Topbar({ title, subtitle, connected = true, actions }: TopbarProps) {
  const [aiEnabled, setAiEnabled] = useState(false)
  const { theme, toggle } = useTheme()

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(data => {
      setAiEnabled(data.ai_enabled === 'true')
    }).catch(() => {})
  }, [])

  const toggleKnob = (on: boolean, activeBg: string) => ({
    background: on ? activeBg : 'transparent',
    color: on ? '#fff' : 'var(--text-s)',
  })

  return (
    <header className="sticky top-0 z-20 flex items-center gap-4 px-[26px] h-16"
      style={{ background: 'var(--topbar)', backdropFilter: 'blur(14px)', borderBottom: '1px solid var(--sb-border)' }}>
      <div className="min-w-0">
        <h2 className="m-0 text-lg font-bold tracking-[-.015em] truncate" style={{ color: 'var(--text-h)' }}>{title}</h2>
        {subtitle && <p className="mt-0.5 text-xs truncate" style={{ color: 'var(--text-m)' }}>{subtitle}</p>}
      </div>
      <div className="flex-1" />
      {actions}
      {aiEnabled ? (
        <div className="flex items-center gap-[7px] h-8 px-[13px] rounded-full"
          style={{ background: 'rgba(16,185,129,.14)', border: '1px solid rgba(16,185,129,.3)' }}>
          <Sparkles className="w-3.5 h-3.5" style={{ color: 'var(--fyn-success)' }} />
          <span className="text-xs font-bold" style={{ color: 'var(--fyn-success)' }}>AI-modus</span>
        </div>
      ) : (
        <div className="flex items-center gap-[7px] h-8 px-[13px] rounded-full"
          style={{ background: 'rgba(143,57,172,.14)', border: '1px solid rgba(143,57,172,.3)' }}>
          <Zap className="w-3.5 h-3.5" style={{ color: 'var(--fyn-purple)' }} />
          <span className="text-xs font-bold" style={{ color: 'var(--fyn-purple)' }}>Demo-modus</span>
        </div>
      )}
      <div className="flex items-center gap-[7px]">
        <span className={`w-2 h-2 rounded-full ${connected ? 'animate-fynn-pulse' : ''}`}
          style={{ background: connected ? '#10b981' : 'var(--text-s)', boxShadow: connected ? '0 0 8px #10b981' : 'none' }} />
        <span className="text-xs font-semibold" style={{ color: connected ? '#10b981' : 'var(--text-m)' }}>
          {connected ? 'Live' : 'Verbinden…'}
        </span>
      </div>
      <button type="button" onClick={toggle} title="Wissel thema"
        className="flex items-center gap-[5px] h-[34px] p-[3px] rounded-full cursor-pointer"
        style={{ background: 'var(--well)', border: '1px solid var(--input-border)' }}>
        <span className="flex items-center justify-center w-7 h-7 rounded-full text-sm" style={toggleKnob(theme === 'light', 'var(--fyn-purple)')}>☀</span>
        <span className="flex items-center justify-center w-7 h-7 rounded-full text-sm" style={toggleKnob(theme === 'dark', 'rgba(143,57,172,.3)')}>☾</span>
      </button>
    </header>
  )
}
