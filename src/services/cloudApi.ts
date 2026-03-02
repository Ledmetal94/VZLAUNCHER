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

// ─── Health check ─────────────────────────────────────────────────────────────
export async function checkCloudHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${CLOUD_URL}/health`, { signal: AbortSignal.timeout(3000) })
    return res.ok
  } catch {
    return false
  }
}
