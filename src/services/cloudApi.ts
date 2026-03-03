const CLOUD_URL = import.meta.env.VITE_CLOUD_URL ?? (import.meta.env.DEV ? 'http://localhost:3002' : '/api')

// ─── Token storage (in-memory, rehydrated from authStore on load) ─────────────
let _token: string | null = null

export function setToken(token: string | null) {
  _token = token
}

function headers(): HeadersInit {
  const h: HeadersInit = { 'Content-Type': 'application/json' }
  if (_token) h['Authorization'] = `Bearer ${_token}`
  return h
}

// ─── Auth ──────────────────────────────────────────────────────────────────────
export interface LoginResponse {
  token: string
  expiresIn: number
  user: {
    id: string
    name: string
    role: string
    venueId: string
    venueName: string | null
  }
}

export async function login(username: string, password: string): Promise<LoginResponse> {
  const res = await fetch(`${CLOUD_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error ?? `Login failed (${res.status})`)
  }
  return res.json()
}

// ─── Sessions ─────────────────────────────────────────────────────────────────
export interface SessionPayload {
  id: string
  gameSlug: string
  gameName: string
  launcher?: string
  difficulty?: string
  startTime: string
  endTime?: string
  durationSeconds?: number
  price?: number
  notes?: string
}

export async function syncSession(payload: SessionPayload): Promise<void> {
  const res = await fetch(`${CLOUD_URL}/sessions`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(10000),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error ?? `Sync failed (${res.status})`)
  }
}

// ─── Operators ────────────────────────────────────────────────────────────────
export interface OperatorRecord {
  id: string
  name: string
  username: string
  role: 'admin' | 'normal'
  active: boolean
  created_at: string
}

export async function listOperators(): Promise<OperatorRecord[]> {
  const res = await fetch(`${CLOUD_URL}/operators`, { headers: headers(), signal: AbortSignal.timeout(8000) })
  if (!res.ok) throw new Error(`Failed to list operators (${res.status})`)
  return res.json()
}

export async function createOperator(data: { name: string; username: string; password: string; role: 'admin' | 'normal' }): Promise<OperatorRecord> {
  const res = await fetch(`${CLOUD_URL}/operators`, {
    method: 'POST', headers: headers(), body: JSON.stringify(data), signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error ?? `Failed (${res.status})`) }
  return res.json()
}

export async function updateOperator(id: string, data: { name?: string; username?: string; password?: string; role?: 'admin' | 'normal' }): Promise<OperatorRecord> {
  const res = await fetch(`${CLOUD_URL}/operators/${id}`, {
    method: 'PUT', headers: headers(), body: JSON.stringify(data), signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error ?? `Failed (${res.status})`) }
  return res.json()
}

export async function deactivateOperator(id: string): Promise<void> {
  const res = await fetch(`${CLOUD_URL}/operators/${id}`, {
    method: 'DELETE', headers: headers(), signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(`Failed (${res.status})`)
}

// ─── Health check ─────────────────────────────────────────────────────────────
export async function checkCloudHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${CLOUD_URL}/health`, { signal: AbortSignal.timeout(3000) })
    return res.ok
  } catch {
    return false
  }
}
