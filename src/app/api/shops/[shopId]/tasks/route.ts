import { NextRequest, NextResponse } from 'next/server'
import { all } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest, { params }: { params: Promise<{ shopId: string }> }) {
  const { shopId } = await params
  const { searchParams } = new URL(request.url)
  const agentId = searchParams.get('agent_id')
  const status = searchParams.get('status')
  const limit = parseInt(searchParams.get('limit') || '50')

  let sql = 'SELECT * FROM tasks WHERE shop_id = ?'
  const sqlParams: unknown[] = [shopId]

  if (agentId) { sql += ' AND agent_id = ?'; sqlParams.push(agentId) }
  if (status) { sql += ' AND status = ?'; sqlParams.push(status) }
  sql += ' ORDER BY created_at DESC LIMIT ?'
  sqlParams.push(limit)

  const tasks = all(sql, ...sqlParams)
  return NextResponse.json(tasks)
}
