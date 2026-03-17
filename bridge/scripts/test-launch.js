#!/usr/bin/env node

/**
 * Manual test script for the automation engine
 * Usage: node scripts/test-launch.js <game-id> [--dry-run]
 *
 * Examples:
 *   node scripts/test-launch.js hz-dead-ahead --dry-run
 *   node scripts/test-launch.js dev-notepad
 */

import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import pino from 'pino'
import { runAutomation } from '../automation/engine.js'
import { createProcessManager } from '../automation/process-manager.js'
import { validateProfile } from '../utils/validation.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

const args = process.argv.slice(2)
const gameId = args.find(a => !a.startsWith('--'))
const dryRun = args.includes('--dry-run')

if (!gameId) {
  console.error('Usage: node scripts/test-launch.js <game-id> [--dry-run]')
  process.exit(1)
}

const logger = pino({
  level: 'info',
  transport: {
    target: 'pino-pretty',
    options: { colorize: true, translateTime: 'HH:MM:ss', ignore: 'pid,hostname' },
  },
})

// Load profiles from both config files
const configDir = resolve(__dirname, '../config')
let profiles = []
for (const file of ['games.json', 'games.dev.json']) {
  try {
    const data = JSON.parse(readFileSync(resolve(configDir, file), 'utf-8'))
    profiles.push(...data)
  } catch {}
}

const profile = profiles.find(p => p.game_id === gameId)
if (!profile) {
  console.error(`Game "${gameId}" not found. Available:`)
  for (const p of profiles) {
    console.error(`  ${p.game_id} — ${p.name}`)
  }
  process.exit(1)
}

// Validate
try {
  validateProfile(profile, logger)
} catch (err) {
  console.error(`Validation failed: ${err.message}`)
  process.exit(1)
}

const processManager = createProcessManager(logger)

console.log(`\n--- Launching: ${profile.name} (${profile.game_id}) ${dryRun ? '[DRY-RUN]' : ''} ---\n`)

const result = await runAutomation(profile, {
  processManager,
  logger,
  dryRun,
  onStep(i, total, step, status) {
    console.log(`  [${i + 1}/${total}] ${step.type} ${step.label || ''} → ${status}`)
  },
})

console.log(`\nResult:`, result)

if (!dryRun && result.success) {
  console.log('\nGame is running. Press Ctrl+C to kill.')
  process.on('SIGINT', async () => {
    console.log('\nKilling game process...')
    await processManager.killAll()
    process.exit(0)
  })
} else {
  process.exit(result.success ? 0 : 1)
}
