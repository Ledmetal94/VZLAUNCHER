import { readFileSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const GAMES_DIR = resolve(__dirname, '..', 'games')

/**
 * Load clicks.json for a game.
 * Returns { actions: { [name]: Step[] }, resolution, ... } or null.
 */
export function loadGameActions(gameId) {
  const clicksPath = resolve(GAMES_DIR, gameId, 'clicks.json')
  if (!existsSync(clicksPath)) return null

  try {
    return JSON.parse(readFileSync(clicksPath, 'utf-8'))
  } catch {
    return null
  }
}

/**
 * Resolve a launch_sequence that may contain action group references (strings)
 * or inline step objects.
 *
 * Profile launch_sequence can be:
 *   - ["launch", "mode_arcade", "set_players"]          ← action group names
 *   - [{ type: "launch" }, { type: "wait", seconds: 5 }] ← inline steps (legacy)
 *   - ["launch", { type: "wait", seconds: 2 }, "mode_arcade"] ← mixed
 *
 * Variables like ${players} in step fields are replaced with values from `vars`.
 */
export function resolveSequence(sequence, gameActions, vars = {}, logger = null) {
  if (!sequence || !Array.isArray(sequence)) return []

  const resolved = []

  for (const item of sequence) {
    if (typeof item === 'string') {
      // Action group reference
      if (!gameActions || !gameActions.actions || !gameActions.actions[item]) {
        if (logger) logger.warn({ action: item }, `Action group "${item}" not found in clicks.json — skipping`)
        continue
      }
      const groupSteps = gameActions.actions[item]
      for (const step of groupSteps) {
        resolved.push(interpolateStep(step, vars))
      }
    } else if (typeof item === 'object' && item !== null) {
      // Inline step
      resolved.push(interpolateStep(item, vars))
    }
  }

  return resolved
}

/**
 * Replace ${varName} placeholders in string values of a step.
 */
function interpolateStep(step, vars) {
  if (!vars || Object.keys(vars).length === 0) return step

  const interpolated = {}
  for (const [key, value] of Object.entries(step)) {
    if (typeof value === 'string') {
      interpolated[key] = value.replace(/\$\{(\w+)\}/g, (match, name) => {
        return vars[name] !== undefined ? String(vars[name]) : match
      })
    } else if (Array.isArray(value)) {
      interpolated[key] = value.map(v =>
        typeof v === 'string'
          ? v.replace(/\$\{(\w+)\}/g, (m, name) => vars[name] !== undefined ? String(vars[name]) : m)
          : v
      )
    } else {
      interpolated[key] = value
    }
  }
  return interpolated
}

/**
 * Get available action groups for a game (for the frontend to show options).
 * Returns array of { name, stepsCount } or empty array.
 */
export function getAvailableActions(gameId) {
  const data = loadGameActions(gameId)
  if (!data || !data.actions) return []

  return Object.entries(data.actions).map(([name, steps]) => ({
    name,
    stepsCount: steps.length,
    labels: steps.map(s => s.label).filter(Boolean),
  }))
}
