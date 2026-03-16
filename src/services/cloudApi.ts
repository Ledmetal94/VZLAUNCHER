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
