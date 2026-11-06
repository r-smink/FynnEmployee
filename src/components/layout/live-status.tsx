'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'
import { nl } from 'date-fns/locale'
import { CheckCircle2, XCircle, Radio, Settings2 } from 'lucide-react'
import { useAiMode } from '@/hooks/use-ai-mode'
import { parseDbDate } from '@/lib/revenue'

interface Check {
  label: string
  ok: boolean
  okText: string
  missingText: string
}

// Next to the AI Live switch: shows what is really connected, so "live" is never just a label
export function LiveStatus() {
  const { live, etsyConnected, printfulConnected, lastAiTaskAt, refresh } = useAiMode()
  const [open, setOpen] = useState(false)
  const shopId = usePathname()?.match(/^\/shops\/([^/]+)/)?.[1]

  if (!live) return null

  const checks: Check[] = [
    {
      label: 'AI (OpenRouter)', ok: true,
      okText: lastAiTaskAt
        ? `Laatste echte AI-taak ${formatDistanceToNow(parseDbDate(lastAiTaskAt), { addSuffix: true, locale: nl })}`
        : 'Sleutel ingesteld. De eerste AI-taak volgt binnen een minuut.',
      missingText: '',
    },
    {
      label: 'Etsy-winkel', ok: etsyConnected,
      okText: 'Listings en bestellingen komen uit je echte winkel',
      missingText: 'Niet gekoppeld: agents zetten niets op Etsy en zien geen bestellingen',
    },
    {
      label: 'Printful', ok: printfulConnected,
      okText: 'Bestellingen gaan naar productie',
      missingText: 'Niet gekoppeld: bestellingen worden niet geproduceerd',
    },
  ]
  const okCount = checks.filter(c => c.ok).length
  const full = okCount === checks.length
  const color = full ? 'var(--fyn-success)' : '#d97706'

  return (
    <div className="relative">
      <button type="button" onClick={() => { if (!open) refresh(); setOpen(!open) }}
        aria-expanded={open} title="Wat is er echt gekoppeld?"
        className="flex items-center gap-[6px] h-[34px] px-3 rounded-full text-xs font-bold cursor-pointer"
        style={{ background: full ? 'rgba(16,185,129,.14)' : 'rgba(217,119,6,.14)', border: `1px solid ${full ? 'rgba(16,185,129,.35)' : 'rgba(217,119,6,.35)'}`, color }}>
        <Radio className="w-3.5 h-3.5" />
        {full ? 'Volledig live' : `Deels live · ${okCount}/${checks.length}`}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-[42px] z-40 w-[320px] fynn-card p-4" style={{ boxShadow: '0 18px 40px -12px rgba(0,0,0,.35)' }}>
            <div className="text-[13.5px] font-bold mb-1" style={{ color: 'var(--text-h)' }}>
              {full ? 'Alles is gekoppeld' : 'Nog niet alles is gekoppeld'}
            </div>
            <div className="text-[12px] mb-3" style={{ color: 'var(--text-m)' }}>
              {full
                ? 'Agents werken met echte AI, je echte Etsy-winkel en Printful.'
                : 'Agents gebruiken echte AI, maar alleen gekoppelde diensten krijgen echte acties.'}
            </div>
            {checks.map(c => (
              <div key={c.label} className="flex items-start gap-2.5 py-2" style={{ borderTop: '1px solid var(--divide)' }}>
                {c.ok
                  ? <CheckCircle2 className="w-4 h-4 mt-0.5 flex-none" style={{ color: 'var(--fyn-success)' }} />
                  : <XCircle className="w-4 h-4 mt-0.5 flex-none" style={{ color: '#d97706' }} />}
                <div className="min-w-0">
                  <div className="text-[12.5px] font-semibold" style={{ color: 'var(--text-h)' }}>{c.label}</div>
                  <div className="text-[11.5px] leading-snug" style={{ color: 'var(--text-m)' }}>{c.ok ? c.okText : c.missingText}</div>
                </div>
              </div>
            ))}
            {shopId && (
              <Link href={`/shops/${shopId}/settings`} onClick={() => setOpen(false)}
                className="mt-2 inline-flex items-center gap-1.5 text-[12px] font-semibold">
                <Settings2 className="w-3.5 h-3.5" /> Koppelingen beheren
              </Link>
            )}
          </div>
        </>
      )}
    </div>
  )
}
