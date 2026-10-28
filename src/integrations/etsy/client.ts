import crypto from 'crypto'
import { getSetting, setSetting } from '@/lib/ai'

const ETSY_API_BASE = 'https://openapi.etsy.com/v3'
const ETSY_AUTH_URL = 'https://www.etsy.com/oauth/connect'
const ETSY_TOKEN_URL = 'https://api.etsy.com/v3/public/oauth/token'

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
  const apiKey = getSetting('etsy_api_key')
  if (!apiKey) throw new Error('Etsy API key not configured')

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
  const apiKey = getSetting('etsy_api_key')
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
  const apiKey = getSetting('etsy_api_key')
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
  const apiKey = getSetting('etsy_api_key')
  const accessToken = await getAccessToken()

  const response = await fetch(`${ETSY_API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'x-api-key': apiKey!,
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Etsy API error (${response.status}): ${err}`)
  }

  return response.json()
}

// ─── Shop ─────────────────────────────────────────────────

export async function getShop(): Promise<EtsyShop> {
  // First get the user to find their shop
  const user = await etsyFetch<{ user_id: number }>('/application/users/me')
  const shops = await etsyFetch<{ results: EtsyShop[] }>(
    `/application/users/${user.user_id}/shops`
  )
  if (shops.results.length === 0) throw new Error('No Etsy shop found')

  const shop = shops.results[0]
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

export interface EtsyReceipt {
  receipt_id: number
  receipt_type: number
  order_id: number
  buyer_user_id: number
  buyer_email: string
  name: string
  status: string
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
}
