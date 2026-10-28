'use client'

import { useState } from 'react'
import { Topbar } from '@/components/layout/topbar'
import { Package, Truck, CheckCircle2, Clock, AlertCircle } from 'lucide-react'

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
  { id: 'ORD-1047', customer_name: 'Sarah M.', product_title: 'Ocean Waves Mug', quantity: 2, total_price: 33.98, profit: 22.98, status: 'fulfilled', fulfillment_status: 'shipped', tracking_number: '1Z999AA10123456784', created_at: '2024-10-28T14:30:00' },
  { id: 'ORD-1046', customer_name: 'James K.', product_title: 'Tropical Sunset T-Shirt', quantity: 1, total_price: 29.99, profit: 17.49, status: 'processing', fulfillment_status: 'in_production', tracking_number: null, created_at: '2024-10-28T12:15:00' },
  { id: 'ORD-1045', customer_name: 'Emily R.', product_title: 'Cosmic Galaxy Sticker Set', quantity: 3, total_price: 38.97, profit: 31.47, status: 'fulfilled', fulfillment_status: 'delivered', tracking_number: '1Z999AA10123456785', created_at: '2024-10-27T09:45:00' },
  { id: 'ORD-1044', customer_name: 'Michael T.', product_title: 'Retro Space Poster', quantity: 1, total_price: 22.99, profit: 18.74, status: 'fulfilled', fulfillment_status: 'shipped', tracking_number: '1Z999AA10123456786', created_at: '2024-10-27T08:20:00' },
  { id: 'ORD-1043', customer_name: 'Lisa H.', product_title: 'Nordic Forest Hoodie', quantity: 1, total_price: 44.99, profit: 26.99, status: 'new', fulfillment_status: 'pending', tracking_number: null, created_at: '2024-10-28T16:00:00' },
  { id: 'ORD-1042', customer_name: 'David W.', product_title: 'Boho Mandala Phone Case', quantity: 2, total_price: 39.98, profit: 27.98, status: 'processing', fulfillment_status: 'submitted', tracking_number: null, created_at: '2024-10-28T10:30:00' },
  { id: 'ORD-1041', customer_name: 'Anna P.', product_title: 'Mountain Adventure Tote Bag', quantity: 1, total_price: 24.99, profit: 16.24, status: 'fulfilled', fulfillment_status: 'delivered', tracking_number: '1Z999AA10123456787', created_at: '2024-10-26T15:10:00' },
  { id: 'ORD-1040', customer_name: 'Chris B.', product_title: 'Ocean Waves Mug', quantity: 1, total_price: 16.99, profit: 11.49, status: 'fulfilled', fulfillment_status: 'delivered', tracking_number: '1Z999AA10123456788', created_at: '2024-10-26T11:00:00' },
]

const statusConfig: Record<string, { icon: typeof Package; color: string; bg: string; label: string }> = {
  new: { icon: Clock, color: 'var(--accent-yellow)', bg: 'rgba(255, 224, 74, 0.1)', label: 'New' },
  processing: { icon: Package, color: 'var(--accent-blue)', bg: 'rgba(74, 158, 255, 0.1)', label: 'Processing' },
  fulfilled: { icon: CheckCircle2, color: 'var(--accent-green)', bg: 'rgba(74, 255, 158, 0.1)', label: 'Fulfilled' },
  cancelled: { icon: AlertCircle, color: '#ff4a4a', bg: 'rgba(255, 74, 74, 0.1)', label: 'Cancelled' },
}

const fulfillmentConfig: Record<string, { color: string; label: string }> = {
  pending: { color: 'var(--text-secondary)', label: 'Pending' },
  submitted: { color: 'var(--accent-blue)', label: 'Submitted' },
  in_production: { color: 'var(--accent-purple)', label: 'In Production' },
  shipped: { color: 'var(--accent-orange)', label: 'Shipped' },
  delivered: { color: 'var(--accent-green)', label: 'Delivered' },
}

export default function OrdersPage() {
  const [orders] = useState<Order[]>(DEMO_ORDERS)
  const totalRevenue = orders.reduce((s, o) => s + o.total_price, 0)
  const totalProfit = orders.reduce((s, o) => s + o.profit, 0)

  return (
    <>
      <Topbar title="Orders" subtitle={`${orders.length} orders | $${totalRevenue.toFixed(2)} revenue | $${totalProfit.toFixed(2)} profit`} />
      <div className="p-6">
        <div className="glass-card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b" style={{ borderColor: 'var(--border)' }}>
                {['Order', 'Customer', 'Product', 'Qty', 'Total', 'Profit', 'Status', 'Fulfillment'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => {
                const sc = statusConfig[order.status] || statusConfig.new
                const fc = fulfillmentConfig[order.fulfillment_status] || fulfillmentConfig.pending
                const StatusIcon = sc.icon
                return (
                  <tr key={order.id} className="border-b transition-colors"
                    style={{ borderColor: 'var(--border)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-card-hover)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <td className="px-4 py-3 text-sm font-mono font-medium" style={{ color: 'var(--accent-blue)' }}>{order.id}</td>
                    <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-primary)' }}>{order.customer_name}</td>
                    <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-primary)' }}>{order.product_title}</td>
                    <td className="px-4 py-3 text-sm text-center" style={{ color: 'var(--text-secondary)' }}>{order.quantity}</td>
                    <td className="px-4 py-3 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>${order.total_price.toFixed(2)}</td>
                    <td className="px-4 py-3 text-sm font-medium" style={{ color: 'var(--accent-green)' }}>+${order.profit.toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium" style={{ background: sc.bg, color: sc.color }}>
                        <StatusIcon className="w-3 h-3" />
                        {sc.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-medium" style={{ color: fc.color }}>
                        {order.fulfillment_status === 'shipped' && <Truck className="w-3 h-3 inline mr-1" />}
                        {fc.label}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
