'use client'

import { use } from 'react'
import { Topbar } from '@/components/layout/topbar'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts'

const revenueData = [
  { date: 'Mon', revenue: 420, orders: 8 },
  { date: 'Tue', revenue: 580, orders: 12 },
  { date: 'Wed', revenue: 340, orders: 7 },
  { date: 'Thu', revenue: 720, orders: 15 },
  { date: 'Fri', revenue: 890, orders: 19 },
  { date: 'Sat', revenue: 1150, orders: 24 },
  { date: 'Sun', revenue: 780, orders: 16 },
]

const productSales = [
  { name: 'Galaxy Stickers', sales: 89, revenue: 1156 },
  { name: 'Ocean Mug', sales: 58, revenue: 985 },
  { name: 'Sunset Tee', sales: 47, revenue: 1409 },
  { name: 'Space Poster', sales: 41, revenue: 942 },
  { name: 'Mountain Tote', sales: 32, revenue: 799 },
  { name: 'Mandala Case', sales: 23, revenue: 459 },
]

const agentPerformance = [
  { name: 'Luna', tasks: 34, color: '#9e4aff' },
  { name: 'Marcus', tasks: 28, color: '#4a9eff' },
  { name: 'Aria', tasks: 42, color: '#4aff9e' },
  { name: 'Rex', tasks: 31, color: '#ff9e4a' },
  { name: 'Nova', tasks: 18, color: '#ff4a9e' },
]

const tooltipStyle = {
  contentStyle: { background: '#1a1a2e', border: '1px solid #2a2a4a', borderRadius: '8px', color: '#e8e8f0' },
  labelStyle: { color: '#8888aa' },
}

export default function AnalyticsPage({ params }: { params: Promise<{ shopId: string }> }) {
  const { shopId } = use(params)

  return (
    <>
      <Topbar title="Analytics" subtitle="Store performance overview" />
      <div className="p-6 space-y-6">
        {/* Revenue Chart */}
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Revenue This Week</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a4a" />
              <XAxis dataKey="date" stroke="#8888aa" fontSize={12} />
              <YAxis stroke="#8888aa" fontSize={12} tickFormatter={v => `$${v}`} />
              <Tooltip {...tooltipStyle} formatter={(v) => [`$${v}`, 'Revenue']} />
              <Line type="monotone" dataKey="revenue" stroke="#4a9eff" strokeWidth={2} dot={{ fill: '#4a9eff', r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Product Sales */}
          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Top Products by Sales</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={productSales} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a4a" />
                <XAxis type="number" stroke="#8888aa" fontSize={12} />
                <YAxis type="category" dataKey="name" stroke="#8888aa" fontSize={11} width={100} />
                <Tooltip {...tooltipStyle} />
                <Bar dataKey="sales" fill="#9e4aff" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Agent Performance */}
          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Agent Tasks Completed</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={agentPerformance}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a4a" />
                <XAxis dataKey="name" stroke="#8888aa" fontSize={12} />
                <YAxis stroke="#8888aa" fontSize={12} />
                <Tooltip {...tooltipStyle} />
                <Bar dataKey="tasks" radius={[4, 4, 0, 0]}>
                  {agentPerformance.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </>
  )
}
