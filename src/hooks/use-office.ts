'use client'

import { useState, useEffect, useCallback } from 'react'
import { DEFAULT_GRID, type OfficeGrid, type Room } from '@/lib/office'

export type RoomInput = Partial<Pick<Room, 'name' | 'function' | 'color' | 'col' | 'row' | 'width' | 'depth' | 'agent_id'>>

// Mutations resolve to an error message, or null on success
export function useOffice(shopId: string) {
  const [grid, setGrid] = useState<OfficeGrid>(DEFAULT_GRID)
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/shops/${shopId}/rooms`)
      if (res.ok) {
        const data = await res.json()
        setGrid(data.grid)
        setRooms(data.rooms)
      }
    } catch {
      // keep last known layout
    } finally {
      setLoading(false)
    }
  }, [shopId])

  useEffect(() => { refresh() }, [refresh])

  const send = async (url: string, method: string, body?: unknown): Promise<string | null> => {
    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) return data.error || 'Opslaan mislukt'
      await refresh()
      return null
    } catch {
      return 'Geen verbinding met de server'
    }
  }

  return {
    grid, rooms, loading, refresh,
    createRoom: (input: RoomInput) => send(`/api/shops/${shopId}/rooms`, 'POST', input),
    updateRoom: (roomId: string, input: RoomInput) => send(`/api/shops/${shopId}/rooms/${roomId}`, 'PATCH', input),
    deleteRoom: (roomId: string) => send(`/api/shops/${shopId}/rooms/${roomId}`, 'DELETE'),
    resizeGrid: (next: OfficeGrid) => send(`/api/shops/${shopId}/rooms`, 'PATCH', next),
  }
}
