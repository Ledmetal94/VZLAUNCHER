import { sleep } from '../../utils/sleep.js'

/**
 * Wait action: delay for a specified number of seconds
 * Supports AbortSignal for cancellation
 * In dry-run mode, waits 1/10th the time
 */
export async function executeWait(step, context) {
  const { logger, dryRun, signal } = context
  const seconds = dryRun ? Math.max(0.1, step.seconds / 10) : step.seconds

  logger.info({ seconds, dryRun }, `Waiting ${seconds}s`)

  await sleep(seconds * 1000, signal)
}
