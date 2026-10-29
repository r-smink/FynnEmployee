'use client'

import { Sparkles, Zap } from 'lucide-react'
import { useTheme } from '@/hooks/use-theme'
import { useAiMode } from '@/hooks/use-ai-mode'

interface TopbarProps {
  title: string
  subtitle?: string
  connected?: boolean
  actions?: React.ReactNode
}

export function Topbar({ title, subtitle, connected = true, actions }: TopbarProps) {
  const { theme, toggle } = useTheme()
  const { live, hasApiKey, setMode } = useAiMode()

  const toggleKnob = (on: boolean, activeBg: string) => ({
    background: on ? activeBg : 'transparent',
    color: on ? '#fff' : 'var(--text-s)',
  })

  return (
    <header className="sticky top-0 z-20 flex items-center gap-4 px-[26px] h-16"
      style={{ background: 'var(--topbar)', backdropFilter: 'blur(14px)', borderBottom: '1px solid var(--sb-border)' }}>
      <div className="min-w-0">
        <h2 className="m-0 text-lg font-semibold tracking-[-.015em] truncate" style={{ color: 'var(--text-h)' }}>{title}</h2>
        {subtitle && <p className="mt-0.5 text-xs truncate" style={{ color: 'var(--text-m)' }}>{subtitle}</p>}
      </div>
      <div className="flex-1" />
      {actions}
      <div role="radiogroup" aria-label="AI-modus" className="flex items-center gap-[3px] h-[34px] p-[3px] rounded-full"
        style={{ background: 'var(--well)', border: '1px solid var(--input-border)' }}>
        <button type="button" role="radio" aria-checked={live} disabled={!hasApiKey} onClick={() => setMode('live')}
          title={hasApiKey ? 'Agents gebruiken echte AI via OpenRouter' : 'Voeg eerst een OpenRouter-sleutel toe bij Instellingen'}
          className="flex items-center gap-[6px] h-7 px-3 rounded-full text-xs font-bold cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
          style={toggleKnob(live, 'var(--fyn-success)')}>
          <Sparkles className="w-3.5 h-3.5" /> AI Live
        </button>
        <button type="button" role="radio" aria-checked={!live} onClick={() => setMode('demo')}
          title="Agents simuleren hun werk, zonder AI-kosten"
          className="flex items-center gap-[6px] h-7 px-3 rounded-full text-xs font-bold cursor-pointer"
          style={toggleKnob(!live, 'var(--fyn-purple)')}>
          <Zap className="w-3.5 h-3.5" /> Demo
        </button>
      </div>
      <div className="flex items-center gap-[7px]">
        <span className={`w-2 h-2 rounded-full ${connected ? 'animate-fynn-pulse' : ''}`}
          style={{ background: connected ? '#10b981' : 'var(--text-s)', boxShadow: connected ? '0 0 8px #10b981' : 'none' }} />
        <span className="text-xs font-semibold" style={{ color: connected ? '#10b981' : 'var(--text-m)' }}>
          {connected ? 'Verbonden' : 'Verbinden…'}
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
