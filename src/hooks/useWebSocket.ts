import { useEffect, useRef } from 'react'
import { useConnectionStore } from '@/store/connectionStore'
import { useTokenStore } from '@/store/tokenStore'
import { useLicenseStore } from '@/store/licenseStore'
import { CLOUD_URL } from '@/config/cloudUrl'

const WS_URL = CLOUD_URL.replace(/^http/, 'ws')

const RECONNECT_BASE_MS = 2000
const RECONNECT_MAX_MS = 60000
const MAX_RECONNECT_ATTEMPTS = 5
const HEARTBEAT_MS = 30000

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectAttempt = useRef(0)
  const heartbeatTimer = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    let mounted = true

    function cleanup() {
      if (heartbeatTimer.current) {
        clearInterval(heartbeatTimer.current)
        heartbeatTimer.current = null
      }
    }

    function scheduleReconnect() {
      if (!mounted) return
      if (reconnectAttempt.current >= MAX_RECONNECT_ATTEMPTS) return
      const delay = Math.min(
        RECONNECT_BASE_MS * Math.pow(2, reconnectAttempt.current),
        RECONNECT_MAX_MS,
      )
      reconnectAttempt.current++
      setTimeout(connect, delay)
    }

    async function connect() {
      if (!mounted) return
      try {
        const { getAccessToken, refreshToken } = await import('@/services/cloudApi')
        let token = getAccessToken()

        // On reconnect attempts, try refreshing the token first
        if (!token && reconnectAttempt.current > 0) {
          await refreshToken()
          token = getAccessToken()
        }
        if (!token) return

        // Skip WS in dev if cloud backend doesn't support it
        if (import.meta.env.DEV) {
          try {
            const res = await fetch(`${WS_URL.replace(/^ws/, 'http')}/health`, { signal: AbortSignal.timeout(2000) })
            if (!res.ok) return
          } catch { return }
        }

        const ws = new WebSocket(`${WS_URL}/ws?token=${token}`)
        wsRef.current = ws

        ws.onopen = () => {
          reconnectAttempt.current = 0
          useConnectionStore.getState().setCloudStatus('online')

          heartbeatTimer.current = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: 'ping' }))
            }
          }, HEARTBEAT_MS)
        }

        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data)
            switch (msg.type) {
              case 'pong':
                break
              case 'token_balance_updated':
                if (typeof msg.balance === 'number') {
                  useTokenStore.getState().setBalance(msg.balance)
                }
                break
              case 'license_updated':
                useLicenseStore.getState().validate()
                break
              case 'games_updated':
                import('@/store/gameStore').then(({ useGameStore }) => {
                  useGameStore.getState().fetchGames()
                })
                break
            }
          } catch {
            // Ignore malformed messages
          }
        }

        ws.onclose = () => {
          cleanup()
          scheduleReconnect()
        }

        ws.onerror = () => {
          // onclose will fire after this
        }
      } catch {
        scheduleReconnect()
      }
    }

    connect()

    return () => {
      mounted = false
      cleanup()
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
    }
  }, [])
}
