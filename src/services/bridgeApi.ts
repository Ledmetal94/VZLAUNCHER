const BRIDGE_URL = import.meta.env.VITE_BRIDGE_URL || 'http://localhost:3001'

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
  try {
    const res = await fetch(`${BRIDGE_URL}/launch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gameId, players }),
      signal: AbortSignal.timeout(15000),
    })
    return res.json()
  } catch (err) {
    return { success: false, error: { code: 'BRIDGE_ERROR', message: err instanceof Error ? err.message : 'Bridge unreachable' } }
  }
}

export async function stopSession(): Promise<{ success: boolean }> {
  try {
    const res = await fetch(`${BRIDGE_URL}/stop`, { method: 'POST', signal: AbortSignal.timeout(10000) })
    return res.json()
  } catch {
    return { success: false }
  }
}

export async function getSessionStatus(): Promise<{
  status: 'idle' | 'running'
  gameId?: string
  gameName?: string
  elapsed?: number
  remaining?: number
  players?: number
}> {
  try {
    const res = await fetch(`${BRIDGE_URL}/session`, { signal: AbortSignal.timeout(5000) })
    return res.json()
  } catch {
    return { status: 'idle' }
  }
}
