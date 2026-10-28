import { getSetting, setSetting } from '@/lib/ai'

const PRINTFUL_API_BASE = 'https://api.printful.com'

// ─── Authenticated Fetch ──────────────────────────────────

async function printfulFetch<T = unknown>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getSetting('printful_api_key')
  if (!token) throw new Error('Printful API key not configured')

  const response = await fetch(`${PRINTFUL_API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Printful API error (${response.status}): ${err}`)
  }

  const data = await response.json()
  // Printful wraps responses in { code, result }
  return data.result !== undefined ? data.result : data
}

// ─── Connection ───────────────────────────────────────────

export function isPrintfulConnected(): boolean {
  return !!getSetting('printful_api_key')
}

export async function getStoreInfo(): Promise<PrintfulStore> {
  const stores = await printfulFetch<PrintfulStore[]>('/stores')
  if (stores.length === 0) throw new Error('No Printful store found')
  const store = stores[0]
  setSetting('printful_store_id', String(store.id))
  setSetting('printful_store_name', store.name)
  return store
}

export function getConnectionInfo(): {
  connected: boolean
  storeName: string | null
  storeId: string | null
} {
  return {
    connected: isPrintfulConnected(),
    storeName: getSetting('printful_store_name'),
    storeId: getSetting('printful_store_id'),
  }
}

// ─── Catalog ──────────────────────────────────────────────

export async function getCatalogProducts(): Promise<PrintfulCatalogProduct[]> {
  return printfulFetch('/products')
}

export async function getCatalogProduct(productId: number): Promise<{
  product: PrintfulCatalogProduct
  variants: PrintfulVariant[]
}> {
  return printfulFetch(`/products/${productId}`)
}

export async function getVariantInfo(variantId: number): Promise<PrintfulVariant> {
  const data = await printfulFetch<{ variant: PrintfulVariant }>(`/products/variant/${variantId}`)
  return data.variant
}

// ─── Shipping Rates ───────────────────────────────────────

export async function getShippingRates(params: {
  recipient: OrderRecipient
  items: { variant_id: number; quantity: number }[]
}): Promise<PrintfulShippingRate[]> {
  return printfulFetch('/shipping/rates', {
    method: 'POST',
    body: JSON.stringify(params),
  })
}

// ─── Orders ───────────────────────────────────────────────

export async function createOrder(order: CreatePrintfulOrder): Promise<PrintfulOrder> {
  return printfulFetch('/orders', {
    method: 'POST',
    body: JSON.stringify(order),
  })
}

export async function confirmOrder(orderId: number): Promise<PrintfulOrder> {
  return printfulFetch(`/orders/${orderId}/confirm`, {
    method: 'POST',
  })
}

export async function getOrder(orderId: number): Promise<PrintfulOrder> {
  return printfulFetch(`/orders/${orderId}`)
}

export async function getOrders(
  status: string = 'open',
  limit: number = 25,
  offset: number = 0
): Promise<PrintfulOrder[]> {
  return printfulFetch(`/orders?status=${status}&limit=${limit}&offset=${offset}`)
}

export async function cancelOrder(orderId: number): Promise<PrintfulOrder> {
  return printfulFetch(`/orders/${orderId}`, {
    method: 'DELETE',
  })
}

// ─── Sync Products (store products linked to Printful) ────

export async function getSyncProducts(
  limit: number = 25,
  offset: number = 0
): Promise<{ total: number; items: PrintfulSyncProduct[] }> {
  const data = await printfulFetch<PrintfulSyncProduct[]>(
    `/store/products?limit=${limit}&offset=${offset}`
  )
  return { total: data.length, items: data }
}

export async function getSyncProduct(productId: number): Promise<{
  sync_product: PrintfulSyncProduct
  sync_variants: PrintfulSyncVariant[]
}> {
  return printfulFetch(`/store/products/${productId}`)
}

// ─── Mockup Generator ─────────────────────────────────────

export async function createMockupTask(params: {
  variant_ids: number[]
  files: { placement: string; image_url: string }[]
}): Promise<{ task_key: string }> {
  // Get product_id from first variant
  return printfulFetch('/mockup-generator/create-task', {
    method: 'POST',
    body: JSON.stringify(params),
  })
}

export async function getMockupTask(taskKey: string): Promise<{
  status: string
  mockups?: { placement: string; variant_ids: number[]; mockup_url: string }[]
}> {
  return printfulFetch(`/mockup-generator/task?task_key=${taskKey}`)
}

// ─── Webhooks ─────────────────────────────────────────────

export async function getWebhooks(): Promise<PrintfulWebhook[]> {
  return printfulFetch('/webhooks')
}

export async function setWebhook(params: {
  url: string
  types: string[]
}): Promise<PrintfulWebhook> {
  return printfulFetch('/webhooks', {
    method: 'POST',
    body: JSON.stringify(params),
  })
}

// ─── Helper: Build order from Etsy receipt ────────────────

export function buildOrderFromEtsy(params: {
  recipient: OrderRecipient
  items: {
    variantId: number
    quantity: number
    designUrl: string
    retailPrice?: number
    printPlacement?: string
  }[]
  externalId?: string
  autoConfirm?: boolean
}): CreatePrintfulOrder {
  return {
    recipient: params.recipient,
    items: params.items.map(item => ({
      variant_id: item.variantId,
      quantity: item.quantity,
      retail_price: item.retailPrice ? String(item.retailPrice) : undefined,
      files: [
        {
          type: item.printPlacement || 'front',
          url: item.designUrl,
        },
      ],
    })),
    shipping: 'STANDARD',
    external_id: params.externalId,
    confirm: params.autoConfirm ?? false,
  }
}

// ─── Types ────────────────────────────────────────────────

export interface PrintfulStore {
  id: number
  name: string
  type: string
  website: string
  currency: string
  created: number
}

export interface PrintfulCatalogProduct {
  id: number
  type: string
  type_name: string
  title: string
  brand: string
  model: string
  image: string
  variant_count: number
  currency: string
  description: string
}

export interface PrintfulVariant {
  id: number
  product_id: number
  name: string
  size: string
  color: string
  color_code: string
  image: string
  price: string
  in_stock: boolean
}

export interface OrderRecipient {
  name: string
  address1: string
  address2?: string
  city: string
  state_code: string
  country_code: string
  zip: string
  email?: string
  phone?: string
}

export interface OrderItemFile {
  type: string  // 'default', 'front', 'back', 'preview'
  url: string
  position?: {
    area_width: number
    area_height: number
    width: number
    height: number
    top: number
    left: number
  }
}

export interface OrderItem {
  variant_id: number
  quantity: number
  retail_price?: string
  files: OrderItemFile[]
  options?: { id: string; value: string }[]
}

export interface CreatePrintfulOrder {
  recipient: OrderRecipient
  items: OrderItem[]
  shipping?: string
  external_id?: string
  confirm?: boolean
  notify?: boolean
}

export interface PrintfulOrder {
  id: number
  external_id: string | null
  status: string  // draft, pending, failed, canceled, inprocess, onhold, partial, fulfilled
  shipping: string
  shipping_service_name: string
  created: number
  updated: number
  recipient: OrderRecipient
  items: (OrderItem & {
    id: number
    name: string
    retail_price: string
    price: string
  })[]
  shipments: PrintfulShipment[]
  costs: {
    currency: string
    subtotal: string
    discount: string
    shipping: string
    tax: string
    total: string
  }
}

export interface PrintfulShipment {
  id: number
  carrier: string
  service: string
  tracking_number: string
  tracking_url: string
  created: number
  ship_date: string
  shipped_at: number
  reshipment: boolean
  items: { item_id: number; quantity: number }[]
}

export interface PrintfulShippingRate {
  id: string
  name: string
  rate: string
  currency: string
  minDeliveryDays: number
  maxDeliveryDays: number
}

export interface PrintfulSyncProduct {
  id: number
  external_id: string
  name: string
  variants: number
  synced: number
  thumbnail_url: string
}

export interface PrintfulSyncVariant {
  id: number
  external_id: string
  sync_product_id: number
  name: string
  synced: boolean
  variant_id: number
  retail_price: string
  currency: string
  sku: string
  product: { variant_id: number; product_id: number; image: string; name: string }
}

export interface PrintfulWebhook {
  type: string
  url: string
  events: string[]
}
