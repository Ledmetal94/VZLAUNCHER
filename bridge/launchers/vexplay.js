import { spawn } from 'child_process'
import { existsSync } from 'fs'
import { runAutomation, waitForWindow } from '../utils/automation.js'

export async function launchVexplay(gameConfig) {
  const { exePath, windowTitle, windowWaitMs, steps } = gameConfig

  if (!existsSync(exePath)) {
    throw new Error(`VEX Play executable not found at: ${exePath}`)
  }

  console.log(`[VEXPlay] Launching: ${exePath}`)
  const proc = spawn(exePath, [], { detached: true, stdio: 'ignore' })
  proc.unref()

  console.log(`[VEXPlay] Waiting ${windowWaitMs}ms for window: "${windowTitle}"`)
  await waitForWindow(windowTitle, windowWaitMs)

  console.log(`[VEXPlay] Running automation steps...`)
  await runAutomation(steps)

  console.log(`[VEXPlay] Launch complete.`)
  return { pid: proc.pid }
}
