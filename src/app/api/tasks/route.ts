import { NextRequest, NextResponse } from 'next/server'
import { all } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const agentId = searchParams.get('agent_id')
  const limit = parseInt(searchParams.get('limit') || '50')
  const status = searchParams.get('status')

  let sql = 'SELECT * FROM tasks'
  const conditions: string[] = []
  const params: unknown[] = []

  if (agentId) {
    conditions.push('agent_id = ?')
    params.push(agentId)
  }
  if (status) {
    conditions.push('status = ?')
    params.push(status)
  }

  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ')
  }
  sql += ' ORDER BY created_at DESC LIMIT ?'
  params.push(limit)

  const tasks = all(sql, ...params)
  return NextResponse.json(tasks)
}
