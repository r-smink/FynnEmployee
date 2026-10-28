CREATE TABLE IF NOT EXISTS agents (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    role        TEXT NOT NULL,
    description TEXT,
    avatar_url  TEXT,
    color       TEXT,
    status      TEXT NOT NULL DEFAULT 'idle',
    current_task_id TEXT,
    tasks_completed INTEGER DEFAULT 0,
    created_at  TEXT DEFAULT (datetime('now')),
    updated_at  TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS tasks (
    id              TEXT PRIMARY KEY,
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

CREATE TABLE IF NOT EXISTS activity_log (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    agent_id    TEXT NOT NULL,
    task_id     TEXT,
    message     TEXT NOT NULL,
    type        TEXT NOT NULL DEFAULT 'info',
    metadata    TEXT,
    created_at  TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS products (
    id              TEXT PRIMARY KEY,
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

CREATE TABLE IF NOT EXISTS orders (
    id                  TEXT PRIMARY KEY,
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

CREATE TABLE IF NOT EXISTS messages (
    id              TEXT PRIMARY KEY,
    customer_name   TEXT,
    subject         TEXT,
    body            TEXT,
    direction       TEXT DEFAULT 'inbound',
    replied         INTEGER DEFAULT 0,
    reply_body      TEXT,
    handled_by      TEXT DEFAULT 'rex',
    created_at      TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS settings (
    key         TEXT PRIMARY KEY,
    value       TEXT NOT NULL,
    updated_at  TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_tasks_agent ON tasks(agent_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_activity_agent ON activity_log(agent_id);
CREATE INDEX IF NOT EXISTS idx_activity_created ON activity_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
