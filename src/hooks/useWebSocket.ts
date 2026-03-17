import { useEffect, useRef, useCallback } from 'react'
import { useConnectionStore } from '@/store/connectionStore'
import { useTokenStore } from '@/store/tokenStore'
import { useLicenseStore } from '@/store/licenseStore'

const WS_URL = (import.meta.env.VITE_CLOUD_URL || 'http://localhost:3002')
  .replace(/^http/, 'ws')

const RECONNECT_BASE_MS = 2000
const RECONNECT_MAX_MS = 60000
const MAX_RECONNECT_ATTEMPTS = 5
const HEARTBEAT_MS = 30000

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectAttempt = useRef(0)
  const heartbeatTimer = useRef<ReturnType<typeof setInterval> | null>(null)
  const setCloudStatus = useConnectionStore((s) => s.setCloudStatus)

  const connect = useCallback(async () => {
    try {
      const { getAccessToken } = await import('@/services/cloudApi')
      const token = getAccessToken()
      if (!token) return

      const ws = new WebSocket(`${WS_URL}/ws?token=${token}`)
      wsRef.current = ws

      ws.onopen = () => {
        reconnectAttempt.current = 0
        setCloudStatus('online')

        // Start heartbeat
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
              // Trigger a re-fetch of games
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
        // Don't set cloud status to offline here — let HTTP polling be authoritative
        // WebSocket is an enhancement, not the source of truth for connectivity
        scheduleReconnect()
      }

      ws.onerror = () => {
        // onclose will fire after this
      }
    } catch {
      // WebSocket not supported or connection failed — fallback to polling
      scheduleReconnect()
    }
  }, [setCloudStatus])

  const cleanup = useCallback(() => {
    if (heartbeatTimer.current) {
      clearInterval(heartbeatTimer.current)
      heartbeatTimer.current = null
    }
  }, [])

  const scheduleReconnect = useCallback(() => {
    if (reconnectAttempt.current >= MAX_RECONNECT_ATTEMPTS) return // Stop trying
    const delay = Math.min(
      RECONNECT_BASE_MS * Math.pow(2, reconnectAttempt.current),
      RECONNECT_MAX_MS,
    )
    reconnectAttempt.current++
    setTimeout(connect, delay)
  }, [connect])

  useEffect(() => {
    connect()
    return () => {
      cleanup()
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
    }
  }, [connect, cleanup])
}
