import { execSync } from 'child_process'
import { existsSync, mkdirSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SCREENSHOTS_DIR = resolve(__dirname, '..', 'logging', 'screenshots')

// Ensure directory exists
if (!existsSync(SCREENSHOTS_DIR)) {
  mkdirSync(SCREENSHOTS_DIR, { recursive: true })
}

/**
 * Capture a screenshot of the primary display using PowerShell.
 *
 * @param {string} label - Label for the screenshot filename
 * @returns {Promise<string>} Absolute file path of the saved screenshot
 */
export async function captureScreenshot(label = 'screenshot') {
  // Sanitize label
  const safeLabel = label.replace(/[^a-zA-Z0-9_-]/g, '_')
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const filename = `${safeLabel}_${timestamp}.png`
  const filepath = resolve(SCREENSHOTS_DIR, filename)

  const psScript = `
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
$screen = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
$bitmap = New-Object System.Drawing.Bitmap($screen.Width, $screen.Height)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.CopyFromScreen($screen.Location, [System.Drawing.Point]::Empty, $screen.Size)
$bitmap.Save('${filepath.replace(/\\/g, '\\\\')}', [System.Drawing.Imaging.ImageFormat]::Png)
$graphics.Dispose()
$bitmap.Dispose()
`.trim()

  try {
    execSync(`powershell -NoProfile -Command "${psScript.replace(/"/g, '\\"').replace(/\n/g, '; ')}"`, {
      timeout: 10000,
      windowsHide: true,
    })
    return filepath
  } catch (err) {
    throw new Error(`Screenshot capture failed: ${err.message}`)
  }
}

/**
 * Get the relative URL path for a screenshot file.
 */
export function screenshotUrl(filepath) {
  const filename = filepath.split(/[\\/]/).pop()
  return `/api/screenshots/${filename}`
}
