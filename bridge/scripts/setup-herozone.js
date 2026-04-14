#!/usr/bin/env node

/**
 * Setup guidato per catturare le immagini condivise di HeroZone.
 *
 * Usage:
 *   node scripts/setup-herozone.js
 *
 * Cattura le 5 immagini condivise che servono a TUTTI i giochi HeroZone,
 * poi guida nella cattura dei tile specifici per ogni gioco.
 *
 * Le immagini condivise vengono salvate in:
 *   games/_herozone/screenshots/
 *
 * Le immagini tile vengono salvate in:
 *   games/<game-id>/screenshots/
 */

import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { spawn } from 'child_process'
import { createInterface } from 'readline'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PYTHON_DIR = resolve(__dirname, '..', 'automation', 'python')
const GAMES_DIR = resolve(__dirname, '..', 'games')
const SHARED_DIR = resolve(GAMES_DIR, '_herozone', 'screenshots')

mkdirSync(SHARED_DIR, { recursive: true })

function resolvePython() {
  const venv = resolve(PYTHON_DIR, '.venv', 'Scripts', 'python.exe')
  if (existsSync(venv)) return venv
  return 'python'
}

function waitEnter(msg) {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout })
    rl.question(msg, (ans) => { rl.close(); resolve(ans.trim()) })
  })
}

function captureImage(outputPath, label, instructions) {
  return new Promise((resolve, reject) => {
    const outputDir = dirname(outputPath)
    const filename = outputPath.split(/[/\\]/).pop()

    const pythonScript = `
import pyautogui
import sys
import time
import os
import msvcrt

SCREENSHOTS_DIR = r"${outputDir.replace(/\\/g, '\\\\')}"
filename = r"${filename}"

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

print("", flush=True)
print(f"  Cattura: ${label}", flush=True)
print(f"  Salva in: {filename}", flush=True)
print("", flush=True)
print("  Posiziona il mouse nell'angolo IN ALTO A SINISTRA dell'elemento e premi SPACE...", flush=True)

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
print(f"\\n  TL: ({tl.x}, {tl.y})", flush=True)
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
print(f"\\n  BR: ({br.x}, {br.y})", flush=True)

x1, y1 = min(tl.x, br.x), min(tl.y, br.y)
x2, y2 = max(tl.x, br.x), max(tl.y, br.y)

if x2 - x1 < 5 or y2 - y1 < 5:
    print("  ERRORE: Regione troppo piccola", flush=True)
    print("__RESULT__" + '{"ok": false}', flush=True)
else:
    filepath = os.path.join(SCREENSHOTS_DIR, filename)
    screenshot = pyautogui.screenshot(region=(x1, y1, x2-x1, y2-y1))
    screenshot.save(filepath)
    print(f"  Salvata: {filename}  ({x2-x1}x{y2-y1}px)", flush=True)
    print("__RESULT__" + '{"ok": true}', flush=True)
`

    console.log(`\n  → ${instructions}`)

    const python = resolvePython()
    const proc = spawn(python, ['-u', '-c', pythonScript], {
      stdio: ['inherit', 'pipe', 'inherit'],
      cwd: PYTHON_DIR,
    })

    let output = ''
    proc.stdout.on('data', (d) => {
      const t = d.toString()
      process.stdout.write(t)
      output += t
    })

    proc.on('close', () => {
      const match = output.match(/__RESULT__(.+)/)
      if (match) {
        try {
          const r = JSON.parse(match[1])
          resolve(r.ok)
        } catch { resolve(false) }
      } else {
        resolve(false)
      }
    })

    proc.on('error', (err) => {
      console.error('  Python error:', err.message)
      reject(err)
    })
  })
}

const SHARED_IMAGES = [
  {
    file: 'arrow_back.png',
    label: 'Freccia < (torna alla griglia)',
    instructions: 'Seleziona il bottone < in alto a sinistra del launcher HeroZone',
  },
  {
    file: 'game_grid.png',
    label: 'Griglia giochi (area vuota)',
    instructions: 'Seleziona una piccola area della griglia dei giochi (sfondo, tra i tile) — deve essere unica alla schermata griglia',
  },
  {
    file: 'difficulty_normal.png',
    label: 'Tab difficoltà NORMAL',
    instructions: 'Seleziona il tab "NORMAL" nella schermata di dettaglio gioco',
  },
  {
    file: 'btn_launch_game.png',
    label: 'Bottone LAUNCH GAME',
    instructions: 'Seleziona il bottone blu "LAUNCH GAME" in basso nella schermata gioco',
  },
  {
    file: 'btn_quit.png',
    label: 'Bottone QUIT',
    instructions: 'Avvia un gioco (Quick Play), poi seleziona il bottone "QUIT" che appare',
  },
]

const HZ_GAMES = [
  'hz-dead-ahead', 'hz-arrowsong', 'hz-cookd-up',
  'hz-cops-vs-robbers', 'hz-cybershock', 'hz-plush-rush', 'hz-quantum-arena',
  'hz-wayfinders', 'hz-wizard-academy', 'hz-monkey-madness', 'hz-terminator-uprising',
]

async function main() {
  console.log('')
  console.log('  ╔══════════════════════════════════════════╗')
  console.log('  ║   VZLAUNCHER — Setup HeroZone           ║')
  console.log('  ╚══════════════════════════════════════════╝')
  console.log('')
  console.log('  Questo script cattura le immagini di riferimento necessarie')
  console.log('  per automatizzare i giochi HeroZone.')
  console.log('')
  console.log('  FASE 1: 5 immagini condivise (una volta sola)')
  console.log('  FASE 2: 1 tile per ogni gioco (12 catture)')
  console.log('')

  await waitEnter('  Premi INVIO quando HeroZone è aperto e visibile... ')

  // ─── FASE 1: Immagini condivise ───────────────────────────────────────────
  console.log('\n  ══ FASE 1: Immagini condivise ══\n')

  for (let i = 0; i < SHARED_IMAGES.length; i++) {
    const img = SHARED_IMAGES[i]
    const outPath = resolve(SHARED_DIR, img.file)

    if (existsSync(outPath)) {
      const skip = await waitEnter(`  [${i+1}/${SHARED_IMAGES.length}] ${img.label} — già esistente. Rieseguire? (s/N) `)
      if (skip !== 's') { console.log('  Saltato.'); continue }
    }

    console.log(`\n  [${i+1}/${SHARED_IMAGES.length}] ${img.label}`)

    // Special instruction for btn_quit
    if (img.file === 'btn_quit.png') {
      console.log('\n  ⚠  Per catturare il bottone QUIT:')
      console.log('     1. Avvia un gioco con Quick Play')
      console.log('     2. Quando vedi il bottone QUIT, torna qui e premi INVIO')
      await waitEnter('  Premi INVIO quando sei nella schermata con QUIT visibile... ')
    }

    const ok = await captureImage(outPath, img.label, img.instructions)
    if (!ok) {
      console.log(`  ⚠  Cattura fallita per ${img.file} — riprova dopo`)
    } else {
      console.log(`  ✓  ${img.file} salvata`)
    }
  }

  // ─── FASE 2: Tile per ogni gioco ─────────────────────────────────────────
  console.log('\n\n  ══ FASE 2: Tile specifici per gioco ══')
  console.log('  Vai alla griglia dei giochi in HeroZone.\n')

  await waitEnter('  Premi INVIO quando sei nella schermata GRIGLIA DEI GIOCHI... ')

  // Load game names
  let gameNames = {}
  try {
    const cfg = JSON.parse(readFileSync(resolve(__dirname, '..', 'config', 'games.json'), 'utf-8'))
    cfg.forEach(g => { gameNames[g.game_id] = g.name })
  } catch {}

  for (let i = 0; i < HZ_GAMES.length; i++) {
    const gameId = HZ_GAMES[i]
    const gameName = gameNames[gameId] || gameId
    const tileFile = `tile_${gameId.replace('hz-', '').replace(/-/g, '_')}.png`
    const gameScreenshotsDir = resolve(GAMES_DIR, gameId, 'screenshots')
    mkdirSync(gameScreenshotsDir, { recursive: true })
    const outPath = resolve(gameScreenshotsDir, tileFile)

    console.log(`\n  [${i+1}/${HZ_GAMES.length}] ${gameName}`)

    if (existsSync(outPath)) {
      const ans = await waitEnter(`  Tile già esistente. Rieseguire? (s/N) `)
      if (ans !== 's') { console.log('  Saltato.'); continue }
    }

    const ok = await captureImage(
      outPath,
      `Tile: ${gameName}`,
      `Seleziona il tile di "${gameName}" nella griglia (includi il titolo e l'immagine del gioco)`
    )

    if (ok) {
      console.log(`  ✓  ${tileFile} salvata → games/${gameId}/screenshots/`)
    } else {
      console.log(`  ⚠  Saltato ${gameId}`)
    }
  }

  // ─── Riepilogo ────────────────────────────────────────────────────────────
  console.log('\n\n  ══ Riepilogo ══\n')

  const sharedMissing = SHARED_IMAGES.filter(img => !existsSync(resolve(SHARED_DIR, img.file)))
  if (sharedMissing.length === 0) {
    console.log('  ✓ Tutte le immagini condivise presenti')
  } else {
    console.log(`  ⚠ Immagini condivise mancanti: ${sharedMissing.map(i => i.file).join(', ')}`)
  }

  const tileMissing = HZ_GAMES.filter(id => {
    const tileFile = `tile_${id.replace('hz-', '').replace(/-/g, '_')}.png`
    return !existsSync(resolve(GAMES_DIR, id, 'screenshots', tileFile))
  })
  if (tileMissing.length === 0) {
    console.log('  ✓ Tutti i tile dei giochi presenti')
  } else {
    console.log(`  ⚠ Tile mancanti (${tileMissing.length}): ${tileMissing.map(id => gameNames[id] || id).join(', ')}`)
  }

  console.log('\n  Per testare un gioco in dry-run:')
  console.log('    node scripts/calibrate.js hz-dead-ahead --dry-run')
  console.log('\n  Per testare realmente (con HeroZone aperto):')
  console.log('    node scripts/calibrate.js hz-dead-ahead --debug')
  console.log('')
}

main().catch(err => {
  console.error('\n  Errore:', err.message)
  process.exit(1)
})
