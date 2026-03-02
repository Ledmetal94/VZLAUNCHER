import express from 'express'
import cors from 'cors'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'
import { prepareHerozone, startHerozone, openWaitingRoom } from './launchers/herozone.js'
import { launchVexplay } from './launchers/vexplay.js'
import { setTopmostChrome } from './utils/setTopmost.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const gamesConfig = JSON.parse(readFileSync(path.resolve(__dirname, './config/games.json'), 'utf-8'))

// Any herozone game config works for shared fields (exePath, windowTitle, windowWaitMs)
const herozoneBase = Object.values(gamesConfig).find(g => g.launcher === 'herozone')

const app = express()
const PORT = 3001

app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:4173'] }))
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
