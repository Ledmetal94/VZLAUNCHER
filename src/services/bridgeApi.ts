const BRIDGE_URL = import.meta.env.VITE_BRIDGE_URL || 'http://localhost:8000'

export { BRIDGE_URL }

export async function checkBridgeHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${BRIDGE_URL}/api/health`, { signal: AbortSignal.timeout(3000) })
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
    const res = await fetch(`${BRIDGE_URL}/api/launch`, {
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
    const res = await fetch(`${BRIDGE_URL}/api/stop`, { method: 'POST', signal: AbortSignal.timeout(10000) })
    return res.json()
  } catch {
    return { success: false }
  }
}

export async function getSessionStatus(): Promise<{
  status: 'idle' | 'running' | 'launching' | 'stopping' | 'error'
  state?: string
  gameId?: string
  gameName?: string
  elapsed?: number
  remaining?: number
  players?: number
  automationProgress?: { step: number; total: number; label?: string; status: string }
}> {
  try {
    const res = await fetch(`${BRIDGE_URL}/api/session`, { signal: AbortSignal.timeout(5000) })
    return res.json()
  } catch {
    return { status: 'idle' }
  }
}

export async function captureScreenshot(): Promise<{ success: boolean; path?: string; url?: string; error?: string }> {
  try {
    const res = await fetch(`${BRIDGE_URL}/api/screenshot`, { method: 'POST', signal: AbortSignal.timeout(15000) })
    return res.json()
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Bridge unreachable' }
  }
}

export async function restartPlatform(platform: string): Promise<{ success: boolean; platform?: string; action?: string; error?: string }> {
  try {
    const res = await fetch(`${BRIDGE_URL}/api/restart-platform`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ platform }),
      signal: AbortSignal.timeout(10000),
    })
    return res.json()
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Bridge unreachable' }
  }
}
