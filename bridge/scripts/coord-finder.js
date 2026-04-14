#!/usr/bin/env node

/**
 * Coordinate Finder — cattura click, hotkey, wait e screenshot di riferimento.
 *
 * Usage:
 *   node scripts/coord-finder.js <game-id> <action-name>
 *   node scripts/coord-finder.js hz-dead-ahead launch
 *   node scripts/coord-finder.js hz-dead-ahead mode_arcade
 *   node scripts/coord-finder.js hz-dead-ahead set_players
 *   node scripts/coord-finder.js hz-dead-ahead stop
 *
 * Tasti:
 *   SPACE = cattura click (coordinate correnti del mouse)
 *   I     = cattura screenshot regione → salva PNG per image matching
 *   V     = aggiungi step wait_for_image (usa ultimo screenshot catturato)
 *   T     = aggiungi step type (testo)
 *   H     = aggiungi step hotkey (es. ctrl+a)
 *   W     = aggiungi step wait (secondi)
 *   Q     = salva ed esci
 *
 * Salva in: bridge/games/<game-id>/clicks.json  (actions.<action-name>)
 * Immagini: bridge/games/<game-id>/screenshots/<label>.png
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

if (!gameId || !actionName) {
  console.log(`
  VZLAUNCHER Coordinate Finder
  ============================

  Usage:
    node scripts/coord-finder.js <game-id> <action-name>

  Esempi:
    node scripts/coord-finder.js hz-dead-ahead launch
    node scripts/coord-finder.js hz-dead-ahead mode_arcade
    node scripts/coord-finder.js hz-dead-ahead set_players
    node scripts/coord-finder.js hz-dead-ahead stop

  L'action name raggruppa i click. Il profilo li referenzia per nome:
    "launch_sequence": ["launch", "mode_arcade", "set_players"]

  Tasti durante la sessione:
    SPACE = click step (coordinate mouse)
    I     = cattura regione schermo come immagine di riferimento
    V     = wait_for_image step (attende che un elemento appaia sullo schermo)
    T     = type step (digita testo)
    H     = hotkey step (es. ctrl+alt+del)
    W     = wait step (pausa fissa in secondi)
    Q     = salva ed esci
`)
  process.exit(gameId ? 1 : 0)
}

// Ensure game directory + screenshots dir exist
const gameDir = resolve(GAMES_DIR, gameId)
const screenshotsDir = resolve(gameDir, 'screenshots')
mkdirSync(screenshotsDir, { recursive: true })

const clicksPath = resolve(gameDir, 'clicks.json')

// Load existing clicks.json or create new
let clicksData = { game_id: gameId, resolution: '', actions: {} }
if (existsSync(clicksPath)) {
  try {
    clicksData = JSON.parse(readFileSync(clicksPath, 'utf-8'))
    if (!clicksData.actions) clicksData.actions = {}
  } catch { /* start fresh */ }
}

// Resolve Python executable
function resolvePython() {
  const venv = resolve(PYTHON_DIR, '.venv', 'Scripts', 'python.exe')
  if (existsSync(venv)) return venv
  return 'python'
}

// Load game name from games.json
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
const screenshotsDirEscaped = screenshotsDir.replace(/\\/g, '\\\\')

const pythonScript = `
import pyautogui
import json
import sys
import time
import os
import msvcrt
try:
    from PIL import ImageGrab
    HAS_PIL = True
except ImportError:
    HAS_PIL = False

screen = pyautogui.size()
SCREENSHOTS_DIR = r"${screenshotsDirEscaped}"
os.makedirs(SCREENSHOTS_DIR, exist_ok=True)

print("", flush=True)
print("  VZLAUNCHER Coordinate Finder", flush=True)
print("  ============================", flush=True)
print(f"  Gioco:  ${gameName} (${gameId})", flush=True)
print(f"  Action: ${actionName}", flush=True)
print(f"  Schermo: {screen.width}x{screen.height}", flush=True)
${hasExisting ? `print("  NOTA: sovrascrive '${actionName}' esistente (${clicksData.actions[actionName].length} step)", flush=True)` : ''}
${existingActions.length > 0 ? `print("  Action esistenti: ${existingActions.join(', ')}", flush=True)` : ''}
print("", flush=True)
print("  SPACE = click step     I = cattura immagine     V = wait_for_image", flush=True)
print("  T     = type step      H = hotkey step          W = wait step", flush=True)
print("  Q     = salva ed esci", flush=True)
print("", flush=True)

steps = []
last_screenshot = None  # filename of last captured screenshot (for V)

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

def capture_region(label):
    """Cattura una regione rettangolare dello schermo con pyautogui.screenshot."""
    print(f"\\n  Cattura regione per '{label}'", flush=True)
    print("  Posiziona il mouse nell'angolo IN ALTO A SINISTRA e premi SPACE...", flush=True)

    # Wait for space
    while True:
        if msvcrt.kbhit():
            k = msvcrt.getch()
            if k == b' ':
                break
        pos = pyautogui.position()
        sys.stdout.write(f"\\r  Mouse: ({pos.x}, {pos.y})     ")
        sys.stdout.flush()
        time.sleep(0.05)

    tl = pyautogui.position()
    print(f"\\n  Angolo TL: ({tl.x}, {tl.y})", flush=True)
    print("  Ora posiziona in BASSO A DESTRA e premi SPACE...", flush=True)

    while True:
        if msvcrt.kbhit():
            k = msvcrt.getch()
            if k == b' ':
                break
        pos = pyautogui.position()
        sys.stdout.write(f"\\r  Mouse: ({pos.x}, {pos.y})     ")
        sys.stdout.flush()
        time.sleep(0.05)

    br = pyautogui.position()
    print(f"\\n  Angolo BR: ({br.x}, {br.y})", flush=True)

    x1, y1 = min(tl.x, br.x), min(tl.y, br.y)
    x2, y2 = max(tl.x, br.x), max(tl.y, br.y)

    if x2 - x1 < 10 or y2 - y1 < 10:
        print("  Regione troppo piccola — riprova", flush=True)
        return None

    filename = label + ".png"
    filepath = os.path.join(SCREENSHOTS_DIR, filename)

    screenshot = pyautogui.screenshot(region=(x1, y1, x2 - x1, y2 - y1))
    screenshot.save(filepath)
    print(f"  Salvata: screenshots/{filename}  ({x2-x1}x{y2-y1} px)", flush=True)
    return filename

try:
    while True:
        pos = pyautogui.position()
        sys.stdout.write(f"\\r  Mouse: ({pos.x}, {pos.y})     ")
        sys.stdout.flush()

        if msvcrt.kbhit():
            key = msvcrt.getch()

            # --- SPACE: click step ---
            if key == b' ':
                n = len(steps) + 1
                label = prompt(f"\\n  Label click #{n} (Invio = 'click_{n}'): ")
                if not label:
                    label = f"click_{n}"
                step = {
                    "type": "click",
                    "fallback_x": pos.x,
                    "fallback_y": pos.y,
                    "label": label
                }
                # If last screenshot exists, offer to use it
                if last_screenshot:
                    use_img = prompt(f"  Usa immagine '{last_screenshot}' per questo click? (s/N): ").strip().lower()
                    if use_img == 's':
                        step["image"] = last_screenshot
                        step["confidence"] = 0.8
                steps.append(step)
                img_note = f" + image:{last_screenshot}" if step.get("image") else ""
                print(f"  >>> Click ({pos.x}, {pos.y}) — {label}{img_note}", flush=True)

            # --- I: cattura immagine di riferimento ---
            elif key in (b'i', b'I'):
                n = len(steps) + 1
                label = prompt(f"\\n  Nome immagine (senza .png, es. 'play_button'): ").strip()
                if not label:
                    label = f"ref_{n}"
                filename = capture_region(label)
                if filename:
                    last_screenshot = filename
                    print(f"  Immagine pronta. Usa V per aggiungere wait_for_image, o SPACE per un click con questa immagine.", flush=True)

            # --- V: wait_for_image step ---
            elif key in (b'v', b'V'):
                if not last_screenshot:
                    print("\\n  Nessuna immagine catturata — premi I prima per catturare un riferimento", flush=True)
                else:
                    n = len(steps) + 1
                    label = prompt(f"\\n  Label wait_for_image #{n} (Invio = 'wait_{last_screenshot}'): ").strip()
                    if not label:
                        label = f"wait_{last_screenshot.replace('.png', '')}"
                    timeout_str = prompt("  Timeout in secondi (Invio = 10): ").strip()
                    try:
                        timeout = float(timeout_str) if timeout_str else 10.0
                    except ValueError:
                        timeout = 10.0
                    step = {
                        "type": "wait_for_image",
                        "image": last_screenshot,
                        "confidence": 0.8,
                        "timeout": timeout,
                        "label": label
                    }
                    steps.append(step)
                    print(f"  >>> wait_for_image '{last_screenshot}' (timeout {timeout}s) — {label}", flush=True)

            # --- T: type step ---
            elif key in (b't', b'T'):
                text = prompt("\\n  Testo da digitare: ")
                if text:
                    label = prompt("  Label (Invio = auto): ").strip()
                    step = {"type": "type", "text": text, "label": label or f"type_{len(steps)+1}"}
                    steps.append(step)
                    print(f"  >>> type '{text}' — {step['label']}", flush=True)

            # --- H: hotkey step ---
            elif key in (b'h', b'H'):
                keys_str = prompt("\\n  Tasti hotkey (virgola-separati, es. ctrl,alt,del): ")
                if keys_str:
                    keys = [k.strip() for k in keys_str.split(',')]
                    label = prompt("  Label (Invio = auto): ").strip()
                    step = {"type": "hotkey", "keys": keys, "label": label or f"hotkey_{len(steps)+1}"}
                    steps.append(step)
                    print(f"  >>> hotkey {'+'.join(keys)} — {step['label']}", flush=True)

            # --- W: wait step ---
            elif key in (b'w', b'W'):
                secs_str = prompt("\\n  Secondi di attesa: ").strip()
                try:
                    s = float(secs_str)
                    label = prompt("  Label (Invio = auto): ").strip()
                    step = {"type": "wait", "seconds": s, "label": label or f"wait_{len(steps)+1}"}
                    steps.append(step)
                    print(f"  >>> wait {s}s — {step['label']}", flush=True)
                except ValueError:
                    print("  Numero non valido — saltato", flush=True)

            # --- Q: quit ---
            elif key in (b'q', b'Q', b'\\x03'):
                break

        time.sleep(0.05)
except KeyboardInterrupt:
    pass

print("\\n", flush=True)
if steps:
    print(f"  === {len(steps)} step catturati per '{actionName}' ===", flush=True)
    for i, s in enumerate(steps):
        desc = s.get('label', s['type'])
        if s['type'] == 'click':
            img = f" [{s['image']}]" if s.get('image') else ""
            desc += f" ({s.get('fallback_x', '?')}, {s.get('fallback_y', '?')}){img}"
        elif s['type'] == 'wait_for_image':
            desc += f" [{s['image']}, timeout={s['timeout']}s]"
        elif s['type'] == 'type':
            desc += f" '{s['text']}'"
        elif s['type'] == 'hotkey':
            desc += f" {'+'.join(s['keys'])}"
        elif s['type'] == 'wait':
            desc += f" {s['seconds']}s"
        print(f"  {i+1}. [{s['type']}] {desc}", flush=True)
else:
    print("  Nessuno step catturato.", flush=True)

result = {
    "resolution": f"{screen.width}x{screen.height}",
    "steps": steps
}
print("\\n__RESULT__" + json.dumps(result), flush=True)
`

console.log('')
console.log('  Avvio coordinate finder...')
console.log(`  Gioco:  ${gameName} (${gameId})`)
console.log(`  Action: ${actionName}`)
console.log(`  Salva in: games/${gameId}/clicks.json → actions.${actionName}`)
console.log(`  Immagini: games/${gameId}/screenshots/`)
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
      console.log('\n  Nessuno step catturato — clicks.json non modificato.')
      return
    }

    // Update clicks data
    clicksData.game_id = gameId
    clicksData.game_name = gameName
    clicksData.resolution = result.resolution
    clicksData.actions[actionName] = result.steps

    writeFileSync(clicksPath, JSON.stringify(clicksData, null, 2))

    const allActions = Object.keys(clicksData.actions)
    console.log(`\n  Salvati ${result.steps.length} step → games/${gameId}/clicks.json → actions.${actionName}`)
    console.log(`  Action groups totali: ${allActions.join(', ')}`)
    console.log(`\n  In games.json usa:`)
    console.log(`    "launch_sequence": [${allActions.map(a => `"${a}"`).join(', ')}]`)

    // Check for image steps
    const imageSteps = result.steps.filter(s => s.image || s.type === 'wait_for_image')
    if (imageSteps.length > 0) {
      console.log(`\n  Immagini di riferimento usate:`)
      imageSteps.forEach(s => console.log(`    games/${gameId}/screenshots/${s.image}`))
    }
  } catch (e) {
    console.error('  Errore parsing risultato:', e.message)
  }
})

proc.on('error', (err) => {
  console.error('  Errore avvio Python:', err.message)
  console.error('  Esegui prima: cd bridge && python -m venv automation/python/.venv && automation/python/.venv/Scripts/pip install pyautogui opencv-python pillow pygetwindow')
  process.exit(1)
})
