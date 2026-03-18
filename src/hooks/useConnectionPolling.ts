import { useEffect, useRef } from 'react'
import { checkCloudHealth } from '@/services/cloudApi'
import { checkBridgeHealth } from '@/services/bridgeApi'
import { useConnectionStore } from '@/store/connectionStore'
import { useSessionStore } from '@/store/sessionStore'

export function useConnectionPolling() {
  const setBridgeStatus = useConnectionStore((s) => s.setBridgeStatus)
  const setCloudStatus = useConnectionStore((s) => s.setCloudStatus)
  const syncAllPending = useSessionStore((s) => s.syncAllPending)
  const wasCloudOfflineRef = useRef(true)

  // Poll bridge health
  useEffect(() => {
    let active = true
    async function poll() {
      const online = await checkBridgeHealth()
      if (active) setBridgeStatus(online ? 'online' : 'offline')
    }
    poll()
    const interval = setInterval(poll, 10000)
    return () => { active = false; clearInterval(interval) }
  }, [setBridgeStatus])

  // Poll cloud health + auto-sync pending sessions on reconnect
  useEffect(() => {
    let active = true
    async function poll() {
      const online = await checkCloudHealth()
      if (!active) return
      setCloudStatus(online ? 'online' : 'offline')
      if (online && wasCloudOfflineRef.current) {
        syncAllPending()
      }
      wasCloudOfflineRef.current = !online
    }
    poll()
    const interval = setInterval(poll, 15000)
    return () => { active = false; clearInterval(interval) }
  }, [setCloudStatus, syncAllPending])
}
