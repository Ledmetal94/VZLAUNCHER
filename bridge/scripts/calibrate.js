#!/usr/bin/env node

/**
 * Calibration CLI for VZLAUNCHER automation profiles.
 *
 * Usage:
 *   node scripts/calibrate.js <game-id> --dry-run   Run all steps in logging-only mode
 *   node scripts/calibrate.js <game-id> --debug      Step-by-step execution with Enter to advance
 */

import { readFileSync, createReadStream } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createInterface } from 'readline'
import { createProcessManager } from '../automation/process-manager.js'
import { runAutomation } from '../automation/engine.js'
import { captureScreenshot } from '../automation/screenshot.js'
import { checkPythonHealth } from '../automation/actions/python-action.js'
import { validateProfile } from '../utils/validation.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Simple logger for CLI
const logger = {
  info: (obj, msg) => console.log(`[INFO] ${msg || ''}`, typeof obj === 'string' ? obj : JSON.stringify(obj)),
  warn: (obj, msg) => console.log(`[WARN] ${msg || ''}`, typeof obj === 'string' ? obj : JSON.stringify(obj)),
  error: (obj, msg) => console.log(`[ERROR] ${msg || ''}`, typeof obj === 'string' ? obj : JSON.stringify(obj)),
  debug: (obj, msg) => console.log(`[DEBUG] ${msg || ''}`, typeof obj === 'string' ? obj : ''),
}

// Parse args
const args = process.argv.slice(2)
const gameId = args.find(a => !a.startsWith('--'))
const isDryRun = args.includes('--dry-run')
const isDebug = args.includes('--debug')

if (!gameId || (!isDryRun && !isDebug)) {
  console.log(`
Usage:
  node scripts/calibrate.js <game-id> --dry-run   Log-only run (no actions executed)
  node scripts/calibrate.js <game-id> --debug      Step-by-step with Enter to advance

Examples:
  node scripts/calibrate.js dev-notepad --dry-run
  node scripts/calibrate.js hz-dead-ahead --debug
`)
  process.exit(1)
}

// Load profiles
function loadProfiles() {
  const profiles = []
  for (const file of ['games.json', 'games.dev.json']) {
    try {
      const data = JSON.parse(readFileSync(resolve(__dirname, '..', 'config', file), 'utf-8'))
      profiles.push(...data)
    } catch {
      // skip missing files
    }
  }
  return profiles
}

const profiles = loadProfiles()
const profile = profiles.find(p => p.game_id === gameId)

if (!profile) {
  console.error(`Game "${gameId}" not found. Available:`)
  for (const p of profiles) {
    console.log(`  ${p.game_id} — ${p.name} (${p.platform})`)
  }
  process.exit(1)
}

// Validate
try {
  validateProfile(profile, logger)
  console.log(`Profile "${profile.name}" (${profile.game_id}) is valid\n`)
} catch (err) {
  console.error(`Profile validation failed: ${err.message}`)
  process.exit(1)
}

const processManager = createProcessManager(logger)

// Readline for --debug mode
function waitForEnter(prompt) {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  return new Promise((resolve) => {
    rl.question(prompt, () => {
      rl.close()
      resolve()
    })
  })
}

async function runDryRun() {
  console.log(`=== DRY RUN: ${profile.name} ===\n`)

  const result = await runAutomation(profile, {
    signal: null,
    processManager,
    logger,
    dryRun: true,
    pythonPath: null,
    onStep(i, total, step, status) {
      const icon = status === 'done' ? 'OK' : status === 'skipped' ? 'SKIP' : status === 'error' ? 'FAIL' : '>>'
      console.log(`  [${icon}] Step ${i + 1}/${total}: ${step.type} ${step.label ? `(${step.label})` : ''}`)
    },
  })

  console.log(`\nResult: ${result.success ? 'SUCCESS' : 'FAILED'}`)
  console.log(`Steps completed: ${result.stepsCompleted}/${result.totalSteps}`)
  if (result.error) console.log(`Error: ${result.error}`)
}

async function runDebug() {
  console.log(`=== DEBUG MODE: ${profile.name} ===`)
  console.log(`Total steps: ${(profile.launch_sequence || []).length}\n`)

  // Check Python
  const pythonStatus = await checkPythonHealth(logger)
  console.log(`Python: ${pythonStatus.available ? 'available' : 'NOT available'}`)
  if (!pythonStatus.available) {
    console.log(`  (Python actions will fail — install deps per bridge/automation/python/setup.md)\n`)
  }

  const steps = profile.launch_sequence || []
  const abortController = new AbortController()

  // Handle Ctrl+C
  process.on('SIGINT', () => {
    console.log('\n\nAborted by user')
    abortController.abort()
    processManager.killAll().then(() => process.exit(0))
  })

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i]
    console.log(`\n--- Step ${i + 1}/${steps.length} ---`)
    console.log(`  Type:  ${step.type}`)
    console.log(`  Label: ${step.label || '(none)'}`)
    if (step.image) console.log(`  Image: ${step.image}`)
    if (step.fallback_x != null) console.log(`  Fallback: (${step.fallback_x}, ${step.fallback_y})`)
    if (step.seconds) console.log(`  Wait: ${step.seconds}s`)
    if (step.text) console.log(`  Text: ${step.text}`)
    if (step.keys) console.log(`  Keys: ${step.keys.join('+')}`)
    if (step.confidence) console.log(`  Confidence: ${step.confidence}`)

    await waitForEnter('\n  Press Enter to execute this step...')

    // Run the single step by creating a minimal profile
    const singleStepProfile = { ...profile, launch_sequence: [step] }
    const result = await runAutomation(singleStepProfile, {
      signal: abortController.signal,
      processManager,
      logger,
      dryRun: false,
      pythonPath: pythonStatus.available ? pythonStatus.path : null,
      onStep(_, __, s, status) {
        const icon = status === 'done' ? 'OK' : status === 'error' ? 'FAIL' : '>>'
        console.log(`  [${icon}] ${s.type}: ${status}`)
      },
    })

    if (result.error) {
      console.log(`  Error: ${result.error}`)
    }

    // Capture screenshot after each step
    try {
      const ssPath = await captureScreenshot(`debug_step${i}_${step.type}`)
      console.log(`  Screenshot: ${ssPath}`)
    } catch (err) {
      console.log(`  Screenshot failed: ${err.message}`)
    }
  }

  console.log('\n=== Debug complete ===')
  await processManager.killAll()
}

// Run
if (isDryRun) {
  runDryRun().then(() => process.exit(0)).catch((err) => {
    console.error(err)
    process.exit(1)
  })
} else {
  runDebug().then(() => process.exit(0)).catch((err) => {
    console.error(err)
    process.exit(1)
  })
}
