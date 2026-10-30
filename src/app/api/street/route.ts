import { NextResponse } from 'next/server'
import { all } from '@/lib/db'

export const dynamic = 'force-dynamic'

export interface StreetShop {
  id: string
  name: string
  description: string | null
  agents: number
  working: number
  // colors of the agents that are working right now (lit windows)
  workingColors: string[]
  tasksCompleted: number
  products: number
  newOrders: number
}

// All shops with live counts for the shopping street view
export async function GET() {
  const shops = all<{ id: string; name: string; description: string | null }>('SELECT id, name, description FROM shops ORDER BY created_at')
  const agents = all<{ shop_id: string; status: string; color: string | null; tasks_completed: number }>(
    'SELECT shop_id, status, color, tasks_completed FROM agents')
  const products = all<{ shop_id: string; n: number }>('SELECT shop_id, COUNT(*) AS n FROM products GROUP BY shop_id')
  const orders = all<{ shop_id: string; n: number }>(`SELECT shop_id, COUNT(*) AS n FROM orders WHERE status = 'new' GROUP BY shop_id`)

  const result: StreetShop[] = shops.map(s => {
    const own = agents.filter(a => a.shop_id === s.id)
    const working = own.filter(a => a.status === 'working')
    return {
      ...s,
      agents: own.length,
      working: working.length,
      workingColors: working.map(a => a.color || '#8F39AC'),
      tasksCompleted: own.reduce((sum, a) => sum + (a.tasks_completed || 0), 0),
      products: products.find(p => p.shop_id === s.id)?.n ?? 0,
      newOrders: orders.find(o => o.shop_id === s.id)?.n ?? 0,
    }
  })
  return NextResponse.json(result)
}
