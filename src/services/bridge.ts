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
