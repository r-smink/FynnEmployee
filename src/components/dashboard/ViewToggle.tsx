'use client'

import { LayoutGrid, Map } from 'lucide-react'

interface Props {
  view: 'cards' | 'isometric'
  onViewChange: (view: 'cards' | 'isometric') => void
}

export function ViewToggle({ view, onViewChange }: Props) {
  return (
    <div className="flex items-center gap-1 p-1 rounded-lg" style={{ background: 'var(--bg-card)' }}>
      <button
        onClick={() => onViewChange('isometric')}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all"
        style={{
          background: view === 'isometric' ? 'var(--bg-card-hover)' : 'transparent',
          color: view === 'isometric' ? 'var(--text-primary)' : 'var(--text-secondary)',
        }}>
        <Map className="w-3.5 h-3.5" />
        Floor Plan
      </button>
      <button
        onClick={() => onViewChange('cards')}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all"
        style={{
          background: view === 'cards' ? 'var(--bg-card-hover)' : 'transparent',
          color: view === 'cards' ? 'var(--text-primary)' : 'var(--text-secondary)',
        }}>
        <LayoutGrid className="w-3.5 h-3.5" />
        Cards
      </button>
    </div>
  )
}
