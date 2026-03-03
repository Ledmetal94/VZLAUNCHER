const BRIDGE_URL = 'http://localhost:3001'

export async function checkBridgeHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${BRIDGE_URL}/health`, { signal: AbortSignal.timeout(2000) })
    return res.ok
  } catch {
    return false
  }
}

export async function prepareGame(gameSlug: string): Promise<{ success: boolean; error?: string }> {
  const res = await fetch(`${BRIDGE_URL}/prepare`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ gameSlug }),
  })
  return res.json()
}

export async function startGame(difficulty: string): Promise<{ success: boolean; error?: string }> {
  const res = await fetch(`${BRIDGE_URL}/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ difficulty }),
  })
  return res.json()
}

export async function setWindowTopmost(topmost: boolean): Promise<void> {
  try {
    await fetch(`${BRIDGE_URL}/set-topmost`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topmost }),
    })
  } catch {
    // best-effort — don't block session flow if this fails
  }
}

export async function pushSessionToBridge(session: object): Promise<void> {
  await fetch(`${BRIDGE_URL}/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(session),
  })
}

export async function getBridgeSessions(filters?: {
  gameSlug?: string
  operatorId?: string
  from?: number
  to?: number
}): Promise<{ success: boolean; count: number; sessions: unknown[] }> {
  const params = new URLSearchParams()
  if (filters?.gameSlug) params.set('gameSlug', filters.gameSlug)
  if (filters?.operatorId) params.set('operatorId', filters.operatorId)
  if (filters?.from) params.set('from', String(filters.from))
  if (filters?.to) params.set('to', String(filters.to))
  const qs = params.toString()
  const res = await fetch(`${BRIDGE_URL}/sessions${qs ? `?${qs}` : ''}`)
  return res.json()
}

export async function getBridgeVersion(): Promise<{
  current: string
  latest: string | null
  updateAvailable: boolean
}> {
  const res = await fetch(`${BRIDGE_URL}/version`, { signal: AbortSignal.timeout(5000) })
  return res.json()
}

export async function triggerBridgeUpdate(): Promise<{ success: boolean; error?: string }> {
  const res = await fetch(`${BRIDGE_URL}/update`, { method: 'POST' })
  return res.json()
}

export async function getBridgeStats(): Promise<{
  success: boolean
  stats: {
    total: number
    totalRevenue: number
    avgDuration: number
    byGame: Record<string, { gameName: string; count: number; revenue: number }>
    byOperator: Record<string, { operatorName: string; count: number; revenue: number }>
  }
}> {
  const res = await fetch(`${BRIDGE_URL}/sessions/stats`)
  return res.json()
}
