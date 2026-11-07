'use client'

import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { nl } from 'date-fns/locale'
import { Bell, Activity, Store, AlertTriangle, ChevronRight } from 'lucide-react'
import { useShopStatus } from '@/hooks/use-shop-status'
import { parseDbDate } from '@/lib/revenue'

const ago = (value: string) => formatDistanceToNow(parseDbDate(value), { addSuffix: true, locale: nl })

function Panel({ icon: Icon, color, title, children }: {
  icon: typeof Bell; color: string; title: string; children: React.ReactNode
}) {
  return (
    <div className="fynn-card p-4 min-w-0">
      <div className="flex items-center gap-2 mb-2.5">
        <Icon className="w-4 h-4 flex-none" style={{ color }} />
        <span className="text-[13px] font-bold" style={{ color: 'var(--text-h)' }}>{title}</span>
      </div>
      {children}
    </div>
  )
}

function Row({ href, label, value, accent }: { href?: string; label: string; value: number | string; accent?: string }) {
  const content = (
    <>
      <span>{label}</span>
      <span className="flex items-center gap-1 font-bold" style={{ color: accent || 'var(--text-h)' }}>
        {value}{href && <ChevronRight className="w-3.5 h-3.5" />}
      </span>
    </>
  )
  const className = 'flex items-center justify-between py-1 text-[12.5px]'
  return href
    ? <Link href={href} className={className} style={{ color: 'var(--text-b)' }}>{content}</Link>
    : <div className={className} style={{ color: 'var(--text-b)' }}>{content}</div>
}

// AI Live only: what waits for the owner, what the agents really did, and how far products got
export function StatusOverview({ shopId }: { shopId: string }) {
  const { status } = useShopStatus(shopId)
  if (!status?.live) return null

  const waiting = status.review + status.newOrders + status.publishFailed
  const { done, failed, designs } = status.last24h

  return (
    <div className="mb-[22px]">
      {status.lastError && (
        <div className="flex items-start gap-2.5 px-4 py-3 mb-3.5 rounded-xl text-[12.5px]"
          style={{ background: 'var(--fyn-danger-light)', border: '1px solid rgba(239,68,68,.35)', color: '#b91c1c' }}>
          <AlertTriangle className="w-4 h-4 flex-none mt-px" />
          <span className="min-w-0 break-words">
            <b>Laatste fout{status.lastError.agent ? ` bij ${status.lastError.agent}` : ''}</b> ({ago(status.lastError.created_at)}): {status.lastError.message}
          </span>
        </div>
      )}

      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))' }}>
        <Panel icon={Bell} color={waiting ? '#d97706' : '#10b981'} title={waiting ? `Wacht op jou (${waiting})` : 'Wacht op jou'}>
          {waiting === 0 ? (
            <p className="text-[12.5px] m-0" style={{ color: 'var(--text-m)' }}>Niets. Je hoeft nu niets te doen.</p>
          ) : (
            <>
              {status.review > 0 && <Row href={`/shops/${shopId}/products`} label="Ontwerpen beoordelen" value={status.review} accent="#d97706" />}
              {status.publishFailed > 0 && <Row href={`/shops/${shopId}/products`} label="Niet gelukt naar Etsy" value={status.publishFailed} accent="#dc2626" />}
              {status.newOrders > 0 && <Row href={`/shops/${shopId}/orders`} label="Nieuwe bestellingen" value={status.newOrders} accent="#d97706" />}
            </>
          )}
        </Panel>

        <Panel icon={Activity} color="var(--fyn-blue)" title="Afgelopen 24 uur">
          <Row label="AI-taken afgerond" value={done} />
          <Row label="Mislukt" value={failed} accent={failed ? '#dc2626' : undefined} />
          <Row label="Ontwerpen gemaakt" value={designs} />
          <div className="text-[11.5px] mt-1.5" style={{ color: 'var(--text-s)' }}>
            {status.lastWorkAt ? `Laatste afgeronde taak ${ago(status.lastWorkAt)}` : 'Nog geen echte taak afgerond'}
          </div>
        </Panel>

        <Panel icon={Store} color="var(--fyn-purple)" title="Producten">
          <Row href={`/shops/${shopId}/products`} label="Te beoordelen" value={status.review} />
          <Row href={`/shops/${shopId}/products`} label="Goedgekeurd, onderweg naar Etsy" value={status.approved} />
          <Row label="Op Etsy" value={status.onEtsy} accent={status.onEtsy ? '#10b981' : undefined} />
          <div className="text-[11.5px] mt-1.5" style={{ color: 'var(--text-s)' }}>
            Goedgekeurde ontwerpen gaan automatisch naar Printful en Etsy. Lukt dat niet, dan zie je bij Producten waarom.
          </div>
        </Panel>
      </div>
    </div>
  )
}
