// Revenue figures computed from real orders (client-safe: no database access here)

export interface OrderLike {
  total_price: number | null
  status: string
  created_at: string
}

const WEEKDAYS = ['Zo', 'Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za']

// SQLite stores "YYYY-MM-DD HH:MM:SS" in UTC without a zone marker
export function parseDbDate(value: string): Date {
  return new Date(/[zT]/i.test(value) ? value : value.replace(' ', 'T') + 'Z')
}

const counted = (orders: OrderLike[]) => orders.filter(o => o.status !== 'cancelled')

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

export function sumBetween(orders: OrderLike[], from: Date, to: Date = new Date(8.64e15)): number {
  return counted(orders)
    .filter(o => { const t = parseDbDate(o.created_at); return t >= from && t < to })
    .reduce((s, o) => s + (o.total_price || 0), 0)
}

export function countBetween(orders: OrderLike[], from: Date, to: Date = new Date(8.64e15)): number {
  return counted(orders).filter(o => { const t = parseDbDate(o.created_at); return t >= from && t < to }).length
}

export function monthRevenue(orders: OrderLike[], now = new Date()): number {
  return sumBetween(orders, new Date(now.getFullYear(), now.getMonth(), 1))
}

export function todayAndYesterdayCounts(orders: OrderLike[], now = new Date()) {
  const today = startOfDay(now)
  const yesterday = new Date(today.getTime() - 86400000)
  return { today: countBetween(orders, today), yesterday: countBetween(orders, yesterday, today) }
}

// Revenue per day for the last 7 days (oldest first), plus the 7 days before that for comparison
export function lastSevenDays(orders: OrderLike[], now = new Date()) {
  const today = startOfDay(now)
  const days = Array.from({ length: 7 }, (_, i) => new Date(today.getTime() - (6 - i) * 86400000))
  const values = days.map(d => sumBetween(orders, d, new Date(d.getTime() + 86400000)))
  const previous = sumBetween(orders, new Date(days[0].getTime() - 7 * 86400000), days[0])
  return { labels: days.map(d => WEEKDAYS[d.getDay()]), values, previous }
}
