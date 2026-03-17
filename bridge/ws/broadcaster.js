import { WebSocketServer } from 'ws'

/**
 * Creates a WebSocket broadcaster that pushes real-time updates to connected clients.
 *
 * Message types:
 * - heartbeat: sent every 5s when idle
 * - session_update: sent every 1s during active session
 * - step_progress: sent on each automation step change
 * - session_error: sent on error
 */
export function createBroadcaster(server, stateMachine, getSession, platforms, logger) {
  const wss = new WebSocketServer({ server, path: '/ws/status' })
  let heartbeatInterval = null
  let sessionInterval = null
  const startTime = Date.now()

  function broadcast(data) {
    const msg = JSON.stringify(data)
    for (const client of wss.clients) {
      if (client.readyState === 1) { // WebSocket.OPEN
        client.send(msg)
      }
    }
  }

  function getUptimeSeconds() {
    return Math.floor((Date.now() - startTime) / 1000)
  }

  function sendHeartbeat() {
    broadcast({
      type: 'heartbeat',
      status: 'idle',
      platforms,
      uptime_seconds: getUptimeSeconds(),
    })
  }

  function sendSessionUpdate() {
    const session = getSession()
    if (!session) return

    const elapsed = Math.floor((Date.now() - session.startedAt) / 1000)
    broadcast({
      type: 'session_update',
      session_id: session.id,
      game_id: session.gameId,
      game_name: session.gameName,
      status: stateMachine.state,
      elapsed_seconds: elapsed,
      remaining_seconds: Math.max(0, session.durationPlanned - elapsed),
      players: session.players,
      platform: session.platform,
    })
  }

  function start() {
    // Start heartbeat for idle state
    updateIntervals()

    wss.on('connection', (ws) => {
      logger.info({ clients: wss.clients.size }, 'WS client connected')

      // Send immediate state on connect
      const session = getSession()
      if (session) {
        sendSessionUpdate()
      } else {
        sendHeartbeat()
      }

      ws.on('close', () => {
        logger.debug({ clients: wss.clients.size }, 'WS client disconnected')
      })

      ws.on('error', (err) => {
        logger.warn({ err: err.message }, 'WS client error')
      })
    })
  }

  function updateIntervals() {
    clearInterval(heartbeatInterval)
    clearInterval(sessionInterval)
    heartbeatInterval = null
    sessionInterval = null

    const session = getSession()
    if (session) {
      // Active session: update every 1s
      sessionInterval = setInterval(sendSessionUpdate, 1000)
    } else {
      // Idle: heartbeat every 5s
      heartbeatInterval = setInterval(sendHeartbeat, 5000)
    }
  }

  function broadcastStep(step, total, label, status) {
    broadcast({
      type: 'step_progress',
      step,
      total,
      label,
      status,
    })
  }

  function broadcastError(sessionId, gameId, error, screenshotPath) {
    broadcast({
      type: 'session_error',
      session_id: sessionId,
      game_id: gameId,
      error,
      screenshot_path: screenshotPath || null,
    })
  }

  function onStateChange() {
    updateIntervals()
  }

  function stop() {
    clearInterval(heartbeatInterval)
    clearInterval(sessionInterval)
    wss.close()
  }

  return { start, stop, broadcast, broadcastStep, broadcastError, onStateChange, wss }
}
