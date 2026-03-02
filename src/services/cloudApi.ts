// In production (Vercel) the API is on the same origin at /api
// In local dev it runs as a separate Express server on port 3002
const CLOUD_URL = import.meta.env.VITE_CLOUD_URL ?? (import.meta.env.DEV ? 'http://localhost:3002' : '/api')

// ─── Token storage (in-memory, rehydrated from stores on load) ────────────────
let _venueToken: string | null = null  // X-Api-Key (venue JWT)
let _operatorToken: string | null = null  // Authorization: Bearer (operator JWT)

export function setVenueToken(token: string | null) {
  _venueToken = token
}

export function setCloudToken(token: string | null) {
  _operatorToken = token
}

function headers(): HeadersInit {
  const h: HeadersInit = { 'Content-Type': 'application/json' }
  if (_venueToken) h['X-Api-Key'] = _venueToken
  if (_operatorToken) h['Authorization'] = `Bearer ${_operatorToken}`
  return h
}

// ─── Venue auth ───────────────────────────────────────────────────────────────
export interface VenueLoginResponse {
  token: string
  venue: {
    id: string
    name: string
    username: string
    timezone: string
    currency: string
    logoUrl: string | null
  }
}

export async function cloudVenueLogin(username: string, password: string): Promise<VenueLoginResponse> {
  const res = await fetch(`${CLOUD_URL}/auth/venue-login`, {
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

// ─── Operator auth ────────────────────────────────────────────────────────────
export interface LoginResponse {
  token: string
  expiresIn: number
  operator: { id: string; name: string; role: string }
}

export async function cloudLogin(pin: string): Promise<LoginResponse> {
  const res = await fetch(`${CLOUD_URL}/auth/login`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ pin }),
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
