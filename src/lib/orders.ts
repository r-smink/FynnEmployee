import { v4 as uuid } from 'uuid'
import { all, get, run } from './db'
import { getSetting, setSetting } from './ai'
import { emitAgentEvent } from './events'
import type { Fulfillment } from './publish'
import { autoFixEnabled, queueOrderFix } from './agent-queue'
import {
  isEtsyConnected, getPaidReceipts, getReceipt, addReceiptTracking, type EtsyReceipt,
} from '@/integrations/etsy/client'
import {
  isPrintfulConnected, createOrder, confirmOrder, getOrder, findOrderByExternalId,
  type OrderItem, type OrderRecipient, type PrintfulOrder,
} from '@/integrations/printful/client'

// Etsy orders for listings this app made go to Printful by themselves:
// - draft: Printful gets a draft order, the owner confirms it (and pays) with one click
// - auto:  the order is confirmed right away, so Printful charges and starts printing
// - off:   orders only show up here; the owner makes them in Printful
// Shipments go back to Etsy with their tracking code. Anything that goes wrong lands under Fouten.

export type FulfillMode = 'off' | 'draft' | 'auto'

export function fulfillMode(): FulfillMode {
  const mode = getSetting('order_fulfillment')
  return mode === 'off' || mode === 'auto' ? mode : 'draft'
}

export interface OrderRow {
  id: string
  shop_id: string
  etsy_order_id: string
  total_price: number
  status: string
  fulfillment_id: string | null
  fulfillment_status: string
  fulfill_error: string | null
}

export interface CheckResult {
  imported: number
  sent: number
  shipped: number
  failed: number
}

const CHECK_EVERY_MS = 5 * 60_000
const g = globalThis as unknown as { __fynnOrderLoop?: NodeJS.Timeout; __fynnOrderCheck?: Promise<CheckResult>; __fynnOrderCheckAt?: number }

// Checks Etsy and Printful every few minutes for as long as the app runs
export function startOrderLoop() {
  if (g.__fynnOrderLoop) return
  const tick = () => { checkOrders().catch(err => console.error('Order check failed:', err)) }
  g.__fynnOrderLoop = setInterval(tick, CHECK_EVERY_MS)
  setTimeout(tick, 20_000)
}

// One check at a time; a second caller waits for the running one
export function checkOrders(): Promise<CheckResult> {
  g.__fynnOrderCheck ??= runCheck().finally(() => { g.__fynnOrderCheck = undefined; g.__fynnOrderCheckAt = Date.now() })
  return g.__fynnOrderCheck
}

export const msSinceLastCheck = () => Date.now() - (g.__fynnOrderCheckAt ?? 0)

// Orders the app still has to send or follow until they ship
export function openOrderCount(shopId: string): number {
  return get<{ n: number }>(
    `SELECT COUNT(*) AS n FROM orders WHERE shop_id = ? AND fulfill_error IS NULL AND (
      (status = 'new' AND fulfillment_status = 'pending') OR (status = 'processing' AND fulfillment_id IS NOT NULL AND tracking_sent = 0))`,
    shopId
  )!.n
}

async function runCheck(): Promise<CheckResult> {
  const result: CheckResult = { imported: 0, sent: 0, shipped: 0, failed: 0 }
  if (!isEtsyConnected() || !isPrintfulConnected()) return result

  // Orders from before this ran the first time are left alone: they may already be in Printful by hand
  let since = parseInt(getSetting('orders_since') || '', 10)
  if (!Number.isInteger(since)) {
    since = Math.floor(Date.now() / 1000)
    setSetting('orders_since', String(since))
  }

  const receipts = await getPaidReceipts(since)
  const byId = new Map(receipts.map(r => [String(r.receipt_id), r]))
  result.imported = importReceipts(receipts)

  // With sending off, new orders come in as manual; only ones the owner sends through the app are pending
  const confirm = fulfillMode() === 'auto'
  const waiting = all<OrderRow>(
    "SELECT * FROM orders WHERE status = 'new' AND fulfillment_status = 'pending' AND fulfillment_id IS NULL AND fulfill_error IS NULL"
  )
  for (const order of waiting) {
    try {
      const receipt = byId.get(order.etsy_order_id) ?? await getReceipt(Number(order.etsy_order_id))
      await sendToPrintful(order, receipt, confirm)
      result.sent++
    } catch (err) {
      result.failed++
      fail(order, message(err))
    }
  }

  const open = all<OrderRow>(
    "SELECT * FROM orders WHERE fulfillment_id IS NOT NULL AND status = 'processing' AND tracking_sent = 0 AND fulfill_error IS NULL"
  )
  for (const order of open) {
    try {
      if (await followUp(order)) result.shipped++
    } catch (err) {
      result.failed++
      fail(order, message(err))
    }
  }
  return result
}

// New Etsy orders become rows; ones shipped on Etsy by hand stop waiting
function importReceipts(receipts: EtsyReceipt[]): number {
  let imported = 0
  const manual = fulfillMode() === 'off'
  for (const receipt of receipts) {
    const etsyId = String(receipt.receipt_id)
    const existing = get<OrderRow>('SELECT * FROM orders WHERE etsy_order_id = ?', etsyId)
    if (existing) {
      if (receipt.is_shipped && !existing.fulfillment_id && existing.status === 'new') {
        run(
          "UPDATE orders SET status = 'fulfilled', fulfillment_status = 'manual', fulfill_error = NULL, updated_at = datetime('now') WHERE id = ?",
          existing.id
        )
      }
      continue
    }
    if (receipt.is_shipped) continue

    const total = receipt.grandtotal.amount / receipt.grandtotal.divisor
    const shopId = shopFor(receipt)
    run(
      `INSERT INTO orders (id, shop_id, etsy_order_id, customer_name, customer_email, product_title, quantity, total_price,
        status, fulfillment_status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'new', ?, datetime(?, 'unixepoch'))`,
      uuid(), shopId, etsyId, receipt.name, receipt.buyer_email,
      receipt.transactions.map(t => t.title).join(', '),
      receipt.transactions.reduce((sum, t) => sum + t.quantity, 0),
      total, manual ? 'manual' : 'pending', receipt.create_timestamp
    )
    imported++
    log(shopId, `Nieuwe bestelling van ${receipt.name} (${total.toFixed(2)} ${receipt.grandtotal.currency_code})`, 'info')
  }
  return imported
}

async function sendToPrintful(order: OrderRow, receipt: EtsyReceipt, confirm: boolean) {
  const items = orderItems(receipt)
  // A crash after creating the order must not create a second one
  let pf = await findOrderByExternalId(order.etsy_order_id)
  if (!pf) {
    pf = await createOrder({
      external_id: order.etsy_order_id,
      recipient: recipient(receipt),
      items,
      shipping: 'STANDARD',
    })
  }
  saveSent(order.id, pf)

  if (confirm && pf.status === 'draft') {
    try {
      saveSent(order.id, await confirmOrder(pf.id))
    } catch (err) {
      throw new Error(`Het concept staat in Printful, maar bevestigen lukte niet: ${message(err)}`)
    }
  }
  log(order.shop_id, pf.status === 'draft' && !confirm
    ? `Bestelling van ${receipt.name} staat klaar in Printful. Bevestig hem bij Bestellingen.`
    : `Bestelling van ${receipt.name} is naar Printful gestuurd`, 'success')
}

function saveSent(orderId: string, pf: PrintfulOrder) {
  const parsed = parseFloat(pf.costs?.total ?? '')
  const cost = Number.isFinite(parsed) ? parsed : null
  run(
    `UPDATE orders SET fulfillment_id = ?, status = 'processing', fulfillment_status = ?, cost = ?,
      profit = CASE WHEN ? IS NULL THEN profit ELSE ROUND(total_price - ?, 2) END, updated_at = datetime('now') WHERE id = ?`,
    String(pf.id), pf.status === 'draft' ? 'draft' : 'submitted', cost, cost, cost, orderId
  )
}

// Every Etsy line must be a listing this app made: its sku names the Printful variant, its product the print file
function orderItems(receipt: EtsyReceipt): OrderItem[] {
  return receipt.transactions.map(t => {
    const product = get<{ fulfillment: string | null }>(
      'SELECT fulfillment FROM products WHERE etsy_listing_id = ? AND fulfillment IS NOT NULL', String(t.listing_id)
    )
    const state: Fulfillment | null = product?.fulfillment ? JSON.parse(product.fulfillment) : null
    const skuVariant = Number(/^PF-(\d+)$/.exec(t.sku ?? '')?.[1])
    const variant = state?.variants.find(v => v.variantId === skuVariant) ?? (state?.variants.length === 1 ? state.variants[0] : undefined)
    const fileId = variant && state?.printfiles[variant.printfileId]?.fileId
    if (!state || !variant || !fileId) {
      throw new Error(`"${t.title}" is niet door deze app op Etsy gezet, dus de app weet niet welk Printful-product erbij hoort. Maak deze bestelling zelf aan in Printful.`)
    }
    return {
      variant_id: variant.variantId,
      quantity: t.quantity,
      retail_price: (t.price.amount / t.price.divisor).toFixed(2),
      files: [{ type: state.placement, id: fileId }],
    }
  })
}

// Printful only wants a state for countries that need one
function recipient(receipt: EtsyReceipt): OrderRecipient {
  return {
    name: receipt.name,
    address1: receipt.first_line,
    address2: receipt.second_line || undefined,
    city: receipt.city,
    state_code: ['US', 'CA', 'AU'].includes(receipt.country_iso) ? receipt.state || undefined : undefined,
    country_code: receipt.country_iso,
    zip: receipt.zip,
    email: receipt.buyer_email || undefined,
  }
}

const PRINTFUL_STATUS: Record<string, string> = {
  draft: 'draft', pending: 'submitted', inprocess: 'in_production', onhold: 'in_production', partial: 'in_production', fulfilled: 'shipped',
}

// Follows a sent order; once Printful ships it, the tracking code goes to Etsy. True when that happened.
async function followUp(order: OrderRow): Promise<boolean> {
  const pf = await getOrder(Number(order.fulfillment_id))
  if (pf.status === 'canceled') {
    run("UPDATE orders SET status = 'cancelled', fulfillment_status = 'cancelled', updated_at = datetime('now') WHERE id = ?", order.id)
    return false
  }
  if (pf.status === 'failed') throw new Error('Printful kon deze bestelling niet maken. Kijk in Printful wat er mis is.')

  const shipment = pf.shipments?.[0]
  if (!shipment) {
    run("UPDATE orders SET fulfillment_status = ?, updated_at = datetime('now') WHERE id = ?", PRINTFUL_STATUS[pf.status] ?? order.fulfillment_status, order.id)
    return false
  }

  run(
    `UPDATE orders SET status = 'fulfilled', fulfillment_status = 'shipped', tracking_number = ?, carrier = ?, tracking_url = ?,
      updated_at = datetime('now') WHERE id = ?`,
    shipment.tracking_number, shipment.carrier, shipment.tracking_url, order.id
  )
  try {
    await sendTracking(Number(order.etsy_order_id), shipment.tracking_number, shipment.carrier)
  } catch (err) {
    throw new Error(`Verzonden, maar de track & trace op Etsy zetten lukte niet: ${message(err)}`)
  }
  run('UPDATE orders SET tracking_sent = 1 WHERE id = ?', order.id)
  log(order.shop_id, `Bestelling ${order.etsy_order_id} is verzonden (${shipment.carrier} ${shipment.tracking_number})`, 'success')
  return true
}

// Etsy knows most carriers by name; anything it doesn't know goes in as "other"
async function sendTracking(receiptId: number, code: string, carrier: string) {
  try {
    await addReceiptTracking(receiptId, code, carrier.toLowerCase().replace(/\s+/g, '-'))
  } catch (err) {
    if (!message(err).includes('(400)')) throw err
    await addReceiptTracking(receiptId, code, 'other')
  }
}

// ─── Actions from the Bestellingen page ───────────────────

export async function confirmDraft(order: OrderRow) {
  if (!order.fulfillment_id || order.fulfillment_status !== 'draft') throw new Error('Deze bestelling staat niet als concept in Printful')
  saveSent(order.id, await confirmOrder(Number(order.fulfillment_id)))
  run("UPDATE orders SET fulfill_error = NULL WHERE id = ?", order.id)
  log(order.shop_id, `Bestelling ${order.etsy_order_id} is bevestigd in Printful`, 'success')
}

// Clears the error so the next check tries again; a manual order is sent through the app after all.
// When the owner does it, automatic fixes may try again after this attempt.
export function retryOrder(order: OrderRow, byOwner = true) {
  run(
    `UPDATE orders SET fulfill_error = NULL,${byOwner ? ' auto_fixes = 0,' : ''}
      fulfillment_status = CASE WHEN fulfillment_status = 'manual' AND fulfillment_id IS NULL THEN 'pending' ELSE fulfillment_status END,
      updated_at = datetime('now') WHERE id = ?`,
    order.id
  )
}

// The owner handled it in Printful and on Etsy; the app stops doing anything with it
export function markHandled(order: OrderRow) {
  run(
    "UPDATE orders SET status = 'fulfilled', fulfillment_status = 'manual', fulfill_error = NULL, updated_at = datetime('now') WHERE id = ?",
    order.id
  )
}

// ─── Helpers ──────────────────────────────────────────────

// The shop whose product was sold; orders for listings the app doesn't know go to the first shop
function shopFor(receipt: EtsyReceipt): string {
  for (const t of receipt.transactions) {
    const product = get<{ shop_id: string }>('SELECT shop_id FROM products WHERE etsy_listing_id = ?', String(t.listing_id))
    if (product) return product.shop_id
  }
  return get<{ id: string }>('SELECT id FROM shops ORDER BY rowid LIMIT 1')?.id ?? 'default'
}

function fail(order: OrderRow, error: string) {
  run("UPDATE orders SET fulfill_error = ?, updated_at = datetime('now') WHERE id = ?", error, order.id)
  log(order.shop_id, `Bestelling ${order.etsy_order_id}: ${error}`, 'error')
  // One automatic try by Aria per owner attempt; after that it waits on Fouten
  const tries = get<{ auto_fixes: number }>('SELECT auto_fixes FROM orders WHERE id = ?', order.id)?.auto_fixes ?? 0
  if (autoFixEnabled() && tries < 1 && queueOrderFix(order.shop_id, order.id, order.etsy_order_id, { auto: true })) {
    run('UPDATE orders SET auto_fixes = auto_fixes + 1 WHERE id = ?', order.id)
  }
}

const message = (err: unknown) => (err instanceof Error ? err.message : String(err))

// Shown in the activity feed as Aria, the fulfillment agent
function log(shopId: string, text: string, type: 'info' | 'success' | 'error') {
  const agent = get<{ id: string }>("SELECT id FROM agents WHERE shop_id = ? AND template_type = 'fulfillment' LIMIT 1", shopId)
  if (!agent) return
  run('INSERT INTO activity_log (shop_id, agent_id, message, type, demo) VALUES (?, ?, ?, ?, 0)', shopId, agent.id, text, type)
  emitAgentEvent({
    shopId, agentId: agent.id, type: 'activity',
    data: { message: text, activityType: type }, timestamp: new Date().toISOString(),
  })
}
