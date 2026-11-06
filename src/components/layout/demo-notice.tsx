'use client'

import { Zap } from 'lucide-react'

// Shown above figures that are example data, so demo numbers never pass for real revenue
export function DemoNotice() {
  return (
    <div className="flex items-center gap-2.5 px-4 py-2.5 mb-[18px] rounded-xl text-[12.5px]"
      style={{ background: 'rgba(143,57,172,.1)', border: '1px dashed rgba(143,57,172,.4)', color: 'var(--text-b)' }}>
      <Zap className="w-4 h-4 flex-none" style={{ color: 'var(--fyn-purple)' }} />
      <span><b>Voorbeelddata.</b> In AI Live zie je hier alleen echte bestellingen en omzet uit je gekoppelde Etsy-winkel.</span>
    </div>
  )
}
