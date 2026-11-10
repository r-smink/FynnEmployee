import crypto from 'crypto'
import { getSetting, setSetting } from '@/lib/ai'

const ETSY_API_BASE = 'https://openapi.etsy.com/v3'
const ETSY_AUTH_URL = 'https://www.etsy.com/oauth/connect'
const ETSY_TOKEN_URL = 'https://api.etsy.com/v3/public/oauth/token'

// ─── Keys ─────────────────────────────────────────────────

// The OAuth client_id is the bare keystring (tolerate a pasted "keystring:secret")
function getKeystring(): string | null {
  const key = getSetting('etsy_api_key')
  return key ? key.split(':')[0].trim() : null
}

// Etsy requires "keystring:shared_secret" in the x-api-key header
function getApiKeyHeader(): string {
  const key = getSetting('etsy_api_key')
  if (!key) throw new Error('Etsy API key not configured')
  if (key.includes(':')) return key
  const secret = getSetting('etsy_api_secret')
  if (!secret) throw new Error('Etsy shared secret ontbreekt. Vul de Shared Secret van je Etsy-app in bij Instellingen.')
  return `${key}:${secret}`
}

// ─── OAuth 2.0 PKCE Helpers ───────────────────────────────

function generateCodeVerifier(): string {
  return crypto.randomBytes(32).toString('base64url')
}

function generateCodeChallenge(verifier: string): string {
  return crypto.createHash('sha256').update(verifier).digest('base64url')
}

function generateState(): string {
  return crypto.randomBytes(16).toString('hex')
}

export function getOAuthUrl(redirectUri: string): { url: string; state: string; codeVerifier: string } {
  const apiKey = getKeystring()
  if (!apiKey) throw new Error('Etsy API key not configured')
  getApiKeyHeader() // fail early, before the Etsy round trip, if the shared secret is missing

  const state = generateState()
  const codeVerifier = generateCodeVerifier()
  const codeChallenge = generateCodeChallenge(codeVerifier)

  // Store for callback verification
  setSetting('etsy_oauth_state', state)
  setSetting('etsy_oauth_code_verifier', codeVerifier)

  const scopes = [
    'transactions_r',   // Read receipts/orders
    'transactions_w',   // Update receipts
    'listings_r',       // Read listings
    'listings_w',       // Create/edit listings
    'listings_d',       // Delete listings
    'shops_r',          // Read shop info
    'shops_w',          // Update shop
    'profile_r',        // Read profile
    'email_r',          // Read email
  ]

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: apiKey,
    redirect_uri: redirectUri,
    scope: scopes.join(' '),
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  })

  return {
    url: `${ETSY_AUTH_URL}?${params.toString()}`,
    state,
    codeVerifier,
  }
}

export async function exchangeCodeForToken(
  code: string,
  redirectUri: string
): Promise<{ access_token: string; refresh_token: string; expires_in: number }> {
  const apiKey = getKeystring()
  const codeVerifier = getSetting('etsy_oauth_code_verifier')
  if (!apiKey || !codeVerifier) throw new Error('OAuth state missing')

  const response = await fetch(ETSY_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: apiKey,
      redirect_uri: redirectUri,
      code,
      code_verifier: codeVerifier,
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Token exchange failed: ${err}`)
  }

  const data = await response.json()

  // Store tokens
  setSetting('etsy_access_token', data.access_token)
  setSetting('etsy_refresh_token', data.refresh_token)
  setSetting('etsy_token_expires', String(Date.now() + data.expires_in * 1000))

  return data
}

export async function refreshAccessToken(): Promise<string> {
  const apiKey = getKeystring()
  const refreshToken = getSetting('etsy_refresh_token')
  if (!apiKey || !refreshToken) throw new Error('No refresh token available')

  const response = await fetch(ETSY_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: apiKey,
      refresh_token: refreshToken,
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Token refresh failed: ${err}`)
  }

  const data = await response.json()
  setSetting('etsy_access_token', data.access_token)
  setSetting('etsy_refresh_token', data.refresh_token)
  setSetting('etsy_token_expires', String(Date.now() + data.expires_in * 1000))

  return data.access_token
}

// ─── Authenticated API Calls ──────────────────────────────

async function getAccessToken(): Promise<string> {
  const token = getSetting('etsy_access_token')
  const expires = getSetting('etsy_token_expires')

  if (!token) throw new Error('Not authenticated with Etsy')

  // Refresh if expiring within 5 minutes
  if (expires && Date.now() > Number(expires) - 300000) {
    return refreshAccessToken()
  }

  return token
}

export async function etsyFetch<T = unknown>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const apiKey = getApiKeyHeader()
  const accessToken = await getAccessToken()

  const response = await fetch(`${ETSY_API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'x-api-key': apiKey,
      'Authorization': `Bearer ${accessToken}`,
      // Form and multipart bodies set their own content type
      ...(typeof options.body === 'string' ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Etsy API error (${response.status}): ${err}`)
  }

  // DELETE answers 204 without a body
  if (response.status === 204) return undefined as T
  return response.json()
}

// ─── Shop ─────────────────────────────────────────────────

export async function getShop(): Promise<EtsyShop> {
  // /users/me returns the shop_id of the authenticated user's shop (absent if they have none)
  const user = await etsyFetch<{ user_id: number; shop_id?: number }>('/application/users/me')
  if (!user.shop_id) throw new Error('Geen Etsy-shop gevonden voor dit account')

  const shop = await etsyFetch<EtsyShop>(`/application/shops/${user.shop_id}`)
  setSetting('etsy_shop_id', String(shop.shop_id))
  setSetting('etsy_shop_name', shop.shop_name)
  return shop
}

function getShopId(): string {
  const id = getSetting('etsy_shop_id')
  if (!id) throw new Error('Shop ID not set - call getShop() first')
  return id
}

// ─── Listings ─────────────────────────────────────────────

export async function getListings(
  status: 'active' | 'inactive' | 'draft' | 'expired' = 'active',
  limit = 25,
  offset = 0
): Promise<{ count: number; results: EtsyListing[] }> {
  const shopId = getShopId()
  return etsyFetch(`/application/shops/${shopId}/listings?state=${status}&limit=${limit}&offset=${offset}`)
}

// Every live and draft listing of the shop, with photos and video, for Milo's SEO check
export async function getAllShopListings(): Promise<EtsyShopListing[]> {
  const shopId = getShopId()
  const listings: EtsyShopListing[] = []
  for (const state of ['active', 'draft'] as const) {
    for (let offset = 0; offset < 500; offset += 100) {
      const page = await etsyFetch<{ count: number; results: EtsyShopListing[] }>(
        `/application/shops/${shopId}/listings?state=${state}&limit=100&offset=${offset}&includes=Images,Videos`
      )
      listings.push(...page.results)
      if (page.results.length < 100) break
    }
  }
  return listings
}

export async function createListing(data: CreateListingData): Promise<EtsyListing> {
  const shopId = getShopId()
  return etsyFetch(`/application/shops/${shopId}/listings`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function updateListing(listingId: number, data: Partial<CreateListingData>): Promise<EtsyListing> {
  const shopId = getShopId()
  return etsyFetch(`/application/shops/${shopId}/listings/${listingId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

export async function getListing(listingId: number): Promise<EtsyListing> {
  return etsyFetch(`/application/listings/${listingId}`)
}

// Etsy wants listing fields form-encoded; arrays go as comma-separated lists
function form(data: Record<string, string | number | boolean | (string | number)[] | undefined | null>): URLSearchParams {
  const body = new URLSearchParams()
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined || value === null) continue
    if (Array.isArray(value)) {
      if (value.length > 0) body.set(key, value.join(','))
    } else {
      body.set(key, String(value))
    }
  }
  return body
}

export async function createDraftListing(data: DraftListingData): Promise<EtsyListing> {
  return etsyFetch(`/application/shops/${getShopId()}/listings`, {
    method: 'POST',
    body: form({ ...data }),
  })
}

export async function setListingState(listingId: number, state: 'active' | 'inactive'): Promise<EtsyListing> {
  return etsyFetch(`/application/shops/${getShopId()}/listings/${listingId}`, {
    method: 'PATCH',
    body: form({ state }),
  })
}

// Removes a draft or live listing from Etsy for good; false when Etsy no longer has it
export async function deleteListing(listingId: number): Promise<boolean> {
  try {
    await etsyFetch(`/application/listings/${listingId}`, { method: 'DELETE' })
    return true
  } catch (err) {
    if (err instanceof Error && err.message.includes('(404)')) return false
    throw err
  }
}

export async function uploadListingImage(listingId: number, image: Blob, filename: string, rank: number, altText?: string) {
  const body = new FormData()
  body.set('image', image, filename)
  body.set('rank', String(rank))
  if (altText) body.set('alt_text', altText.slice(0, 500))
  return etsyFetch<{ listing_image_id: number }>(`/application/shops/${getShopId()}/listings/${listingId}/images`, {
    method: 'POST',
    body,
  })
}

// Etsy accepts one video per listing: 5 to 15 seconds, at most 100 MB
export async function uploadListingVideo(listingId: number, video: Blob, name: string) {
  const body = new FormData()
  body.set('video', video, `${name.replace(/[^\w-]+/g, '-').slice(0, 60) || 'video'}.mp4`)
  body.set('name', name.slice(0, 100))
  return etsyFetch<{ video_id: number }>(`/application/shops/${getShopId()}/listings/${listingId}/videos`, {
    method: 'POST',
    body,
  })
}

// Fields that can be set after the listing exists: styles, or the SEO text
export async function updateListingFields(listingId: number, data: {
  styles?: string[]; materials?: string[]; title?: string; description?: string; tags?: string[]
}) {
  return etsyFetch<EtsyListing>(`/application/shops/${getShopId()}/listings/${listingId}`, {
    method: 'PATCH',
    body: form(data),
  })
}

// The attributes buyers can filter on in a category (colour, occasion, ...), with the values Etsy allows
export async function getTaxonomyProperties(taxonomyId: number): Promise<TaxonomyProperty[]> {
  const data = await etsyFetch<{ results: TaxonomyProperty[] }>(`/application/seller-taxonomy/nodes/${taxonomyId}/properties`)
  return data.results
}

export async function updateListingProperty(listingId: number, propertyId: number, values: { value_id: number; name: string; scale_id: number | null }[]) {
  return etsyFetch(`/application/shops/${getShopId()}/listings/${listingId}/properties/${propertyId}`, {
    method: 'PUT',
    body: form({ value_ids: values.map(v => v.value_id), values: values.map(v => v.name), scale_id: values[0]?.scale_id }),
  })
}

export async function updateListingInventory(listingId: number, inventory: ListingInventory) {
  return etsyFetch(`/application/listings/${listingId}/inventory`, {
    method: 'PUT',
    body: JSON.stringify(inventory),
  })
}

// ─── Shop setup needed for physical listings ──────────────

export async function getTaxonomyNodes(): Promise<TaxonomyNode[]> {
  const data = await etsyFetch<{ results: TaxonomyNode[] }>('/application/seller-taxonomy/nodes')
  return data.results
}

export async function getShippingProfiles(): Promise<{ shipping_profile_id: number; title: string; is_deleted?: boolean }[]> {
  const data = await etsyFetch<{ results: { shipping_profile_id: number; title: string; is_deleted?: boolean }[] }>(
    `/application/shops/${getShopId()}/shipping-profiles`
  )
  return data.results.filter(p => !p.is_deleted)
}

// Etsy calls processing profiles "readiness states"
export async function getReadinessStates(): Promise<ReadinessState[]> {
  const data = await etsyFetch<{ results: ReadinessState[] }>(`/application/shops/${getShopId()}/readiness-state-definitions`)
  return data.results
}

export async function createReadinessState(minDays: number, maxDays: number): Promise<ReadinessState> {
  return etsyFetch(`/application/shops/${getShopId()}/readiness-state-definitions`, {
    method: 'POST',
    body: form({ readiness_state: 'made_to_order', min_processing_time: minDays, max_processing_time: maxDays, processing_time_unit: 'days' }),
  })
}

export async function getProductionPartners(): Promise<{ production_partner_id: number; partner_name: string }[]> {
  const data = await etsyFetch<{ results: { production_partner_id: number; partner_name: string }[] }>(
    `/application/shops/${getShopId()}/production-partners`
  )
  return data.results
}

// ─── Orders / Receipts ────────────────────────────────────

export async function getReceipts(
  status: 'open' | 'completed' | 'all' = 'open',
  limit = 25,
  offset = 0
): Promise<{ count: number; results: EtsyReceipt[] }> {
  const shopId = getShopId()
  let endpoint = `/application/shops/${shopId}/receipts?limit=${limit}&offset=${offset}`
  if (status !== 'all') {
    endpoint += `&was_shipped=${status === 'completed'}`
  }
  return etsyFetch(endpoint)
}

export async function getReceipt(receiptId: number): Promise<EtsyReceipt> {
  const shopId = getShopId()
  return etsyFetch(`/application/shops/${shopId}/receipts/${receiptId}`)
}

// Paid, not cancelled orders created since a moment (unix seconds), newest first
export async function getPaidReceipts(minCreated: number): Promise<EtsyReceipt[]> {
  const shopId = getShopId()
  const data = await etsyFetch<{ results: EtsyReceipt[] }>(
    `/application/shops/${shopId}/receipts?was_paid=true&was_canceled=false&min_created=${minCreated}&limit=100`
  )
  return data.results
}

// Marks the order as shipped on Etsy and gives the buyer the tracking code
export async function addReceiptTracking(receiptId: number, trackingCode: string, carrierName: string) {
  const shopId = getShopId()
  return etsyFetch(`/application/shops/${shopId}/receipts/${receiptId}/tracking`, {
    method: 'POST',
    body: form({ tracking_code: trackingCode, carrier_name: carrierName }),
  })
}

// ─── Connection Check ─────────────────────────────────────

export function isEtsyConnected(): boolean {
  return !!getSetting('etsy_access_token') && !!getSetting('etsy_shop_id')
}

export function getConnectionInfo(): {
  connected: boolean
  shopName: string | null
  shopId: string | null
} {
  return {
    connected: isEtsyConnected(),
    shopName: getSetting('etsy_shop_name'),
    shopId: getSetting('etsy_shop_id'),
  }
}

// ─── Types ────────────────────────────────────────────────

export interface EtsyShop {
  shop_id: number
  shop_name: string
  title: string
  currency_code: string
  url: string
  listing_active_count: number
  num_favorers: number
  transaction_sold_count: number
  icon_url_fullxfull: string | null
}

export interface EtsyListing {
  listing_id: number
  title: string
  description: string
  state: string
  price: { amount: number; divisor: number; currency_code: string }
  quantity: number
  tags: string[]
  taxonomy_id: number
  url: string
  views: number
  num_favorers: number
  creation_timestamp: number
  last_modified_timestamp: number
}

export interface EtsyShopListing extends EtsyListing {
  materials?: string[]
  styles?: string[]
  images?: { listing_image_id: number; url_570xN: string; url_fullxfull: string; alt_text: string | null }[]
  videos?: { video_id: number }[]
}

export interface CreateListingData {
  title: string
  description: string
  price: number
  quantity: number
  taxonomy_id: number
  who_made: 'i_did' | 'someone_else' | 'collective'
  when_made: string
  is_supply: boolean
  shipping_profile_id: number
  tags?: string[]
  type?: 'physical' | 'digital' | 'both'
}

export interface DraftListingData {
  title: string
  description: string
  price: number
  quantity: number
  taxonomy_id: number
  who_made: 'i_did' | 'someone_else' | 'collective'
  when_made: string
  is_supply: boolean
  type: 'physical'
  shipping_profile_id: number
  readiness_state_id: number
  tags?: string[]
  materials?: string[]
  production_partner_ids?: number[]
}

export interface ListingInventory {
  products: {
    sku: string
    property_values: { property_id: number; property_name: string; value_ids: number[]; values: string[] }[]
    offerings: { price: number; quantity: number; is_enabled: boolean; readiness_state_id: number }[]
  }[]
  price_on_property?: number[]
  quantity_on_property?: number[]
  sku_on_property?: number[]
  readiness_state_on_property?: number[]
}

export interface TaxonomyNode {
  id: number
  level: number
  name: string
  parent_id: number | null
  children: TaxonomyNode[]
  full_path_taxonomy_ids: number[]
}

export interface TaxonomyProperty {
  property_id: number
  name: string
  display_name: string
  is_required: boolean
  supports_attributes: boolean
  is_multivalued: boolean
  max_values_allowed: number | null
  possible_values: { value_id: number; name: string; scale_id: number | null }[]
}

export interface ReadinessState {
  readiness_state_id: number
  readiness_state: string  // ready_to_ship, made_to_order
  min_processing_days: number
  max_processing_days: number
}

export interface EtsyReceipt {
  receipt_id: number
  receipt_type: number
  buyer_user_id: number
  buyer_email: string
  // Shipping address
  name: string
  first_line: string
  second_line: string | null
  city: string
  state: string | null
  zip: string
  country_iso: string
  status: string
  is_paid: boolean
  is_shipped: boolean
  grandtotal: { amount: number; divisor: number; currency_code: string }
  subtotal: { amount: number; divisor: number; currency_code: string }
  transactions: EtsyTransaction[]
  create_timestamp: number
  update_timestamp: number
}

export interface EtsyTransaction {
  transaction_id: number
  title: string
  quantity: number
  price: { amount: number; divisor: number; currency_code: string }
  listing_id: number
  // Listings made by this app have "PF-<Printful variant id>"
  sku: string | null
}
