-- Shops
CREATE TABLE IF NOT EXISTS shops (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    slug        TEXT NOT NULL UNIQUE,
    description TEXT,
    icon_url    TEXT,
    created_at  TEXT DEFAULT (datetime('now')),
    updated_at  TEXT DEFAULT (datetime('now'))
);

-- Shop-specific settings (Etsy keys, Printful keys per shop)
CREATE TABLE IF NOT EXISTS shop_settings (
    shop_id     TEXT NOT NULL,
    key         TEXT NOT NULL,
    value       TEXT NOT NULL,
    updated_at  TEXT DEFAULT (datetime('now')),
    PRIMARY KEY (shop_id, key)
);

-- Global settings (OpenRouter key, model - shared across shops)
CREATE TABLE IF NOT EXISTS settings (
    key         TEXT PRIMARY KEY,
    value       TEXT NOT NULL,
    updated_at  TEXT DEFAULT (datetime('now'))
);

-- Agents (6 defaults per shop + custom agents)
CREATE TABLE IF NOT EXISTS agents (
    id              TEXT NOT NULL,
    shop_id         TEXT NOT NULL,
    name            TEXT NOT NULL,
    role            TEXT NOT NULL,
    description     TEXT,
    avatar_url      TEXT,
    color           TEXT,
    status          TEXT NOT NULL DEFAULT 'idle',
    current_task_id TEXT,
    tasks_completed INTEGER DEFAULT 0,
    template_type   TEXT NOT NULL DEFAULT 'custom',
    is_custom       INTEGER DEFAULT 0,
    is_manager      INTEGER DEFAULT 0,
    custom_prompt   TEXT,
    model           TEXT,
    position_x      REAL DEFAULT 0,
    position_y      REAL DEFAULT 0,
    created_at      TEXT DEFAULT (datetime('now')),
    updated_at      TEXT DEFAULT (datetime('now')),
    PRIMARY KEY (id, shop_id)
);

-- Tasks
CREATE TABLE IF NOT EXISTS tasks (
    id              TEXT PRIMARY KEY,
    shop_id         TEXT NOT NULL,
    agent_id        TEXT NOT NULL,
    type            TEXT NOT NULL,
    title           TEXT NOT NULL,
    description     TEXT,
    status          TEXT NOT NULL DEFAULT 'queued',
    priority        INTEGER DEFAULT 0,
    input_data      TEXT,
    output_data     TEXT,
    progress        INTEGER DEFAULT 0,
    started_at      TEXT,
    completed_at    TEXT,
    created_at      TEXT DEFAULT (datetime('now'))
);

-- Activity log
CREATE TABLE IF NOT EXISTS activity_log (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    shop_id     TEXT NOT NULL,
    agent_id    TEXT NOT NULL,
    task_id     TEXT,
    message     TEXT NOT NULL,
    type        TEXT NOT NULL DEFAULT 'info',
    metadata    TEXT,
    created_at  TEXT DEFAULT (datetime('now'))
);

-- Products
CREATE TABLE IF NOT EXISTS products (
    id              TEXT PRIMARY KEY,
    shop_id         TEXT NOT NULL,
    title           TEXT NOT NULL,
    description     TEXT,
    design_url      TEXT,
    thumbnail_url   TEXT,
    etsy_listing_id TEXT,
    category        TEXT,
    tags            TEXT,
    base_cost       REAL DEFAULT 0,
    price           REAL DEFAULT 0,
    status          TEXT DEFAULT 'draft',
    created_by      TEXT DEFAULT 'luna',
    sales_count     INTEGER DEFAULT 0,
    created_at      TEXT DEFAULT (datetime('now')),
    updated_at      TEXT DEFAULT (datetime('now'))
);

-- Orders
CREATE TABLE IF NOT EXISTS orders (
    id                  TEXT PRIMARY KEY,
    shop_id             TEXT NOT NULL,
    etsy_order_id       TEXT,
    customer_name       TEXT,
    customer_email      TEXT,
    product_id          TEXT,
    quantity            INTEGER DEFAULT 1,
    total_price         REAL,
    cost                REAL,
    profit              REAL,
    fulfillment_id      TEXT,
    fulfillment_status  TEXT DEFAULT 'pending',
    tracking_number     TEXT,
    status              TEXT DEFAULT 'new',
    created_at          TEXT DEFAULT (datetime('now')),
    updated_at          TEXT DEFAULT (datetime('now'))
);

-- Messages
CREATE TABLE IF NOT EXISTS messages (
    id              TEXT PRIMARY KEY,
    shop_id         TEXT NOT NULL,
    customer_name   TEXT,
    subject         TEXT,
    body            TEXT,
    direction       TEXT DEFAULT 'inbound',
    replied         INTEGER DEFAULT 0,
    reply_body      TEXT,
    handled_by      TEXT DEFAULT 'rex',
    created_at      TEXT DEFAULT (datetime('now'))
);

-- Office rooms (isometric floor plan per shop; grid size lives in shop_settings office_cols/office_rows)
CREATE TABLE IF NOT EXISTS rooms (
    id          TEXT PRIMARY KEY,
    shop_id     TEXT NOT NULL,
    name        TEXT NOT NULL,
    function    TEXT NOT NULL,
    color       TEXT NOT NULL,
    col         INTEGER NOT NULL,
    row         INTEGER NOT NULL,
    width       INTEGER NOT NULL DEFAULT 1,
    depth       INTEGER NOT NULL DEFAULT 1,
    agent_id    TEXT,
    created_at  TEXT DEFAULT (datetime('now')),
    updated_at  TEXT DEFAULT (datetime('now'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_rooms_shop ON rooms(shop_id);
CREATE INDEX IF NOT EXISTS idx_agents_shop ON agents(shop_id);
CREATE INDEX IF NOT EXISTS idx_tasks_shop ON tasks(shop_id, agent_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_activity_shop ON activity_log(shop_id, agent_id);
CREATE INDEX IF NOT EXISTS idx_activity_created ON activity_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_shop ON orders(shop_id, status);
CREATE INDEX IF NOT EXISTS idx_products_shop ON products(shop_id, status);
CREATE INDEX IF NOT EXISTS idx_shop_settings ON shop_settings(shop_id);
