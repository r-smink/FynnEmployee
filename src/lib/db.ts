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
// Adds a column once. The check and ALTER share an IMMEDIATE transaction, so parallel processes
// opening the same file (e.g. next build workers) can't both try to add it.
function addColumn(database: Database.Database, table: string, column: string, definition: string, backfill?: string) {
  database.transaction(() => {
    const cols = database.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]
    if (cols.some(c => c.name === column)) return
    database.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`)
    if (backfill) database.exec(backfill)
  }).immediate()
}

function migrate(database: Database.Database) {
  addColumn(database, 'agents', 'model', 'TEXT')
  addColumn(database, 'agents', 'enabled', 'INTEGER DEFAULT 1')

  // demo = 1 marks work agents simulated in demo mode, so it can be wiped when going live.
  // Existing rows are classified once: a task without AI output was simulated.
  addColumn(database, 'tasks', 'demo', 'INTEGER DEFAULT 0', 'UPDATE tasks SET demo = 1 WHERE output_data IS NULL')
  addColumn(database, 'activity_log', 'demo', 'INTEGER DEFAULT 0',
    'UPDATE activity_log SET demo = 1 WHERE task_id IS NULL OR task_id IN (SELECT id FROM tasks WHERE demo = 1)')

  // Getting an approved design onto Printful and Etsy: status (publishing, listed, failed), the step
  // it is on, the last error, and what is done so far as JSON, so a retry continues where it stopped
  addColumn(database, 'products', 'publish_status', 'TEXT')
  addColumn(database, 'products', 'publish_step', 'TEXT')
  addColumn(database, 'products', 'publish_error', 'TEXT')
  addColumn(database, 'products', 'fulfillment', 'TEXT')

  // Sending Etsy orders to Printful: what was ordered, the last error (shown under Fouten),
  // and the shipment that goes back to Etsy
  addColumn(database, 'orders', 'product_title', 'TEXT')
  addColumn(database, 'orders', 'fulfill_error', 'TEXT')
  addColumn(database, 'orders', 'carrier', 'TEXT')
  addColumn(database, 'orders', 'tracking_url', 'TEXT')
  addColumn(database, 'orders', 'tracking_sent', 'INTEGER DEFAULT 0')
  // Older versions read a receipt field Etsy doesn't send, so imported orders got the id "undefined"
  database.exec("DELETE FROM orders WHERE etsy_order_id = 'undefined' AND fulfillment_id IS NULL")
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
