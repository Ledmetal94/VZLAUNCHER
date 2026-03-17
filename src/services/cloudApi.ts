import type { LoginResponse } from '@/types/auth'

const BASE_URL = import.meta.env.VITE_CLOUD_URL || 'http://localhost:3002'

export async function checkCloudHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/health`, { signal: AbortSignal.timeout(5000) })
    return res.ok
  } catch {
    return false
  }
}

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
    signal: options.signal ?? AbortSignal.timeout(30000),
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

export interface SessionFilters {
  startDate?: string
  endDate?: string
  operatorId?: string
  category?: string
  status?: string
}

export async function getSessionHistory(
  page = 1,
  pageSize = 20,
  filters?: SessionFilters,
): Promise<SessionListResponse> {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) })
  if (filters?.startDate) params.set('startDate', filters.startDate)
  if (filters?.endDate) params.set('endDate', filters.endDate)
  if (filters?.operatorId) params.set('operatorId', filters.operatorId)
  if (filters?.category) params.set('category', filters.category)
  if (filters?.status) params.set('status', filters.status)
  return request<SessionListResponse>(`/sessions?${params}`)
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

// ─── Games Admin ─────────────────────────────────────────────

export async function getAdminGames(): Promise<CloudGame[]> {
  const data = await request<{ games: CloudGame[] }>('/admin/games')
  return data.games
}

export interface CreateGamePayload {
  name: string
  platform: string
  category: string
  min_players: number
  max_players: number
  duration_minutes: number
  token_cost: number
  description?: string
  thumbnail_url?: string
  badge?: string | null
  enabled?: boolean
  bg?: string
}

export async function createGame(payload: CreateGamePayload): Promise<CloudGame> {
  const data = await request<{ game: CloudGame }>('/admin/games', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  return data.game
}

export async function updateGame(id: string, payload: Partial<CreateGamePayload>): Promise<CloudGame> {
  const data = await request<{ game: CloudGame }>(`/admin/games/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
  return data.game
}

export async function uploadGameThumbnail(file: File): Promise<string> {
  const doUpload = async () => {
    const formData = new FormData()
    formData.append('file', file)

    const headers: Record<string, string> = {}
    if (_accessToken) {
      headers['Authorization'] = `Bearer ${_accessToken}`
    }

    return fetch(`${BASE_URL}/api/v1/admin/games/upload`, {
      method: 'POST',
      headers,
      body: formData,
      credentials: 'include',
    })
  }

  let res = await doUpload()

  // Retry on 401 with token refresh
  if (res.status === 401) {
    const refreshed = await refreshToken()
    if (refreshed) {
      res = await doUpload()
    } else {
      _accessToken = null
      window.location.href = '/login'
      throw new Error('Session expired')
    }
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error?.message || `Upload failed: HTTP ${res.status}`)
  }

  const data = await res.json()
  return data.url
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

// ─── Operators (admin) ──────────────────────────────────────

export interface CloudOperator {
  id: string
  venue_id: string
  name: string
  username: string
  role: 'admin' | 'normal'
  active: boolean
  created_at: string
  updated_at: string
}

export async function getOperators(venueId?: string): Promise<CloudOperator[]> {
  const query = venueId ? `?venue_id=${venueId}` : ''
  const data = await request<{ operators: CloudOperator[] }>(`/operators${query}`)
  return data.operators
}

export async function createOperator(payload: {
  name: string
  username: string
  password: string
  role: 'admin' | 'normal'
}): Promise<CloudOperator> {
  const data = await request<{ operator: CloudOperator }>('/operators', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  return data.operator
}

export async function updateOperator(
  id: string,
  payload: { name?: string; role?: 'admin' | 'normal'; password?: string },
): Promise<CloudOperator> {
  const data = await request<{ operator: CloudOperator }>(`/operators/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
  return data.operator
}

export async function deleteOperator(id: string): Promise<void> {
  await request(`/operators/${id}`, { method: 'DELETE' })
}

// ─── Super-Admin ─────────────────────────────────────────────

export async function superAdminLogin(
  username: string,
  password: string,
): Promise<LoginResponse> {
  const data = await request<LoginResponse>('/super-admin/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  })
  _accessToken = data.accessToken
  return data
}

// Venues

export interface CloudVenue {
  id: string
  name: string
  address: string | null
  contact_email: string | null
  token_balance: number
  status: string
  logo_url: string | null
  default_token_cost: number
  operating_hours: Record<string, string>
  operatorCount: number
  created_at: string
  updated_at: string
}

export async function getSuperAdminVenues(): Promise<CloudVenue[]> {
  const data = await request<{ venues: CloudVenue[] }>('/super-admin/venues')
  return data.venues
}

export interface CreateVenuePayload {
  name: string
  address?: string
  contact_email?: string
  token_balance?: number
  status?: string
  logo_url?: string
  default_token_cost?: number
  operating_hours?: Record<string, string>
}

export async function createVenue(payload: CreateVenuePayload): Promise<CloudVenue> {
  const data = await request<{ venue: CloudVenue }>('/super-admin/venues', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  return data.venue
}

export async function updateVenue(id: string, payload: Partial<CreateVenuePayload>): Promise<CloudVenue> {
  const data = await request<{ venue: CloudVenue }>(`/super-admin/venues/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
  return data.venue
}

export async function creditVenueTokens(venueId: string, amount: number, reason?: string): Promise<{ balance: number }> {
  return request<{ balance: number }>(`/super-admin/venues/${venueId}/tokens`, {
    method: 'POST',
    body: JSON.stringify({ amount, reason }),
  })
}

// Cross-venue analytics

export interface CrossVenueAnalytics {
  period: { from: string; to: string }
  kpis: {
    totalVenues: number
    activeVenues: number
    totalSessions: number
    completedSessions: number
    totalTokens: number
    totalPlayers: number
    avgDuration: number
  }
  venueBreakdown: Array<{
    venueId: string
    venueName: string
    status: string
    tokenBalance: number
    sessions: number
    tokens: number
    players: number
  }>
  daily: Array<{ date: string; sessions: number; tokens: number }>
}

export async function getCrossVenueAnalytics(
  startDate?: string,
  endDate?: string,
): Promise<CrossVenueAnalytics> {
  const params = new URLSearchParams()
  if (startDate) params.set('startDate', startDate)
  if (endDate) params.set('endDate', endDate)
  const qs = params.toString()
  return request<CrossVenueAnalytics>(`/super-admin/analytics${qs ? `?${qs}` : ''}`)
}

// Cross-venue operators

export interface SuperAdminOperator extends CloudOperator {
  venueName: string
}

export async function getSuperAdminOperators(venueId?: string): Promise<SuperAdminOperator[]> {
  const query = venueId ? `?venue_id=${venueId}` : ''
  const data = await request<{ operators: SuperAdminOperator[] }>(`/super-admin/operators${query}`)
  return data.operators
}

export async function createSuperAdminOperator(payload: {
  venue_id: string
  name: string
  username: string
  password: string
  role: 'admin' | 'normal'
}): Promise<CloudOperator> {
  const data = await request<{ operator: CloudOperator }>('/super-admin/operators', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  return data.operator
}

export async function updateSuperAdminOperator(
  id: string,
  payload: { name?: string; role?: 'admin' | 'normal'; password?: string; active?: boolean; venue_id?: string },
): Promise<CloudOperator> {
  const data = await request<{ operator: CloudOperator }>(`/super-admin/operators/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
  return data.operator
}

// ─── Analytics (admin) ──────────────────────────────────────

export interface AnalyticsSummary {
  period: { from: string; to: string }
  kpis: {
    totalSessions: number
    completedSessions: number
    totalTokens: number
    totalPlayers: number
    avgDuration: number
    errorCount: number
    cancelledCount: number
  }
  topGames: Array<{ gameId: string; gameName: string; count: number }>
  categoryBreakdown: Array<{ category: string; sessions: number; tokens: number }>
  daily: Array<{ date: string; sessions: number; tokens: number; players: number }>
}

export async function getAnalyticsSummary(
  startDate?: string,
  endDate?: string,
  operatorId?: string,
): Promise<AnalyticsSummary> {
  const params = new URLSearchParams()
  if (startDate) params.set('startDate', startDate)
  if (endDate) params.set('endDate', endDate)
  if (operatorId) params.set('operatorId', operatorId)
  const qs = params.toString()
  return request<AnalyticsSummary>(`/admin/analytics/summary${qs ? `?${qs}` : ''}`)
}
