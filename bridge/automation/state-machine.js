/**
 * Session state machine
 * States: idle → launching → running → stopping → idle
 *                         ↘ error → idle (after reset)
 */

const VALID_TRANSITIONS = {
  idle:      { LAUNCH: 'launching' },
  launching: { AUTOMATION_COMPLETE: 'running', AUTOMATION_FAIL: 'error' },
  running:   { STOP: 'stopping', PROCESS_CRASH: 'error' },
  stopping:  { CLEANUP_DONE: 'idle' },
  error:     { RESET: 'idle' },
}

export function createStateMachine(logger) {
  let state = 'idle'

  return {
    get state() { return state },

    transition(event) {
      const transitions = VALID_TRANSITIONS[state]
      if (!transitions || !transitions[event]) {
        const msg = `Invalid transition: ${state} + ${event}`
        logger.warn({ state, event }, msg)
        return { ok: false, error: msg, state }
      }

      const from = state
      state = transitions[event]
      logger.info({ from, to: state, event }, `State: ${from} → ${state}`)
      return { ok: true, from, to: state }
    },

    canTransition(event) {
      const transitions = VALID_TRANSITIONS[state]
      return !!(transitions && transitions[event])
    },

    reset() {
      if (state === 'error') {
        return this.transition('RESET')
      }
      // Force reset (e.g., on server startup)
      const from = state
      state = 'idle'
      logger.info({ from, to: 'idle' }, `State force-reset: ${from} → idle`)
      return { ok: true, from, to: 'idle' }
    },
  }
}
