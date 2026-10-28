'use client'

import { useState, useEffect } from 'react'
import { Wifi, WifiOff, Zap, Sparkles } from 'lucide-react'

interface TopbarProps {
  title: string
  subtitle?: string
  connected?: boolean
}

export function Topbar({ title, subtitle, connected = false }: TopbarProps) {
  const [aiEnabled, setAiEnabled] = useState(false)

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(data => {
      setAiEnabled(data.ai_enabled === 'true')
    }).catch(() => {})
  }, [])

  return (
    <header className="h-16 flex items-center justify-between px-6 border-b"
      style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
      <div>
        <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</h2>
        {subtitle && <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{subtitle}</p>}
      </div>
      <div className="flex items-center gap-4">
        {aiEnabled ? (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium"
            style={{ background: 'rgba(74, 255, 158, 0.15)', color: 'var(--accent-green)' }}>
            <Sparkles className="w-3 h-3" />
            AI Mode (OpenRouter)
          </div>
        ) : (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium"
            style={{ background: 'rgba(158, 74, 255, 0.15)', color: 'var(--accent-purple)' }}>
            <Zap className="w-3 h-3" />
            Demo Mode
          </div>
        )}
        <div className="flex items-center gap-2">
          {connected ? (
            <>
              <Wifi className="w-4 h-4" style={{ color: 'var(--accent-green)' }} />
              <span className="text-xs" style={{ color: 'var(--accent-green)' }}>Live</span>
            </>
          ) : (
            <>
              <WifiOff className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
              <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Connecting...</span>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
