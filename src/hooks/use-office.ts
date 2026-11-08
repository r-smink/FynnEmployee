'use client'

import { useState, useEffect, useCallback } from 'react'
import { DEFAULT_GRID, type OfficeGrid, type Room } from '@/lib/office'

export type RoomInput = Partial<Pick<Room, 'name' | 'function' | 'color' | 'col' | 'row' | 'width' | 'depth' | 'agent_ids'>>

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
      // Refresh either way: on an error this undoes an optimistic change
      await refresh()
      return res.ok ? null : data.error || 'Opslaan mislukt'
    } catch {
      await refresh()
      return 'Geen verbinding met de server'
    }
  }

  return {
    grid, rooms, loading, refresh,
    createRoom: (input: RoomInput) => send(`/api/shops/${shopId}/rooms`, 'POST', input),
    // Shown right away so a dragged room stays where it was dropped while it saves
    updateRoom: (roomId: string, input: RoomInput) => {
      // Agents moved in here leave their old room
      const moved = new Set(input.agent_ids ?? [])
      setRooms(rs => rs.map(r => (r.id === roomId ? { ...r, ...input } : { ...r, agent_ids: r.agent_ids.filter(id => !moved.has(id)) })))
      return send(`/api/shops/${shopId}/rooms/${roomId}`, 'PATCH', input)
    },
    deleteRoom: (roomId: string) => send(`/api/shops/${shopId}/rooms/${roomId}`, 'DELETE'),
    resizeGrid: (next: OfficeGrid) => {
      setGrid(next)
      return send(`/api/shops/${shopId}/rooms`, 'PATCH', next)
    },
  }
}
