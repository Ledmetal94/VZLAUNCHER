import express from 'express'
import cors from 'cors'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { exec } from 'child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))

const app = express()
const PORT = 3001

app.use(cors())
app.use(express.json())

// Load game configs
const gamesPath = resolve(__dirname, 'config/games.json')
let games = []
try {
  games = JSON.parse(readFileSync(gamesPath, 'utf-8'))
  console.log(`Loaded ${games.length} game profiles`)
} catch (err) {
  console.error('Failed to load games.json:', err.message)
}

// Active session state
let activeSession = null
let sessionTimer = null

// GET /health
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    activeSession: activeSession
      ? { gameId: activeSession.gameId, elapsed: Math.floor((Date.now() - activeSession.startedAt) / 1000) }
      : null,
    platforms: {
      herozone: 'online',
      vex: 'online',
      spawnpoint: 'offline',
    },
    gamesLoaded: games.length,
  })
})

// GET /platforms
app.get('/platforms', (_req, res) => {
  res.json({
    herozone: 'online',
    vex: 'online',
    spawnpoint: 'offline',
  })
})

// POST /launch
app.post('/launch', (req, res) => {
  const { gameId, players } = req.body

  if (activeSession) {
    return res.status(409).json({ error: { code: 'SESSION_ACTIVE', message: 'A session is already running' } })
  }

  const game = games.find((g) => g.id === gameId)
  if (!game) {
    return res.status(404).json({ error: { code: 'GAME_NOT_FOUND', message: `Game ${gameId} not found` } })
  }

  if (players < game.minPlayers || players > game.maxPlayers) {
    return res.status(400).json({
      error: { code: 'INVALID_PLAYERS', message: `Players must be ${game.minPlayers}-${game.maxPlayers}` },
    })
  }

  console.log(`Launching ${game.name} for ${players} players...`)

  // Execute automation steps (simplified)
  for (const step of game.steps) {
    console.log(`  Step: ${step.action}`, step.target || step.label || `${step.seconds}s`)
  }

  activeSession = {
    id: crypto.randomUUID(),
    gameId: game.id,
    gameName: game.name,
    platform: game.platform,
    category: game.category,
    players,
    durationPlanned: game.durationMinutes * 60,
    startedAt: Date.now(),
  }

  // Auto-end session after planned duration
  sessionTimer = setTimeout(() => {
    console.log(`Session auto-ended: ${game.name}`)
    activeSession = null
    sessionTimer = null
  }, game.durationMinutes * 60 * 1000)

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

// POST /stop
app.post('/stop', (_req, res) => {
  if (!activeSession) {
    return res.status(404).json({ error: { code: 'NO_SESSION', message: 'No active session' } })
  }

  const elapsed = Math.floor((Date.now() - activeSession.startedAt) / 1000)
  const session = { ...activeSession, elapsed }

  if (sessionTimer) {
    clearTimeout(sessionTimer)
    sessionTimer = null
  }

  console.log(`Session stopped: ${activeSession.gameName} (${elapsed}s)`)
  activeSession = null

  res.json({ success: true, session })
})

// GET /session
app.get('/session', (_req, res) => {
  if (!activeSession) {
    return res.json({ status: 'idle' })
  }

  const elapsed = Math.floor((Date.now() - activeSession.startedAt) / 1000)
  res.json({
    status: 'running',
    ...activeSession,
    elapsed,
    remaining: Math.max(0, activeSession.durationPlanned - elapsed),
  })
})

app.listen(PORT, () => {
  console.log(`Bridge server running on http://localhost:${PORT}`)
})
