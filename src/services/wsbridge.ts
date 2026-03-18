import { onWsMessage, connectWs, disconnectWs } from './wsClient'
import { useConnectionStore } from '@/store/connectionStore'
import { useSessionStore } from '@/store/sessionStore'
import { getSessionStatus } from './bridgeApi'

let cleanup: (() => void) | null = null

/**
 * Initialize WebSocket connection and wire messages to stores.
 * Call once on app mount.
 */
export function initWsBridge() {
  if (cleanup) return // already initialized

  connectWs()

  const unsub = onWsMessage((msg) => {
    const connStore = useConnectionStore.getState()
    const sessionStore = useSessionStore.getState()

    // Any message means bridge is online
    connStore.setBridgeStatus('online')

    switch (msg.type) {
      case 'heartbeat':
        connStore.setBridgeState('idle')
        connStore.setPlatformStatuses(msg.platforms)
        connStore.setAutomationStep(null)
        break

      case 'session_update':
        connStore.setBridgeState(msg.status)
        sessionStore.updateFromWs(msg.elapsed_seconds, msg.remaining_seconds)
        break

      case 'step_progress':
        connStore.setAutomationStep({
          step: msg.step,
          total: msg.total,
          label: msg.label,
          status: msg.status,
        })
        break

      case 'session_error':
        connStore.setBridgeState('error')
        connStore.setAutomationStep(null)
        break
    }
  })

  cleanup = () => {
    unsub()
    disconnectWs()
  }
}

/**
 * Restore session state after WS reconnection.
 */
export async function restoreSessionState() {
  try {
    const status = await getSessionStatus()
    const connStore = useConnectionStore.getState()
    connStore.setBridgeState(status.state || status.status)
    if (status.automationProgress) {
      connStore.setAutomationStep({ ...status.automationProgress, label: status.automationProgress.label || '' })
    }
  } catch {
    // Will retry on next reconnect
  }
}

export function destroyWsBridge() {
  cleanup?.()
  cleanup = null
}
