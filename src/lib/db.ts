import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'
import { DEFAULT_AGENT_TEMPLATES } from '@/agents/types'

const globalForDb = globalThis as unknown as { __fynnDb: Database.Database }

function createDb(): Database.Database {
  // DATABASE_PATH points at a persistent volume in production (e.g. /data/fynnemployee.db on Railway)
  const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), 'fynnemployee.db')
  fs.mkdirSync(path.dirname(dbPath), { recursive: true })
  const db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  // Initialize schema
  const schemaPath = path.join(process.cwd(), 'database', 'schema.sql')
  if (fs.existsSync(schemaPath)) {
    const schema = fs.readFileSync(schemaPath, 'utf-8')
    db.exec(schema)
  }


  // Seed default shop if shops table is empty
  const shopCount = db.prepare('SELECT COUNT(*) as count FROM shops').get() as { count: number }
  if (shopCount.count === 0) {
    seedShopInternal(db, 'default', 'My Shop')
  }

  return db
}

function seedShopInternal(database: Database.Database, shopId: string, shopName: string) {
  const slug = shopName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

  database.prepare(
    `INSERT OR IGNORE INTO shops (id, name, slug) VALUES (?, ?, ?)`
  ).run(shopId, shopName, slug)

  const insertAgent = database.prepare(
    `INSERT OR IGNORE INTO agents (id, shop_id, name, role, description, avatar_url, color, template_type, is_custom, is_manager)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )

  for (const [key, tmpl] of Object.entries(DEFAULT_AGENT_TEMPLATES)) {
    insertAgent.run(
      tmpl.id,
      shopId,
      tmpl.name,
      tmpl.role,
      tmpl.description,
      `/agents/${key}.svg`,
      tmpl.color,
      tmpl.templateType,
      0,
      tmpl.isManager ? 1 : 0
    )
  }
}

export const db = globalForDb.__fynnDb || (globalForDb.__fynnDb = createDb())

// Columns added after the first release (CREATE TABLE IF NOT EXISTS won't add them).
// Runs on every module load so a hot-reloaded dev server with a cached connection also migrates.
function migrate(database: Database.Database) {
  const agentCols = database.prepare('PRAGMA table_info(agents)').all() as { name: string }[]
  if (!agentCols.some(c => c.name === 'model')) {
    database.exec('ALTER TABLE agents ADD COLUMN model TEXT')
  }
}
migrate(db)

export function seedShop(shopId: string, shopName: string, slug?: string, description?: string) {
  const finalSlug = slug || shopName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
  if (description) {
    db.prepare(
      `INSERT OR IGNORE INTO shops (id, name, slug, description) VALUES (?, ?, ?, ?)`
    ).run(shopId, shopName, finalSlug, description)
  } else {
    db.prepare(
      `INSERT OR IGNORE INTO shops (id, name, slug) VALUES (?, ?, ?)`
    ).run(shopId, shopName, finalSlug)
  }
  // Seed default agents for the shop
  const insertAgent = db.prepare(
    `INSERT OR IGNORE INTO agents (id, shop_id, name, role, description, avatar_url, color, template_type, is_custom, is_manager)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
  for (const [key, tmpl] of Object.entries(DEFAULT_AGENT_TEMPLATES)) {
    insertAgent.run(
      `${shopId}-${tmpl.id}`,
      shopId,
      tmpl.name,
      tmpl.role,
      tmpl.description,
      `/agents/${key}.svg`,
      tmpl.color,
      tmpl.templateType,
      0,
      tmpl.isManager ? 1 : 0
    )
  }
}

export function all<T = Record<string, unknown>>(sql: string, ...params: unknown[]): T[] {
  return db.prepare(sql).all(...params) as T[]
}

export function get<T = Record<string, unknown>>(sql: string, ...params: unknown[]): T | undefined {
  return db.prepare(sql).get(...params) as T | undefined
}

export function run(sql: string, ...params: unknown[]) {
  return db.prepare(sql).run(...params)
}
