import express from 'express'
import cors from 'cors'
import { createServer } from 'http'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { logger, sessionLogger } from './logging/logger.js'
import { createStateMachine } from './automation/state-machine.js'
import { createProcessManager } from './automation/process-manager.js'
import { runAutomation, runStopSequence } from './automation/engine.js'
import { validateAllProfiles } from './utils/validation.js'
import { createBroadcaster } from './ws/broadcaster.js'
import { checkPythonHealth } from './automation/actions/python-action.js'
import { captureScreenshot, screenshotUrl } from './automation/screenshot.js'
import { getAvailableActions } from './automation/action-resolver.js'
import { readdirSync } from 'fs'

const __dirname = dirname(fileURLToPath(import.meta.url))

const app = express()
const PORT = process.env.BRIDGE_PORT || 8000
const DRY_RUN = process.env.BRIDGE_DRY_RUN === 'true'

app.use(cors())
app.use(express.json())

// Serve error screenshots as static files
app.use('/api/screenshots', express.static(resolve(__dirname, 'logging', 'screenshots')))

// Serve game assets (posters, reference screenshots)
app.use('/api/games/assets', express.static(resolve(__dirname, 'games')))

// --- Load game profiles ---
const configFile = DRY_RUN ? 'games.dev.json' : 'games.json'
const gamesPath = resolve(__dirname, 'config', configFile)
let games = []
try {
  games = JSON.parse(readFileSync(gamesPath, 'utf-8'))
  logger.info({ file: configFile, count: games.length }, `Loaded ${games.length} game profiles`)
} catch (err) {
  logger.error({ file: configFile, err: err.message }, 'Failed to load game profiles')
}

// Also load dev profiles if not already using them
if (!DRY_RUN) {
  try {
    const devGames = JSON.parse(readFileSync(resolve(__dirname, 'config/games.dev.json'), 'utf-8'))
    games.push(...devGames)
    logger.info({ count: devGames.length }, `Also loaded ${devGames.length} dev profiles`)
  } catch {
    // No dev profiles — that's fine
  }
}

// Validate all profiles at startup
validateAllProfiles(games, logger)

// --- Core state ---
const stateMachine = createStateMachine(logger)
const processManager = createProcessManager(logger)

let activeSession = null
let sessionTimer = null
let abortController = null
let stopInProgress = false

// --- Python health check ---
let pythonStatus = { available: false, path: null }

checkPythonHealth(logger).then((status) => {
  pythonStatus = status
})

// --- Platform status ---
const platforms = {
  herozone: 'online',
  vex: 'online',
  spawnpoint: 'offline',
}

// --- HTTP + WebSocket server ---
const server = createServer(app)
const broadcaster = createBroadcaster(
  server,
  stateMachine,
  () => activeSession,
  platforms,
  logger,
)
broadcaster.start()

// Handle process crashes
processManager.onCrash((gameId, code, signal) => {
  logger.error({ gameId, code, signal }, 'Game process crashed')
  if (stateMachine.state === 'running') {
    stateMachine.transition('PROCESS_CRASH')
    broadcaster.onStateChange()
    if (activeSession) {
      broadcaster.broadcastError(activeSession.id, gameId, `Process crashed (code ${code})`, null)
    }
  }
})

// --- Helpers ---
function findPosterUrl(gameId) {
  const gameDir = resolve(__dirname, 'games', gameId)
  try {
    const files = readdirSync(gameDir)
    const poster = files.find(f => /^poster\.(png|jpg|jpeg|webp)$/i.test(f))
    if (poster) return `/api/games/assets/${gameId}/${poster}`
  } catch { /* folder doesn't exist */ }
  return `/api/games/assets/${gameId}/poster.png`
}

// --- API Routes ---

// GET /api/health
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    state: stateMachine.state,
    dryRun: DRY_RUN,
    pythonAvailable: pythonStatus.available,
    activeSession: activeSession
      ? { gameId: activeSession.gameId, elapsed: Math.floor((Date.now() - activeSession.startedAt) / 1000) }
      : null,
    platforms,
    gamesLoaded: games.length,
  })
})

// GET /api/games — game catalog with poster URLs
app.get('/api/games', (_req, res) => {
  const catalog = games.map((g) => ({
    id: g.game_id,
    name: g.name,
    platform: g.platform,
    category: g.category,
    minPlayers: g.minPlayers,
    maxPlayers: g.maxPlayers,
    durationMinutes: g.durationMinutes,
    tokenCost: g.tokenCost,
    description: g.description,
    badge: g.badge || null,
    posterUrl: findPosterUrl(g.game_id),
    actions: getAvailableActions(g.game_id),
    enabled: true,
  }))
  res.json(catalog)
})

// GET /api/platforms
app.get('/api/platforms', (_req, res) => {
  res.json(platforms)
})

// POST /api/launch
app.post('/api/launch', (req, res) => {
  const { gameId, players, options = {} } = req.body

  // State machine guard
  if (!stateMachine.canTransition('LAUNCH')) {
    return res.status(409).json({
      error: { code: 'INVALID_STATE', message: `Cannot launch in state "${stateMachine.state}"` },
    })
  }

  if (!gameId || typeof gameId !== 'string') {
    return res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'gameId is required' } })
  }

  if (typeof players !== 'number' || !Number.isInteger(players) || players < 1) {
    return res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'players must be a positive integer' } })
  }

  const game = games.find((g) => g.game_id === gameId)
  if (!game) {
    return res.status(404).json({ error: { code: 'GAME_NOT_FOUND', message: `Game ${gameId} not found` } })
  }

  if (players < game.minPlayers || players > game.maxPlayers) {
    return res.status(400).json({
      error: { code: 'INVALID_PLAYERS', message: `Players must be ${game.minPlayers}-${game.maxPlayers}` },
    })
  }

  // Transition to launching
  const transition = stateMachine.transition('LAUNCH')
  if (!transition.ok) {
    return res.status(409).json({ error: { code: 'STATE_ERROR', message: transition.error } })
  }

  const sessionId = crypto.randomUUID()
  const sLogger = sessionLogger(sessionId, gameId)

  activeSession = {
    id: sessionId,
    gameId: game.game_id,
    gameName: game.name,
    platform: game.platform,
    category: game.category,
    players,
    durationPlanned: game.durationMinutes * 60,
    startedAt: Date.now(),
    automationProgress: { step: 0, total: (game.launch_sequence || []).length, status: 'starting' },
  }

  broadcaster.onStateChange()

  // Fire-and-forget: run automation async
  abortController = new AbortController()

  // Build variables for interpolation
  const vars = { players, ...options }

  runAutomation(game, {
    signal: abortController.signal,
    processManager,
    logger: sLogger,
    dryRun: DRY_RUN,
    broadcaster,
    pythonPath: pythonStatus.available ? pythonStatus.path : null,
    vars,
    onStep(i, total, step, status) {
      if (activeSession) {
        activeSession.automationProgress = { step: i, total, label: step.label, status }
      }
    },
  }).then((result) => {
    if (result.success) {
      stateMachine.transition('AUTOMATION_COMPLETE')
      broadcaster.onStateChange()
      sLogger.info('Automation complete — session running')

      // Auto-end session after planned duration
      sessionTimer = setTimeout(() => {
        sLogger.info('Session auto-ended (duration expired)')
        handleStopSession(sLogger, game)
      }, game.durationMinutes * 60 * 1000)
    } else {
      stateMachine.transition('AUTOMATION_FAIL')
      broadcaster.onStateChange()
      sLogger.error({ result }, 'Automation failed')
      if (activeSession) {
        activeSession.error = result.error
        broadcaster.broadcastError(activeSession.id, game.game_id, result.error, result.screenshot_path)
      }
    }
  }).catch((err) => {
    stateMachine.transition('AUTOMATION_FAIL')
    broadcaster.onStateChange()
    sLogger.error({ err: err.message }, 'Automation threw')
    if (activeSession) {
      activeSession.error = err.message
      broadcaster.broadcastError(activeSession.id, game.game_id, err.message, null)
    }
  })

  // Respond immediately
  res.json({
    success: true,
    session: {
      id: activeSession.id,
      gameId: activeSession.gameId,
      gameName: activeSession.gameName,
      players: activeSession.players,
      durationPlanned: activeSession.durationPlanned,
    },
  })
})

// POST /api/stop
app.post('/api/stop', async (_req, res) => {
  if (stopInProgress) {
    return res.status(409).json({
      error: { code: 'STOP_IN_PROGRESS', message: 'Stop already in progress' },
    })
  }

  if (!stateMachine.canTransition('STOP') && stateMachine.state !== 'launching' && stateMachine.state !== 'error') {
    return res.status(409).json({
      error: { code: 'INVALID_STATE', message: `Cannot stop in state "${stateMachine.state}"` },
    })
  }

  if (!activeSession) {
    return res.status(404).json({ error: { code: 'NO_SESSION', message: 'No active session' } })
  }

  const elapsed = Math.floor((Date.now() - activeSession.startedAt) / 1000)
  const session = { ...activeSession, elapsed }
  const game = games.find(g => g.game_id === activeSession.gameId)

  await handleStopSession(logger, game)

  res.json({ success: true, session })
})

async function handleStopSession(sLogger, game) {
  if (stopInProgress) return
  stopInProgress = true

  try {
    // Abort any running automation
    if (abortController) {
      abortController.abort()
      abortController = null
    }

    // Clear auto-end timer
    if (sessionTimer) {
      clearTimeout(sessionTimer)
      sessionTimer = null
    }

    // Transition based on current state
    if (stateMachine.state === 'error') {
      stateMachine.reset()
    } else if (stateMachine.canTransition('STOP')) {
      stateMachine.transition('STOP')
    }

    // Run stop sequence if we have one
    if (game && activeSession) {
      try {
        await runStopSequence(game, { processManager, logger: sLogger, dryRun: DRY_RUN })
      } catch (err) {
        sLogger.error({ err: err.message }, 'Stop sequence error')
      }
    }

    // Kill any remaining processes
    await processManager.killAll()

    sLogger.info('Session stopped')
    activeSession = null

    // Complete stop transition
    if (stateMachine.state === 'stopping') {
      stateMachine.transition('CLEANUP_DONE')
    }

    broadcaster.onStateChange()
  } finally {
    stopInProgress = false
  }
}

// GET /api/session
app.get('/api/session', (_req, res) => {
  if (!activeSession) {
    return res.json({ status: 'idle', state: stateMachine.state })
  }

  const elapsed = Math.floor((Date.now() - activeSession.startedAt) / 1000)
  res.json({
    status: stateMachine.state === 'running' ? 'running' : stateMachine.state,
    state: stateMachine.state,
    ...activeSession,
    elapsed,
    remaining: Math.max(0, activeSession.durationPlanned - elapsed),
  })
})

// POST /api/screenshot — capture desktop screenshot on demand
app.post('/api/screenshot', async (_req, res) => {
  try {
    const filepath = await captureScreenshot('manual')
    res.json({ success: true, path: filepath, url: screenshotUrl(filepath) })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// POST /api/restart-platform — kill + optionally relaunch platform processes
app.post('/api/restart-platform', async (req, res) => {
  const { platform } = req.body

  if (!platform || !platforms[platform]) {
    return res.status(400).json({ error: { code: 'INVALID_PLATFORM', message: `Unknown platform: ${platform}` } })
  }

  // Find all process names for this platform
  const platformGames = games.filter(g => g.platform === platform)
  const processNames = [...new Set(platformGames.map(g => g.processName).filter(Boolean))]

  if (processNames.length === 0) {
    return res.json({ success: true, platform, action: 'no_processes_found' })
  }

  const results = []
  for (const processName of processNames) {
    try {
      const { execSync } = await import('child_process')
      execSync(`taskkill /F /IM "${processName}.exe"`, { windowsHide: true, timeout: 5000 })
      results.push({ processName, killed: true })
    } catch {
      results.push({ processName, killed: false, reason: 'not_running_or_failed' })
    }
  }

  // If there's an active session for this platform, clean it up
  if (activeSession && activeSession.platform === platform) {
    const game = games.find(g => g.game_id === activeSession.gameId)
    await handleStopSession(logger, game)
  }

  res.json({ success: true, platform, action: 'killed', results })
})

// --- Graceful shutdown ---
function shutdown(signal) {
  logger.info({ signal }, 'Shutting down bridge server')
  broadcaster.stop()
  processManager.killAll().then(() => {
    process.exit(0)
  })
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))

// --- Start server ---
server.listen(PORT, () => {
  logger.info({ port: PORT, dryRun: DRY_RUN }, `Bridge server running on http://localhost:${PORT}`)
})
