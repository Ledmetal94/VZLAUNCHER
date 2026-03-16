const BRIDGE_URL = 'http://localhost:3001'

export async function checkBridgeHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${BRIDGE_URL}/health`, { signal: AbortSignal.timeout(3000) })
    return res.ok
  } catch {
    return false
  }
}

export interface LaunchResult {
  success: boolean
  session?: {
    id: string
    gameId: string
    gameName: string
    players: number
    durationPlanned: number
  }
  error?: { code: string; message: string }
}

export async function launchGame(gameId: string, players: number): Promise<LaunchResult> {
  const res = await fetch(`${BRIDGE_URL}/launch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ gameId, players }),
  })
  return res.json()
}

export async function stopSession(): Promise<{ success: boolean }> {
  const res = await fetch(`${BRIDGE_URL}/stop`, { method: 'POST' })
  return res.json()
}

export async function getSessionStatus(): Promise<{
  status: 'idle' | 'running'
  gameId?: string
  gameName?: string
  elapsed?: number
  remaining?: number
  players?: number
}> {
  const res = await fetch(`${BRIDGE_URL}/session`)
  return res.json()
}
