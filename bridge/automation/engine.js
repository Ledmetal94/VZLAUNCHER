import { getAction, isPythonAction } from './actions/index.js'
import { createPythonRunner } from './actions/python-action.js'
import { captureScreenshot } from './screenshot.js'
import { loadGameActions, resolveSequence } from './action-resolver.js'

/**
 * Core sequential step runner
 *
 * @param {object} profile - Game profile with launch_sequence, stop_sequence
 * @param {object} opts
 * @param {AbortSignal} opts.signal - For cancellation via /api/stop
 * @param {function} opts.onStep - Callback: (stepIndex, totalSteps, step, status) => void
 * @param {object} opts.processManager
 * @param {object} opts.logger
 * @param {boolean} opts.dryRun
 * @param {object} opts.broadcaster - WebSocket broadcaster (optional)
 * @param {string|null} opts.pythonPath - Path to Python executable (null = Python unavailable)
 * @param {object} opts.vars - Variables for interpolation (e.g. { players: 4, mode: "arcade" })
 * @returns {{ success: boolean, stepsCompleted: number, totalSteps: number, error?: string, screenshot_path?: string }}
 */
export async function runAutomation(profile, opts) {
  const { signal, onStep, processManager, logger, dryRun, broadcaster, pythonPath, vars = {} } = opts

  // Resolve sequence: action group references → concrete steps
  const gameActions = loadGameActions(profile.game_id)
  const rawSequence = profile.launch_sequence || []
  const steps = resolveSequence(rawSequence, gameActions, vars, logger)
  const totalSteps = steps.length

  logger.info({ gameId: profile.game_id, totalSteps, dryRun }, 'Starting automation')

  const context = { profile, processManager, logger, dryRun, signal }

  // Check if any steps need Python
  const needsPython = steps.some((s) => isPythonAction(s.type))
  let pythonRunner = null

  if (needsPython && pythonPath && !dryRun) {
    pythonRunner = createPythonRunner(pythonPath, logger)
    try {
      pythonRunner.start()
      logger.info('Python runner started for sequence')
    } catch (err) {
      logger.warn({ err: err.message }, 'Failed to start Python runner — Python actions will fail')
      pythonRunner = null
    }
  }

  try {
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i]

      if (signal?.aborted) {
        logger.info({ step: i }, 'Automation aborted')
        return { success: false, stepsCompleted: i, totalSteps, error: 'Aborted' }
      }

      const isPy = isPythonAction(step.type)
      const action = isPy ? null : getAction(step.type)

      if (!isPy && !action) {
        logger.warn({ type: step.type, step: i, label: step.label }, `Unknown action type "${step.type}" — skipping`)
        onStep?.(i, totalSteps, step, 'skipped')
        broadcaster?.broadcastStep(i, totalSteps, step.label || step.type, 'skipped')
        continue
      }

      onStep?.(i, totalSteps, step, 'running')
      broadcaster?.broadcastStep(i, totalSteps, step.label || step.type, 'running')
      logger.info({ step: i, type: step.type, label: step.label }, `Step ${i + 1}/${totalSteps}: ${step.type}`)

      try {
        if (isPy) {
          if (dryRun) {
            logger.info({ step: i, type: step.type }, '[DRY RUN] Skipping Python action')
          } else if (!pythonRunner) {
            throw new Error(`Python runner unavailable for action "${step.type}"`)
          } else {
            const result = await pythonRunner.execute(step, signal)
            if (!result.success) {
              throw new Error(result.error || `Python action "${step.type}" failed`)
            }
            logger.info({ step: i, result }, 'Python action completed')
          }
        } else {
          await action(step, context)
        }
        onStep?.(i, totalSteps, step, 'done')
        broadcaster?.broadcastStep(i, totalSteps, step.label || step.type, 'done')
      } catch (err) {
        logger.error({ step: i, type: step.type, err: err.message }, `Step ${i + 1} failed`)
        onStep?.(i, totalSteps, step, 'error')
        broadcaster?.broadcastStep(i, totalSteps, step.label || step.type, 'error')

        // Capture error screenshot
        let screenshotPath = null
        try {
          screenshotPath = await captureScreenshot(`error_step${i}_${step.type}`)
          logger.info({ screenshotPath }, 'Error screenshot captured')
        } catch (ssErr) {
          logger.warn({ err: ssErr.message }, 'Failed to capture error screenshot')
        }

        const onError = step.onError || 'abort'
        if (onError === 'skip') {
          logger.info({ step: i }, 'onError=skip, continuing')
          continue
        }
        // Default: abort
        return { success: false, stepsCompleted: i, totalSteps, error: err.message, screenshot_path: screenshotPath }
      }
    }
  } finally {
    // Always clean up Python runner
    if (pythonRunner) {
      try {
        await pythonRunner.stop()
        logger.debug('Python runner stopped')
      } catch (err) {
        logger.warn({ err: err.message }, 'Error stopping Python runner')
      }
    }
  }

  logger.info({ gameId: profile.game_id, stepsCompleted: totalSteps }, 'Automation complete')
  return { success: true, stepsCompleted: totalSteps, totalSteps }
}

/**
 * Run stop sequence for a game
 */
export async function runStopSequence(profile, opts) {
  const { processManager, logger, dryRun } = opts

  // Resolve stop sequence (may contain action group references)
  const gameActions = loadGameActions(profile.game_id)
  const rawSequence = profile.stop_sequence || []
  const steps = resolveSequence(rawSequence, gameActions, {}, logger)

  if (steps.length === 0) {
    // No stop sequence — just kill the process
    await processManager.kill(profile.game_id)
    return
  }

  const context = { profile, processManager, logger, dryRun, signal: null }

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i]
    const action = getAction(step.type)
    if (!action) continue

    try {
      await action(step, context)
    } catch (err) {
      logger.warn({ step: i, type: step.type, err: err.message }, 'Stop sequence step failed')
    }
  }

  // Always kill the process after stop sequence
  await processManager.kill(profile.game_id)
}
