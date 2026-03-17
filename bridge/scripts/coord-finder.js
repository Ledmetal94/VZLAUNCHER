#!/usr/bin/env node

/**
 * Coordinate Finder — hover over UI elements and press Space to log positions.
 *
 * Usage:
 *   node scripts/coord-finder.js <game-id> <action-name>
 *   node scripts/coord-finder.js hz-dead-ahead launch
 *   node scripts/coord-finder.js hz-dead-ahead mode_arcade
 *   node scripts/coord-finder.js                              (no auto-save)
 *
 * Controls:
 *   Space  — capture current mouse position
 *   Q      — quit and save
 *
 * Saves to: bridge/games/<game-id>/clicks.json under actions.<action-name>
 */

import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs'
import { spawn } from 'child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PYTHON_DIR = resolve(__dirname, '..', 'automation', 'python')
const GAMES_DIR = resolve(__dirname, '..', 'games')

// Parse args
const args = process.argv.slice(2)
const gameId = args[0] && !args[0].startsWith('--') ? args[0] : null
const actionName = args[1] && !args[1].startsWith('--') ? args[1] : null

if (!gameId) {
  console.log(`
Usage:
  node scripts/coord-finder.js <game-id> <action-name>

Examples:
  node scripts/coord-finder.js hz-dead-ahead launch
  node scripts/coord-finder.js hz-dead-ahead mode_arcade
  node scripts/coord-finder.js hz-dead-ahead set_players
  node scripts/coord-finder.js hz-dead-ahead stop

The action name groups clicks together. Your game profile
references them by name in launch_sequence / stop_sequence:

  "launch_sequence": ["launch", "mode_arcade", "set_players"]
`)
  process.exit(1)
}

if (!actionName) {
  console.error('  Error: action name required (e.g. "launch", "mode_arcade", "stop")')
  process.exit(1)
}

// Ensure game directory exists
const gameDir = resolve(GAMES_DIR, gameId)
if (!existsSync(gameDir)) {
  mkdirSync(gameDir, { recursive: true })
}
const clicksPath = resolve(gameDir, 'clicks.json')

// Load existing clicks.json or create new
let clicksData = { game_id: gameId, resolution: '', actions: {} }
if (existsSync(clicksPath)) {
  try {
    clicksData = JSON.parse(readFileSync(clicksPath, 'utf-8'))
    if (!clicksData.actions) clicksData.actions = {}
  } catch { /* start fresh */ }
}

// Resolve Python
function resolvePython() {
  const venv = resolve(PYTHON_DIR, '.venv', 'Scripts', 'python.exe')
  if (existsSync(venv)) return venv
  return 'python'
}

// Load game name
let gameName = gameId
for (const file of ['games.json', 'games.dev.json']) {
  try {
    const profiles = JSON.parse(readFileSync(resolve(__dirname, '..', 'config', file), 'utf-8'))
    const match = profiles.find(g => g.game_id === gameId)
    if (match) { gameName = match.name; break }
  } catch { /* skip */ }
}

const existingActions = Object.keys(clicksData.actions)
const hasExisting = clicksData.actions[actionName]?.length > 0

const pythonScript = `
import pyautogui
import json
import sys
import time
import msvcrt

screen = pyautogui.size()
print("", flush=True)
print("  VZLAUNCHER Coordinate Finder", flush=True)
print("  ============================", flush=True)
print(f"  Game:   ${gameName} (${gameId})", flush=True)
print(f"  Action: ${actionName}", flush=True)
print(f"  Screen: {screen.width}x{screen.height}", flush=True)
${hasExisting ? `print("  NOTE:   Overwriting existing '${actionName}' (${clicksData.actions[actionName].length} steps)", flush=True)` : ''}
${existingActions.length > 0 ? `print("  Existing actions: ${existingActions.join(', ')}", flush=True)` : ''}
print("", flush=True)
print("  SPACE = capture click step", flush=True)
print("  T     = add type step (text input)", flush=True)
print("  H     = add hotkey step", flush=True)
print("  W     = add wait step", flush=True)
print("  Q     = quit and save", flush=True)
print("", flush=True)

steps = []

def prompt(msg):
    sys.stdout.write(msg)
    sys.stdout.flush()
    chars = []
    while True:
        c = msvcrt.getwch()
        if c == '\\r':
            print("", flush=True)
            return ''.join(chars)
        elif c == '\\x08':
            if chars:
                chars.pop()
                sys.stdout.write('\\b \\b')
                sys.stdout.flush()
        else:
            chars.append(c)
            sys.stdout.write(c)
            sys.stdout.flush()

try:
    while True:
        pos = pyautogui.position()
        sys.stdout.write(f"\\r  Mouse: ({pos.x}, {pos.y})     ")
        sys.stdout.flush()

        if msvcrt.kbhit():
            key = msvcrt.getch()

            if key == b' ':
                n = len(steps) + 1
                label = prompt(f"\\n  Label for click #{n} (or Enter for 'click_{n}'): ")
                if not label:
                    label = f"click_{n}"
                step = {
                    "type": "click",
                    "fallback_x": pos.x,
                    "fallback_y": pos.y,
                    "label": label
                }
                steps.append(step)
                print(f"  >>> Added: click ({pos.x}, {pos.y}) — {label}", flush=True)

            elif key in (b't', b'T'):
                text = prompt("\\n  Text to type: ")
                if text:
                    label = prompt("  Label (or Enter for auto): ")
                    step = {"type": "type", "text": text, "label": label or f"type_{len(steps)+1}"}
                    steps.append(step)
                    print(f"  >>> Added: type '{text}' — {step['label']}", flush=True)

            elif key in (b'h', b'H'):
                keys_str = prompt("\\n  Keys (comma-separated, e.g. ctrl,a): ")
                if keys_str:
                    keys = [k.strip() for k in keys_str.split(',')]
                    label = prompt("  Label (or Enter for auto): ")
                    step = {"type": "hotkey", "keys": keys, "label": label or f"hotkey_{len(steps)+1}"}
                    steps.append(step)
                    print(f"  >>> Added: hotkey {'+'.join(keys)} — {step['label']}", flush=True)

            elif key in (b'w', b'W'):
                secs = prompt("\\n  Wait seconds: ")
                try:
                    s = float(secs)
                    label = prompt("  Label (or Enter for auto): ")
                    step = {"type": "wait", "seconds": s, "label": label or f"wait_{len(steps)+1}"}
                    steps.append(step)
                    print(f"  >>> Added: wait {s}s — {step['label']}", flush=True)
                except ValueError:
                    print("  Invalid number, skipped", flush=True)

            elif key in (b'q', b'Q', b'\\x03'):
                break

        time.sleep(0.05)
except KeyboardInterrupt:
    pass

print("\\n", flush=True)
if steps:
    print(f"  === {len(steps)} steps captured for '{actionName}' ===", flush=True)
    for i, s in enumerate(steps):
        desc = s.get('label', s['type'])
        if s['type'] == 'click':
            desc += f" ({s['fallback_x']}, {s['fallback_y']})"
        elif s['type'] == 'type':
            desc += f" '{s['text']}'"
        elif s['type'] == 'hotkey':
            desc += f" {'+'.join(s['keys'])}"
        elif s['type'] == 'wait':
            desc += f" {s['seconds']}s"
        print(f"  {i+1}. [{s['type']}] {desc}", flush=True)
else:
    print("  No steps captured.", flush=True)

result = {
    "resolution": f"{screen.width}x{screen.height}",
    "steps": steps
}
print("\\n__RESULT__" + json.dumps(result), flush=True)
`

console.log('')
console.log('  Starting coordinate finder...')
console.log(`  Game: ${gameName} (${gameId})`)
console.log(`  Action: ${actionName}`)
console.log(`  Will save to: games/${gameId}/clicks.json`)
console.log('')

const python = resolvePython()
const proc = spawn(python, ['-u', '-c', pythonScript], {
  stdio: ['inherit', 'pipe', 'inherit'],
  cwd: PYTHON_DIR,
})

let output = ''
proc.stdout.on('data', (data) => {
  const text = data.toString()
  process.stdout.write(text)
  output += text
})

proc.on('close', () => {
  const match = output.match(/__RESULT__(.+)/)
  if (!match) return

  try {
    const result = JSON.parse(match[1])

    if (result.steps.length === 0) {
      console.log('\n  No steps captured — clicks.json not modified.')
      return
    }

    // Update clicks data
    clicksData.game_id = gameId
    clicksData.game_name = gameName
    clicksData.resolution = result.resolution
    clicksData.actions[actionName] = result.steps

    writeFileSync(clicksPath, JSON.stringify(clicksData, null, 2))
    console.log(`\n  Saved ${result.steps.length} steps to games/${gameId}/clicks.json → actions.${actionName}`)
    console.log(`  Total action groups: ${Object.keys(clicksData.actions).join(', ')}`)

    // Show how to use in profile
    console.log(`\n  To use in games.json:`)
    console.log(`    "launch_sequence": [${Object.keys(clicksData.actions).map(a => `"${a}"`).join(', ')}]`)
  } catch {
    // ignore
  }
})

proc.on('error', (err) => {
  console.error('  Failed to start Python:', err.message)
  console.error('  Run setup.bat first to install Python dependencies.')
  process.exit(1)
})
