'use client'

import { useState, useEffect, useCallback } from 'react'

export type AiMode = 'live' | 'demo'

interface AiModeState {
  mode: AiMode
  hasApiKey: boolean
}

// Every useAiMode instance (topbar, settings banner) listens to this so a switch in one updates all
const AI_MODE_EVENT = 'fynn:ai-mode'
// Dispatch after saving settings (e.g. a new OpenRouter key) so every instance refetches
export const SETTINGS_CHANGED_EVENT = 'fynn:settings-changed'

export function useAiMode() {
  const [state, setState] = useState<AiModeState>({ mode: 'demo', hasApiKey: false })
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const load = () => fetch('/api/settings').then(r => r.json()).then(data => {
      setState({ mode: data.ai_mode === 'demo' ? 'demo' : 'live', hasApiKey: data.has_api_key === 'true' })
      setLoaded(true)
    }).catch(() => {})
    load()

    const onChange = (e: Event) => setState(s => ({ ...s, mode: (e as CustomEvent<AiMode>).detail }))
    window.addEventListener(AI_MODE_EVENT, onChange)
    window.addEventListener(SETTINGS_CHANGED_EVENT, load)
    return () => {
      window.removeEventListener(AI_MODE_EVENT, onChange)
      window.removeEventListener(SETTINGS_CHANGED_EVENT, load)
    }
  }, [])

  const setMode = useCallback(async (mode: AiMode) => {
    window.dispatchEvent(new CustomEvent(AI_MODE_EVENT, { detail: mode }))
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ai_mode: mode }),
      })
    } catch {}
  }, [])

  // Live only does real AI work when an OpenRouter key is configured
  const live = state.mode === 'live' && state.hasApiKey

  return { ...state, live, loaded, setMode }
}
