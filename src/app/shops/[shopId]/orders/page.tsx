'use client'

import { use, useState, useEffect } from 'react'
import { Clock, RefreshCw, CheckCircle2, XCircle, Truck } from 'lucide-react'
import { Topbar } from '@/components/layout/topbar'
import { PageBody } from '@/components/layout/app-shell'
import { euro } from '@/lib/labels'

interface Order {
  id: string
  customer_name: string
  product_title: string
  quantity: number
  total_price: number
  profit: number
  status: string
  fulfillment_status: string
  tracking_number: string | null
  created_at: string
}

const DEMO_ORDERS: Order[] = [
  { id: '#1047', customer_name: 'Sarah M.', product_title: 'Ocean Waves Mug', quantity: 2, total_price: 33.98, profit: 22.98, status: 'fulfilled', fulfillment_status: 'shipped', tracking_number: '1Z999AA10123456784', created_at: '2024-10-28T14:30:00' },
  { id: '#1046', customer_name: 'James K.', product_title: 'Tropical Sunset T-Shirt', quantity: 1, total_price: 29.99, profit: 17.49, status: 'processing', fulfillment_status: 'in_production', tracking_number: null, created_at: '2024-10-28T12:15:00' },
  { id: '#1045', customer_name: 'Emily R.', product_title: 'Cosmic Galaxy Sticker Set', quantity: 3, total_price: 38.97, profit: 31.47, status: 'fulfilled', fulfillment_status: 'delivered', tracking_number: '1Z999AA10123456785', created_at: '2024-10-27T09:45:00' },
  { id: '#1044', customer_name: 'Michael T.', product_title: 'Retro Space Poster', quantity: 1, total_price: 22.99, profit: 18.74, status: 'fulfilled', fulfillment_status: 'shipped', tracking_number: '1Z999AA10123456786', created_at: '2024-10-27T08:20:00' },
  { id: '#1043', customer_name: 'Lisa H.', product_title: 'Nordic Forest Hoodie', quantity: 1, total_price: 44.99, profit: 26.99, status: 'new', fulfillment_status: 'pending', tracking_number: null, created_at: '2024-10-28T16:00:00' },
  { id: '#1042', customer_name: 'David W.', product_title: 'Boho Mandala Phone Case', quantity: 2, total_price: 39.98, profit: 27.98, status: 'processing', fulfillment_status: 'submitted', tracking_number: null, created_at: '2024-10-28T10:30:00' },
  { id: '#1041', customer_name: 'Anna P.', product_title: 'Mountain Adventure Tote Bag', quantity: 1, total_price: 24.99, profit: 16.24, status: 'fulfilled', fulfillment_status: 'delivered', tracking_number: '1Z999AA10123456787', created_at: '2024-10-26T15:10:00' },
]

const STATUS: Record<string, { bg: string; color: string; icon: typeof Clock; label: string }> = {
  new: { bg: 'var(--fyn-warning-light)', color: '#92700a', icon: Clock, label: 'Nieuw' },
  processing: { bg: 'var(--fyn-info-light)', color: '#1d4ed8', icon: RefreshCw, label: 'Verwerken' },
  fulfilled: { bg: 'var(--fyn-success-light)', color: '#047857', icon: CheckCircle2, label: 'Afgerond' },
  cancelled: { bg: 'var(--fyn-danger-light)', color: '#b91c1c', icon: XCircle, label: 'Geannuleerd' },
}

const FULFILLMENT: Record<string, { color: string; label: string }> = {
  pending: { color: 'var(--text-m)', label: 'In afwachting' },
  submitted: { color: '#379FD3', label: 'Ingediend' },
  in_production: { color: '#9e4aff', label: 'In productie' },
  shipped: { color: '#ff9e4a', label: 'Verzonden' },
  delivered: { color: '#10b981', label: 'Bezorgd' },
}

const COLS: [string, 'l' | 'c' | 'r'][] = [
  ['Bestelling', 'l'], ['Klant', 'l'], ['Product', 'l'], ['Aantal', 'c'], ['Totaal', 'r'], ['Winst', 'r'], ['Status', 'l'], ['Levering', 'l'],
]

export default function OrdersPage({ params }: { params: Promise<{ shopId: string }> }) {
  const { shopId } = use(params)
  const [orders, setOrders] = useState<Order[]>(DEMO_ORDERS)

  useEffect(() => {
    fetch(`/api/shops/${shopId}/orders`).then(r => r.json()).then(data => {
      if (Array.isArray(data) && data.length > 0) setOrders(data)
    }).catch(() => {})
  }, [shopId])

  const revenue = orders.reduce((s, o) => s + (o.total_price || 0), 0)
  const profit = orders.reduce((s, o) => s + (o.profit || 0), 0)
  const shipped = orders.filter(o => o.fulfillment_status === 'shipped' || o.fulfillment_status === 'delivered').length

  const stats = [
    { label: 'Bestellingen', value: String(orders.length), color: 'var(--text-h)' },
    { label: 'Omzet', value: euro(revenue), color: 'var(--text-h)' },
    { label: 'Winst', value: euro(profit), color: '#10b981' },
    { label: 'Verzonden', value: String(shipped), color: '#379FD3' },
  ]

  return (
    <>
      <Topbar title="Bestellingen" subtitle={`${orders.length} bestellingen · ${euro(revenue)} omzet · ${euro(profit)} winst`} />
      <PageBody>
        <div className="grid gap-4 mb-[18px]" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))' }}>
          {stats.map(s => (
            <div key={s.label} className="fynn-card px-[18px] py-4" style={{ borderRadius: 13 }}>
              <div className="text-[11px] font-bold uppercase tracking-[.04em]" style={{ color: 'var(--text-m)' }}>{s.label}</div>
              <div className="text-2xl font-bold tracking-[-.02em] mt-[7px]" style={{ color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>

        <div className="fynn-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse min-w-[900px]">
              <thead>
                <tr style={{ borderBottom: '2px solid var(--divide)' }}>
                  {COLS.map(([label, align], i) => (
                    <th key={label} className="fynn-th" style={{
                      textAlign: align === 'r' ? 'right' : align === 'c' ? 'center' : 'left',
                      paddingLeft: i === 0 ? 20 : undefined, paddingRight: i === COLS.length - 1 ? 20 : undefined,
                    }}>{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => {
                  const st = STATUS[o.status] || STATUS.new
                  const ful = FULFILLMENT[o.fulfillment_status] || FULFILLMENT.pending
                  return (
                    <tr key={o.id} className="transition-colors" style={{ borderBottom: '1px solid var(--divide)' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--row-hover)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      <td className="py-[13px] px-5"><code className="text-[12.5px] font-semibold" style={{ color: 'var(--fyn-blue)' }}>{o.id}</code></td>
                      <td className="py-[13px] px-3.5 text-[13px]" style={{ color: 'var(--text-h)' }}>{o.customer_name}</td>
                      <td className="py-[13px] px-3.5 text-[13px]" style={{ color: 'var(--text-b)' }}>{o.product_title}</td>
                      <td className="py-[13px] px-3.5 text-[13px] text-center" style={{ color: 'var(--text-m)' }}>{o.quantity}</td>
                      <td className="py-[13px] px-3.5 text-[13px] text-right font-semibold" style={{ color: 'var(--text-h)' }}>{euro(o.total_price || 0)}</td>
                      <td className="py-[13px] px-3.5 text-[13px] text-right font-bold" style={{ color: '#10b981' }}>+{euro(o.profit || 0)}</td>
                      <td className="py-[13px] px-3.5">
                        <span className="fynn-pill" style={{ background: st.bg, color: st.color }}>
                          <st.icon className="w-[13px] h-[13px]" />{st.label}
                        </span>
                      </td>
                      <td className="py-[13px] px-5">
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold" style={{ color: ful.color }}>
                          {o.fulfillment_status === 'shipped' && <Truck className="w-[13px] h-[13px]" />}
                          {ful.label}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </PageBody>
    </>
  )
}
