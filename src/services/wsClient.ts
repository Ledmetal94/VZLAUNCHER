const BRIDGE_URL = import.meta.env.VITE_BRIDGE_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:8000')
const WS_URL = BRIDGE_URL.replace(/^https/, 'wss').replace(/^http/, 'ws') + '/ws/status'

type WsMessage =
  | { type: 'heartbeat'; status: 'idle'; platforms: Record<string, string>; uptime_seconds: number }
  | {
      type: 'session_update'
      session_id: string
      game_id: string
      game_name: string
      status: string
      elapsed_seconds: number
      remaining_seconds: number
      players: number
      platform: string
    }
  | { type: 'step_progress'; step: number; total: number; label: string; status: string }
  | { type: 'session_error'; session_id: string; game_id: string; error: string; screenshot_path: string | null }

let ws: WebSocket | null = null
let reconnectTimer: ReturnType<typeof setTimeout> | null = null
let reconnectDelay = 1000
const MAX_RECONNECT_DELAY = 30000

type MessageHandler = (msg: WsMessage) => void
const handlers: Set<MessageHandler> = new Set()

export function onWsMessage(handler: MessageHandler): () => void {
  handlers.add(handler)
  return () => handlers.delete(handler)
}

function dispatch(msg: WsMessage) {
  for (const handler of handlers) {
    handler(msg)
  }
}

function scheduleReconnect() {
  if (reconnectTimer) return
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null
    connectWs()
  }, reconnectDelay)
  reconnectDelay = Math.min(reconnectDelay * 2, MAX_RECONNECT_DELAY)
}

export function connectWs() {
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
    return
  }

  try {
    ws = new WebSocket(WS_URL)
  } catch {
    scheduleReconnect()
    return
  }

  ws.onopen = () => {
    reconnectDelay = 1000 // reset backoff
  }

  ws.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data) as WsMessage
      dispatch(msg)
    } catch {
      // Ignore malformed messages
    }
  }

  ws.onclose = () => {
    ws = null
    scheduleReconnect()
  }

  ws.onerror = () => {
    // onclose will fire after this
  }
}

export function disconnectWs() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer)
    reconnectTimer = null
  }
  if (ws) {
    ws.close()
    ws = null
  }
}

export function isConnected(): boolean {
  return ws?.readyState === WebSocket.OPEN
}
