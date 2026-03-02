import { exec } from 'child_process'
import { promisify } from 'util'
import path from 'path'
import { fileURLToPath } from 'url'

const execAsync = promisify(exec)
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PS_SCRIPT = path.resolve(__dirname, '../automation/automate.ps1')

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function waitForWindow(windowTitle, timeoutMs) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    try {
      const { stdout } = await execAsync(
        `powershell -Command "Get-Process | Where-Object { $_.MainWindowTitle -like '*${windowTitle}*' } | Select-Object -First 1 -ExpandProperty Id"`
      )
      if (stdout.trim()) return true
    } catch {}
    await sleep(500)
  }
  // Window not found within timeout — proceed anyway (launcher may still be loading)
  console.warn(`[automation] Window "${windowTitle}" not detected within ${timeoutMs}ms, proceeding...`)
  return false
}

export async function runAutomation(steps) {
  const stepsJson = JSON.stringify(steps).replace(/"/g, '\\"')
  const cmd = `powershell -ExecutionPolicy Bypass -File "${PS_SCRIPT}" -StepsJson "${stepsJson}"`
  try {
    const { stdout, stderr } = await execAsync(cmd, { timeout: 30000 })
    if (stderr) console.warn('[automation] stderr:', stderr)
    return stdout.trim()
  } catch (err) {
    throw new Error(`Automation failed: ${err.message}`)
  }
}
