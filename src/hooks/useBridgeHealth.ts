import { useState, useEffect } from 'react'
import { checkBridgeHealth } from '../services/bridge'

export function useBridgeHealth(intervalMs = 15000) {
  const [healthy, setHealthy] = useState(false)

  useEffect(() => {
    let cancelled = false
    const check = async () => {
      const ok = await checkBridgeHealth()
      if (!cancelled) setHealthy(ok)
    }
    check()
    const id = setInterval(check, intervalMs)
    return () => { cancelled = true; clearInterval(id) }
  }, [intervalMs])

  return { healthy }
}
