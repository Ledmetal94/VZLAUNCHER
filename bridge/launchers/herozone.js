import { spawn } from 'child_process'
import { existsSync } from 'fs'
import { execSync } from 'child_process'
import { runAutomation, waitForWindow, sleep } from '../utils/automation.js'

// Fixed HeroZone UI coordinates (same for all games)
const HZ = {
  quickPlay:  { x: 965,  y: 610 },
  launchGame: { x: 1222, y: 827 },
  difficulty: {
    easy:      { x: 1089, y: 770 },
    normal:    { x: 1170, y: 771 },
    hard:      { x: 1248, y: 766 },
    nightmare: { x: 1331, y: 770 },
  },
}

function isHerozonRunning(windowTitle) {
  try {
    const out = execSync(
      `powershell -Command "Get-Process | Where-Object { $_.MainWindowTitle -like '*${windowTitle}*' } | Select-Object -First 1 -ExpandProperty Id"`,
      { timeout: 3000 }
    ).toString().trim()
    return !!out
  } catch {
    return false
  }
}

function openHerozone(exePath) {
  if (!existsSync(exePath)) {
    throw new Error(`Hero Launcher executable not found at: ${exePath}`)
  }
  console.log(`[HeroZone] Launching: ${exePath}`)
  const proc = spawn(exePath, [], { detached: true, stdio: 'ignore' })
  proc.unref()
  return proc.pid
}

// Phase 1: open Hero Launcher → Quick Play → game tile
// Players enter their names in the waiting room
export async function prepareHerozone(gameConfig) {
  const { exePath, windowTitle, windowWaitMs, tileX, tileY } = gameConfig

  let pid
  if (!isHerozonRunning(windowTitle)) {
    pid = openHerozone(exePath)
    console.log(`[HeroZone] Waiting for window...`)
    await waitForWindow(windowTitle, windowWaitMs)
  } else {
    console.log(`[HeroZone] Already running, reusing window.`)
  }

  console.log(`[HeroZone] Clicking Quick Play (waiting room)...`)
  // Chrome is already minimized + un-topmost by setTopmostChrome(false) in server.js
  await runAutomation([
    { type: 'minimize_window', title: 'chrome' },  // ensure Chrome is minimized (belt & suspenders)
    { type: 'wait', ms: 300 },
    { type: 'focus_window', title: windowTitle },
    { type: 'wait', ms: 2000 },
    { type: 'click', ...HZ.quickPlay },
    { type: 'wait', ms: 500 },
    { type: 'click', x: tileX, y: tileY },
    { type: 'wait', ms: 500 },
    // Chrome restore handled by setTopmostChrome(true) in server.js
  ])

  console.log(`[HeroZone] Prepare complete — waiting room open, game tile selected.`)
  return { pid }
}

// Phase 2: set difficulty (if not normal) → Launch Game
export async function startHerozone(difficulty = 'normal') {
  // Chrome is already minimized + un-topmost by setTopmostChrome(false) in server.js
  const steps = [
    { type: 'minimize_window', title: 'chrome' },  // ensure Chrome is minimized
    { type: 'wait', ms: 300 },
    { type: 'focus_window', title: 'Hero Launcher' },
    { type: 'wait', ms: 500 },
  ]

  if (difficulty !== 'normal') {
    const coords = HZ.difficulty[difficulty]
    if (!coords) throw new Error(`Unknown difficulty: ${difficulty}`)
    console.log(`[HeroZone] Setting difficulty: ${difficulty}`)
    steps.push({ type: 'click', ...coords })
    steps.push({ type: 'wait', ms: 300 })
  }

  steps.push({ type: 'click', ...HZ.launchGame })

  console.log(`[HeroZone] Launching game...`)
  await runAutomation(steps)
  console.log(`[HeroZone] Game launched.`)
}

// Open Hero Launcher → Quick Play only (waiting room, no game selected)
export async function openWaitingRoom(gameConfig) {
  const { exePath, windowTitle, windowWaitMs } = gameConfig

  let pid
  if (!isHerozonRunning(windowTitle)) {
    pid = openHerozone(exePath)
    await waitForWindow(windowTitle, windowWaitMs)
  } else {
    console.log(`[HeroZone] Already running, reusing window.`)
  }

  await runAutomation([
    { type: 'minimize_window', title: 'chrome' },
    { type: 'wait', ms: 300 },
    { type: 'focus_window', title: windowTitle },
    { type: 'wait', ms: 2000 },
    { type: 'click', ...HZ.quickPlay },
    { type: 'wait', ms: 500 },
    // Chrome restore handled by caller
  ])

  console.log(`[HeroZone] Waiting room open.`)
  return { pid }
}
