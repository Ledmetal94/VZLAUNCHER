import { executeLaunch } from './launch.js'
import { executeWait } from './wait.js'
import { executeFocusWindow } from './focus-window.js'

/** Action registry: maps step type → handler function */
const actions = {
  launch: executeLaunch,
  wait: executeWait,
  focus_window: executeFocusWindow,
}

/** Python-backed actions — handled by persistent Python runner */
export const PYTHON_ACTIONS = new Set([
  'click', 'double_click', 'right_click', 'type', 'hotkey', 'scroll', 'wait_for_image', 'verify',
])

export function getAction(type) {
  return actions[type] || null
}

export function isPythonAction(type) {
  return PYTHON_ACTIONS.has(type)
}

export const SUPPORTED_ACTIONS = [...Object.keys(actions), ...PYTHON_ACTIONS]
