import { spawn } from 'child_process'

/**
 * Launch action: spawn a .exe process
 * - detached: true — game survives bridge restart
 * - 500ms post-spawn check that process didn't exit immediately
 */
export async function executeLaunch(step, context) {
  const { profile, processManager, logger, dryRun, signal } = context
  const exePath = dryRun ? 'notepad.exe' : profile.exePath
  const exeArgs = profile.exeArgs || []

  logger.info({ exePath, exeArgs, dryRun }, `Launching: ${exePath}`)

  const proc = spawn(exePath, exeArgs, {
    detached: true,
    stdio: 'ignore',
    windowsHide: false,
  })

  // Don't let the bridge hold a ref to the child
  proc.unref()

  // Register with process manager
  processManager.register(profile.game_id, proc, profile.platform)

  // 500ms post-spawn check
  await new Promise((resolve, reject) => {
    let exited = false

    proc.on('error', (err) => {
      exited = true
      reject(new Error(`Failed to spawn ${exePath}: ${err.message}`))
    })

    const earlyExit = (code) => {
      exited = true
      // Exit code 0 is normal for some Windows apps (they fork/re-exec themselves)
      if (code === 0) {
        logger.info({ exePath }, 'Process exited with code 0 (likely re-spawned itself)')
        resolve()
      } else {
        reject(new Error(`Process exited immediately with code ${code}`))
      }
    }
    proc.on('exit', earlyExit)

    const timer = setTimeout(() => {
      proc.removeListener('exit', earlyExit)
      if (!exited) resolve()
    }, 500)

    if (signal) {
      signal.addEventListener('abort', () => {
        clearTimeout(timer)
        reject(new Error('Launch aborted'))
      }, { once: true })
    }
  })

  logger.info({ pid: proc.pid }, 'Process spawned successfully')
}
