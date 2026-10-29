'use client'
import { useState, useEffect } from 'react'

interface Shop { id: string; name: string; slug: string; description: string; created_at: string }

export function useShops() {
  const [shops, setShops] = useState<Shop[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/shops').then(r => r.json()).then(setShops).catch(() => {}).finally(() => setLoading(false))
  }, [])

  return { shops, loading }
}
