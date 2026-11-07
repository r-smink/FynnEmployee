'use client'

import { useState, useEffect, useCallback } from 'react'
import { SETTINGS_CHANGED_EVENT } from '@/hooks/use-ai-mode'

export interface ShopStatus {
  live: boolean
  review: number
  newOrders: number
  approved: number
  publishFailed: number
  onEtsy: number
  last24h: { done: number; failed: number; designs: number }
  lastError: { message: string; agent: string | null; created_at: string } | null
  lastWorkAt: string | null
}

// Polled overview of what waits for the owner; shared shape for the dashboard and the sidebar badges
export function useShopStatus(shopId: string) {
  const [status, setStatus] = useState<ShopStatus | null>(null)

  const load = useCallback(() => {
    fetch(`/api/shops/${shopId}/status`).then(r => (r.ok ? r.json() : null)).then(data => {
      if (data) setStatus(data)
    }).catch(() => {})
  }, [shopId])

  useEffect(() => {
    load()
    const interval = setInterval(load, 10000)
    window.addEventListener(SETTINGS_CHANGED_EVENT, load)
    return () => {
      clearInterval(interval)
      window.removeEventListener(SETTINGS_CHANGED_EVENT, load)
    }
  }, [load])

  return { status, refresh: load }
}
