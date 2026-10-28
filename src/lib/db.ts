import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'

const globalForDb = globalThis as unknown as { __fynnDb: Database.Database }

function createDb(): Database.Database {
  const dbPath = path.join(process.cwd(), 'fynnemployee.db')
  const db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  // Initialize schema
  const schemaPath = path.join(process.cwd(), 'database', 'schema.sql')
  if (fs.existsSync(schemaPath)) {
    const schema = fs.readFileSync(schemaPath, 'utf-8')
    db.exec(schema)
  }

  // Seed agents if not exists
  const agentCount = db.prepare('SELECT COUNT(*) as count FROM agents').get() as { count: number }
  if (agentCount.count === 0) {
    const insert = db.prepare('INSERT INTO agents (id, name, role, description, avatar_url, color) VALUES (?, ?, ?, ?, ?, ?)')
    insert.run('luna', 'Luna', 'Design Agent', 'Creates stunning custom designs and artwork for products', '/agents/luna.svg', '#9e4aff')
    insert.run('marcus', 'Marcus', 'Listing Agent', 'Optimizes and manages Etsy listings for maximum visibility', '/agents/marcus.svg', '#4a9eff')
    insert.run('aria', 'Aria', 'Fulfillment Agent', 'Processes orders and manages dropshipping fulfillment', '/agents/aria.svg', '#4aff9e')
    insert.run('rex', 'Rex', 'Support Agent', 'Handles customer messages, reviews, and support tickets', '/agents/rex.svg', '#ff9e4a')
    insert.run('nova', 'Nova', 'Analytics Agent', 'Tracks sales trends and generates performance reports', '/agents/nova.svg', '#ff4a9e')
  }

  return db
}

export const db = globalForDb.__fynnDb || (globalForDb.__fynnDb = createDb())

export function all<T = Record<string, unknown>>(sql: string, ...params: unknown[]): T[] {
  return db.prepare(sql).all(...params) as T[]
}

export function get<T = Record<string, unknown>>(sql: string, ...params: unknown[]): T | undefined {
  return db.prepare(sql).get(...params) as T | undefined
}

export function run(sql: string, ...params: unknown[]) {
  return db.prepare(sql).run(...params)
}
