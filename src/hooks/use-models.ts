'use client'

import { useEffect, useState } from 'react'
import type { ModelInfo } from '@/app/api/models/route'

export type { ModelInfo }

interface ModelsState {
  models: ModelInfo[]
  defaultModel: string
  live: boolean
  loading: boolean
}

let cached: Omit<ModelsState, 'loading'> | null = null

export function useModels() {
  const [state, setState] = useState<ModelsState>(
    cached ? { ...cached, loading: false } : { models: [], defaultModel: '', live: false, loading: true }
  )

  useEffect(() => {
    if (cached) return
    fetch('/api/models').then(r => r.json()).then(data => {
      cached = { models: data.models, defaultModel: data.defaultModel, live: data.live }
      setState({ ...cached, loading: false })
    }).catch(() => setState(s => ({ ...s, loading: false })))
  }, [])

  return state
}

export const FEATURED_PROVIDERS = ['anthropic', 'google', 'openai', 'deepseek', 'meta-llama']

// Newest models of the featured providers (stays current as OpenRouter adds models)
export function featuredModels(models: ModelInfo[], perProvider = 2): ModelInfo[] {
  return FEATURED_PROVIDERS.flatMap(p =>
    models.filter(m => m.provider === p && !m.id.endsWith(':free')).slice(0, perProvider)
  )
}

export function formatPrice(m: ModelInfo): string {
  if (m.inputPrice === 0 && m.outputPrice === 0) return 'Gratis'
  if (m.inputPrice === null || m.outputPrice === null) return '—'
  const f = (n: number) => '$' + (n < 1 ? n.toFixed(2) : n.toFixed(n % 1 ? 2 : 0)).replace('.', ',')
  return `${f(m.inputPrice)} / ${f(m.outputPrice)} per 1M`
}
