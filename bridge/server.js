import express from 'express'
import cors from 'cors'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'
import os from 'os'
import { execSync } from 'child_process'
import { prepareHerozone, startHerozone, openWaitingRoom } from './launchers/herozone.js'
import { launchVexplay } from './launchers/vexplay.js'
import { setTopmostChrome } from './utils/setTopmost.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// games.local.json overrides games.json — use it for machine-specific paths (git-ignored)
const localConfigPath = path.resolve(__dirname, './config/games.local.json')
const configPath = existsSync(localConfigPath) ? localConfigPath : path.resolve(__dirname, './config/games.json')
const gamesConfig = JSON.parse(readFileSync(configPath, 'utf-8'))
console.log(`[bridge] Using config: ${path.basename(configPath)}`)

// --- Session persistence setup ---
const DATA_DIR = path.resolve(__dirname, './data')
const SESSIONS_FILE = path.join(DATA_DIR, 'sessions.json')
if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true })
if (!existsSync(SESSIONS_FILE)) writeFileSync(SESSIONS_FILE, '[]', 'utf-8')

function readSessions() {
  try { return JSON.parse(readFileSync(SESSIONS_FILE, 'utf-8')) } catch { return [] }
}
function writeSessions(sessions) {
  writeFileSync(SESSIONS_FILE, JSON.stringify(sessions, null, 2), 'utf-8')
}

// Any herozone game config works for shared fields (exePath, windowTitle, windowWaitMs)
const herozoneBase = Object.values(gamesConfig).find(g => g.launcher === 'herozone')

const app = express()
const PORT = 3001

app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:4173',
    /^https:\/\/.*\.vercel\.app$/,
  ]
}))
app.use(express.json())

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', version: '1.0.0' })
})

// Phase 1 — Open Hero Launcher, click Quick Play, select game tile
// Players enter their names in the waiting room while operator sets difficulty
app.post('/prepare', async (req, res) => {
  const { gameSlug } = req.body

  if (!gameSlug) return res.status(400).json({ error: 'gameSlug is required' })

  const gameConfig = gamesConfig[gameSlug]
  if (!gameConfig) return res.status(404).json({ error: `No config found for: ${gameSlug}` })

  console.log(`\n[bridge] Prepare requested: ${gameSlug}`)

  // Release Chrome topmost so HeroZone can receive automation clicks
  await setTopmostChrome(false).catch(() => {})

  try {
    const result = await prepareHerozone(gameConfig)
    // Restore Chrome on top for the difficulty panel
    await setTopmostChrome(true).catch(() => {})
    res.json({ success: true, gameSlug, stage: 'prepared', ...result })
  } catch (err) {
    console.error(`[bridge] Prepare error:`, err.message)
    await setTopmostChrome(true).catch(() => {})
    res.status(500).json({ success: false, error: err.message })
  }
})

// Phase 2 — Set difficulty (if not normal) and click Launch Game
app.post('/start', async (req, res) => {
  const { difficulty = 'normal' } = req.body

  console.log(`\n[bridge] Start requested — difficulty: ${difficulty}`)

  // Release Chrome topmost so HeroZone difficulty buttons can be clicked
  await setTopmostChrome(false).catch(() => {})

  try {
    await startHerozone(difficulty)
    // Restore Chrome on top for the active session view
    await setTopmostChrome(true).catch(() => {})
    res.json({ success: true, stage: 'launched', difficulty })
  } catch (err) {
    console.error(`[bridge] Start error:`, err.message)
    await setTopmostChrome(true).catch(() => {})
    res.status(500).json({ success: false, error: err.message })
  }
})

// Open waiting room only (no game selected) — for the Waiting Room button in VZLAUNCHER
app.post('/waiting-room', async (req, res) => {
  console.log(`\n[bridge] Waiting room requested`)

  try {
    const result = await openWaitingRoom(herozoneBase)
    res.json({ success: true, stage: 'waiting-room', ...result })
  } catch (err) {
    console.error(`[bridge] Waiting room error:`, err.message)
    res.status(500).json({ success: false, error: err.message })
  }
})

// Pin/unpin VZLAUNCHER Chrome window on top of all other windows
app.post('/set-topmost', async (req, res) => {
  const { topmost = true } = req.body

  console.log(`\n[bridge] Set topmost: ${topmost}`)

  try {
    await setTopmostChrome(topmost)
    res.json({ success: true, topmost })
  } catch (err) {
    console.error(`[bridge] Set topmost error:`, err.message)
    res.status(500).json({ success: false, error: err.message })
  }
})

// Save a completed session to disk
app.post('/sessions', (req, res) => {
  const session = req.body
  if (!session || !session.id || !session.gameSlug) {
    return res.status(400).json({ error: 'Invalid session payload' })
  }
  const sessions = readSessions()
  const existing = sessions.findIndex((s) => s.id === session.id)
  if (existing >= 0) sessions[existing] = session
  else sessions.push(session)
  writeSessions(sessions)
  console.log(`[bridge] Session saved: ${session.id} (${session.gameName})`)
  res.json({ success: true, id: session.id })
})

// Get all sessions with optional filters: ?gameSlug=&operatorId=&from=&to=
app.get('/sessions', (req, res) => {
  let sessions = readSessions()
  const { gameSlug, operatorId, from, to } = req.query
  if (gameSlug) sessions = sessions.filter((s) => s.gameSlug === gameSlug)
  if (operatorId) sessions = sessions.filter((s) => s.operatorId === operatorId)
  if (from) sessions = sessions.filter((s) => s.startTime >= Number(from))
  if (to) sessions = sessions.filter((s) => s.startTime <= Number(to))
  res.json({ success: true, count: sessions.length, sessions })
})

// Aggregated KPI stats
app.get('/sessions/stats', (req, res) => {
  const sessions = readSessions().filter((s) => s.endTime)
  const total = sessions.length
  const totalRevenue = sessions.reduce((sum, s) => sum + (s.price || 0), 0)
  const totalDuration = sessions.reduce((sum, s) => sum + (s.duration || 0), 0)
  const avgDuration = total > 0 ? Math.round(totalDuration / total) : 0

  const byGame = {}
  const byOperator = {}
  for (const s of sessions) {
    if (!byGame[s.gameSlug]) byGame[s.gameSlug] = { gameName: s.gameName, count: 0, revenue: 0 }
    byGame[s.gameSlug].count++
    byGame[s.gameSlug].revenue += s.price || 0

    if (!byOperator[s.operatorId]) byOperator[s.operatorId] = { operatorName: s.operatorName, count: 0, revenue: 0 }
    byOperator[s.operatorId].count++
    byOperator[s.operatorId].revenue += s.price || 0
  }

  res.json({ success: true, stats: { total, totalRevenue, avgDuration, byGame, byOperator } })
})

// Bridge version + GitHub latest release check
app.get('/version', async (req, res) => {
  const { version: current } = JSON.parse(readFileSync(path.resolve(__dirname, './package.json'), 'utf-8'))
  try {
    const resp = await fetch('https://api.github.com/repos/vzitalia/vzlauncher/releases/latest', {
      headers: { 'User-Agent': 'vzlauncher-bridge' },
      signal: AbortSignal.timeout(5000),
    })
    const { tag_name } = await resp.json()
    const latest = tag_name?.replace(/^v/, '') ?? null
    res.json({ current, latest, updateAvailable: !!latest && latest !== current })
  } catch {
    res.json({ current, latest: null, updateAvailable: false })
  }
})

// Trigger bridge self-update from GitHub latest release
app.post('/update', async (req, res) => {
  const TMP = path.join(os.tmpdir(), 'vzlauncher-bridge-update.zip')
  const ROOT = path.resolve(__dirname, '..')
  const RELEASE_URL = 'https://github.com/vzitalia/vzlauncher/releases/latest/download/bridge.zip'

  try {
    console.log('[bridge] Downloading update...')
    execSync(`curl -L "${RELEASE_URL}" -o "${TMP}"`, { stdio: 'inherit' })

    console.log('[bridge] Extracting...')
    execSync(
      `tar -xf "${TMP}" -C "${ROOT}" --overwrite --exclude=bridge/config/games.json --exclude=bridge/config/games.local.json --exclude="bridge/data/*"`,
      { stdio: 'inherit' }
    )

    console.log('[bridge] Update complete. Restarting...')
    res.json({ success: true })
    setTimeout(() => process.exit(0), 500)
  } catch (err) {
    console.error('[bridge] Update failed:', err.message)
    res.status(500).json({ success: false, error: err.message })
  }
})

// List configured games
app.get('/games', (req, res) => {
  res.json(Object.keys(gamesConfig).map((slug) => ({
    slug,
    launcher: gamesConfig[slug].launcher,
    exePath: gamesConfig[slug].exePath,
  })))
})

app.listen(PORT, 'localhost', () => {
  console.log(`\n🎮 VZLAUNCHER Bridge Server running at http://localhost:${PORT}`)
  console.log(`   Configured games: ${Object.keys(gamesConfig).join(', ')}\n`)
})
