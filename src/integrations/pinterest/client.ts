import crypto from 'crypto'
import { getSetting, setSetting } from '@/lib/ai'

// Pinterest API v5: OAuth for the shop's Pinterest business account, boards and pins.
// A new Pinterest app starts with Trial access; pins only go public once Pinterest grants Standard access.

const API = 'https://api.pinterest.com/v5'
const AUTH_URL = 'https://www.pinterest.com/oauth/'
const SCOPES = ['boards:read', 'boards:write', 'pins:read', 'pins:write', 'user_accounts:read']

export const isPinterestConfigured = () => !!getSetting('pinterest_app_id') && !!getSetting('pinterest_app_secret')
export const isPinterestConnected = () => !!getSetting('pinterest_access_token')

function basicAuth(): string {
  const id = getSetting('pinterest_app_id'), secret = getSetting('pinterest_app_secret')
  if (!id || !secret) throw new Error('Vul eerst de App ID en App secret van je Pinterest-app in')
  return 'Basic ' + Buffer.from(`${id}:${secret}`).toString('base64')
}

export function getPinterestAuthUrl(redirectUri: string, shopId: string): string {
  basicAuth()
  const state = crypto.randomBytes(16).toString('hex')
  setSetting('pinterest_oauth_state', `${state}:${shopId}`)
  const params = new URLSearchParams({
    client_id: getSetting('pinterest_app_id')!, redirect_uri: redirectUri, response_type: 'code', scope: SCOPES.join(','), state,
  })
  return `${AUTH_URL}?${params}`
}

// The shop the owner connected from, or null when the state doesn't match
export function checkPinterestState(state: string): string | null {
  const [saved, shopId] = (getSetting('pinterest_oauth_state') || '').split(':')
  return saved && saved === state ? shopId : null
}

async function tokenRequest(body: Record<string, string>) {
  const res = await fetch(`${API}/oauth/token`, {
    method: 'POST',
    headers: { Authorization: basicAuth(), 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(body),
  })
  if (!res.ok) throw new Error(`Pinterest weigert de koppeling (${res.status}): ${(await res.text()).slice(0, 200)}`)
  const data = await res.json() as { access_token: string; refresh_token?: string; expires_in: number }
  setSetting('pinterest_access_token', data.access_token)
  if (data.refresh_token) setSetting('pinterest_refresh_token', data.refresh_token)
  setSetting('pinterest_token_expires', String(Date.now() + data.expires_in * 1000))
  return data.access_token
}

export async function exchangePinterestCode(code: string, redirectUri: string) {
  await tokenRequest({ grant_type: 'authorization_code', code, redirect_uri: redirectUri })
  const user = await pinterestFetch<{ username: string }>('/user_account')
  setSetting('pinterest_username', user.username)
}

export function disconnectPinterest() {
  for (const key of ['pinterest_access_token', 'pinterest_refresh_token', 'pinterest_token_expires', 'pinterest_username']) setSetting(key, '')
}

async function accessToken(): Promise<string> {
  const token = getSetting('pinterest_access_token')
  if (!token) throw new Error('Pinterest is niet gekoppeld')
  const expires = Number(getSetting('pinterest_token_expires') || 0)
  const refresh = getSetting('pinterest_refresh_token')
  if (refresh && expires && Date.now() > expires - 5 * 60 * 1000) {
    return tokenRequest({ grant_type: 'refresh_token', refresh_token: refresh })
  }
  return token
}

async function pinterestFetch<T>(endpoint: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API}${endpoint}`, {
    ...init,
    headers: { Authorization: `Bearer ${await accessToken()}`, 'Content-Type': 'application/json', ...init.headers },
    signal: AbortSignal.timeout(30_000),
  })
  if (!res.ok) throw new Error(`Pinterest API-fout (${res.status}): ${(await res.text()).slice(0, 300)}`)
  return res.json()
}

export interface PinterestBoard { id: string; name: string; privacy?: string }

export async function getBoards(): Promise<PinterestBoard[]> {
  const data = await pinterestFetch<{ items: PinterestBoard[] }>('/boards?page_size=100')
  return data.items
}

export async function createBoard(name: string, description: string): Promise<PinterestBoard> {
  return pinterestFetch('/boards', { method: 'POST', body: JSON.stringify({ name: name.slice(0, 50), description: description.slice(0, 500), privacy: 'PUBLIC' }) })
}

export async function createPin(pin: { boardId: string; title: string; description: string; link: string; imageUrl: string; altText?: string }) {
  return pinterestFetch<{ id: string }>('/pins', {
    method: 'POST',
    body: JSON.stringify({
      board_id: pin.boardId,
      title: pin.title.slice(0, 100),
      description: pin.description.slice(0, 500),
      link: pin.link,
      alt_text: pin.altText?.slice(0, 500),
      media_source: { source_type: 'image_url', url: pin.imageUrl },
    }),
  })
}
