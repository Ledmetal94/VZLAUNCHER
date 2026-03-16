import type { LoginResponse } from '@/types/auth'

const BASE_URL = import.meta.env.VITE_CLOUD_URL || 'http://localhost:3002'

let _accessToken: string | null = null

export function setAccessToken(token: string | null) {
  _accessToken = token
}

export function getAccessToken() {
  return _accessToken
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }

  if (_accessToken) {
    headers['Authorization'] = `Bearer ${_accessToken}`
  }

  const res = await fetch(`${BASE_URL}/api/v1${path}`, {
    ...options,
    headers,
    credentials: 'include',
  })

  if (res.status === 401 && path !== '/auth/refresh') {
    const refreshed = await refreshToken()
    if (refreshed) {
      headers['Authorization'] = `Bearer ${_accessToken}`
      const retry = await fetch(`${BASE_URL}/api/v1${path}`, {
        ...options,
        headers,
        credentials: 'include',
      })
      if (!retry.ok) {
        throw new Error(`HTTP ${retry.status}`)
      }
      return retry.json()
    }
    _accessToken = null
    window.location.href = '/login'
    throw new Error('Session expired')
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error?.message || `HTTP ${res.status}`)
  }

  return res.json()
}

export async function login(
  username: string,
  password: string,
): Promise<LoginResponse> {
  const data = await request<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  })
  _accessToken = data.accessToken
  return data
}

export async function refreshToken(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/api/v1/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    })
    if (!res.ok) return false
    const data = await res.json()
    _accessToken = data.accessToken
    return true
  } catch {
    return false
  }
}

export async function logout(): Promise<void> {
  try {
    await request('/auth/logout', { method: 'POST' })
  } finally {
    _accessToken = null
  }
}

// ─── Sessions ────────────────────────────────────────────────

export interface SyncSessionPayload {
  gameId: string
  platform: string
  category: string
  playersCount: number
  durationPlanned: number
  durationActual: number
  tokensConsumed: number
  status: 'completed' | 'error' | 'cancelled'
  errorLog?: string
  startedAt: string
  endedAt: string
}

export interface CloudSession {
  id: string
  venueId: string
  gameId: string
  operatorId: string
  platform: string
  category: string
  playersCount: number
  durationPlanned: number
  durationActual: number
  tokensConsumed: number
  status: string
  errorLog: string | null
  startedAt: string
  endedAt: string
}

export interface SessionListResponse {
  data: CloudSession[]
  total: number
  page: number
  pageSize: number
}

export async function syncSession(
  session: SyncSessionPayload,
): Promise<CloudSession> {
  return request<CloudSession>('/sessions', {
    method: 'POST',
    body: JSON.stringify(session),
  })
}

export async function getSessionHistory(
  page = 1,
  pageSize = 20,
): Promise<SessionListResponse> {
  return request<SessionListResponse>(
    `/sessions?page=${page}&pageSize=${pageSize}`,
  )
}

// ─── Games ────────────────────────────────────────────────

export interface CloudGame {
  id: string
  name: string
  platform: string
  category: string
  min_players: number
  max_players: number
  duration_minutes: number
  token_cost: number
  description: string
  thumbnail_url: string
  badge: string | null
  enabled: boolean
  bg: string
  created_at: string
}

export async function getGames(): Promise<CloudGame[]> {
  const data = await request<{ games: CloudGame[] }>('/games')
  return data.games
}

// ─── Tokens / Checkout ──────────────────────────────────────

export async function purchaseTokens(
  packageId: number,
  quantity?: number,
): Promise<{ clientSecret: string }> {
  return request<{ clientSecret: string }>('/tokens/purchase', {
    method: 'POST',
    body: JSON.stringify({ packageId, ...(quantity ? { quantity } : {}) }),
  })
}

export interface CheckoutSessionStatus {
  status: string
  paymentStatus: string
  customerEmail: string | null
  tokens: number | null
}

export async function getCheckoutSessionStatus(
  sessionId: string,
): Promise<CheckoutSessionStatus> {
  return request<CheckoutSessionStatus>(
    `/checkout/session-status?session_id=${sessionId}`,
  )
}
