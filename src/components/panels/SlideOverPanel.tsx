'use client'

import { useEffect } from 'react'
import { X } from 'lucide-react'

interface Props {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: string
  color?: string
  children: React.ReactNode
  // Edit panels keep the floor plan visible and clickable
  modal?: boolean
}

export function SlideOverPanel({ open, onClose, title, subtitle, color, children, modal = true }: Props) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (open) window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  return (
    <>
      {modal && <div className="fixed inset-0 z-40" style={{ background: 'var(--overlay)' }} onClick={onClose} />}

      <div className="fixed right-0 top-0 h-screen w-[380px] max-w-full z-50 flex flex-col animate-slide-in"
        style={{ background: 'var(--sidebar)', borderLeft: '1px solid var(--sb-border)', boxShadow: '-20px 0 50px -20px rgba(0,0,0,.4)' }}>
        <div className="flex items-center justify-between px-5 h-16 flex-none" style={{ borderBottom: '1px solid var(--sb-border)' }}>
          <div className="min-w-0">
            <h3 className="text-[15px] font-bold truncate" style={{ color: color || 'var(--text-h)' }}>{title}</h3>
            {subtitle && <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-m)' }}>{subtitle}</p>}
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer"
            style={{ background: 'var(--well)', border: '1px solid var(--well-border)' }} aria-label="Sluiten">
            <X className="w-4 h-4" style={{ color: 'var(--text-m)' }} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-5">
          {children}
        </div>
      </div>
    </>
  )
}
