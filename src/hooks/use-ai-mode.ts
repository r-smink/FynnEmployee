'use client'

import { useState, useEffect, useCallback } from 'react'

export type AiMode = 'live' | 'demo'

interface AiModeState {
  mode: AiMode
  hasApiKey: boolean
  etsyConnected: boolean
  printfulConnected: boolean
  lastAiTaskAt: string | null
}

// Every useAiMode instance (topbar, settings banner) listens to this so a switch in one updates all
export const AI_MODE_EVENT = 'fynn:ai-mode'
// Dispatch after saving settings (e.g. a new OpenRouter key) so every instance refetches
export const SETTINGS_CHANGED_EVENT = 'fynn:settings-changed'

export function useAiMode() {
  const [state, setState] = useState<AiModeState>({
    mode: 'demo', hasApiKey: false, etsyConnected: false, printfulConnected: false, lastAiTaskAt: null,
  })
  const [loaded, setLoaded] = useState(false)

  const load = useCallback(() => fetch('/api/settings').then(r => r.json()).then(data => {
      setState({
        mode: data.ai_mode === 'demo' ? 'demo' : 'live',
        hasApiKey: data.has_api_key === 'true',
        etsyConnected: data.etsy_connected === 'true',
        printfulConnected: data.printful_connected === 'true',
        lastAiTaskAt: data.last_ai_task_at ?? null,
      })
      setLoaded(true)
    }).catch(() => {}), [])

  useEffect(() => {
    load()

    const onChange = (e: Event) => setState(s => ({ ...s, mode: (e as CustomEvent<AiMode>).detail }))
    window.addEventListener(AI_MODE_EVENT, onChange)
    window.addEventListener(SETTINGS_CHANGED_EVENT, load)
    return () => {
      window.removeEventListener(AI_MODE_EVENT, onChange)
      window.removeEventListener(SETTINGS_CHANGED_EVENT, load)
    }
  }, [load])

  const setMode = useCallback(async (mode: AiMode) => {
    window.dispatchEvent(new CustomEvent(AI_MODE_EVENT, { detail: mode }))
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ai_mode: mode }),
      })
      // Switching to live wipes demo data on the server; let pages reload what they show
      window.dispatchEvent(new Event(SETTINGS_CHANGED_EVENT))
    } catch {}
  }, [])

  // Live only does real AI work when an OpenRouter key is configured
  const live = state.mode === 'live' && state.hasApiKey
  // Demo figures (example orders, revenue) are only shown once we know we're not live
  const showDemoData = loaded && !live

  return { ...state, live, loaded, showDemoData, setMode, refresh: load }
}
