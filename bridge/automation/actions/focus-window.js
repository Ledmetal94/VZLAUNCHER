import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

/**
 * Focus window action: bring a window to foreground via PowerShell
 * Uses window title or process name
 */
export async function executeFocusWindow(step, context) {
  const { logger, dryRun, signal } = context
  const title = step.title || step.processName

  if (!title) {
    logger.warn('focus_window: no title or processName provided, skipping')
    return
  }

  if (dryRun) {
    logger.info({ title }, `[DRY-RUN] Would focus window: ${title}`)
    return
  }

  if (signal?.aborted) {
    throw new Error('Focus window aborted')
  }

  // Sanitize title: only allow alphanumeric, spaces, hyphens, underscores, dots
  const sanitized = title.replace(/[^a-zA-Z0-9 _\-\.]/g, '')
  if (sanitized !== title) {
    logger.warn({ original: title, sanitized }, 'Window title was sanitized for safety')
  }

  // PowerShell script to find and focus a window by title substring
  // The title is passed via -EncodedCommand to prevent injection
  const psScript = `
    Add-Type @"
    using System;
    using System.Runtime.InteropServices;
    public class Win32 {
      [DllImport("user32.dll")]
      public static extern bool SetForegroundWindow(IntPtr hWnd);
      [DllImport("user32.dll")]
      public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
    }
"@
    $searchTitle = '${sanitized}'
    $proc = Get-Process | Where-Object { $_.MainWindowTitle -like "*$searchTitle*" } | Select-Object -First 1
    if ($proc) {
      [Win32]::ShowWindow($proc.MainWindowHandle, 9)
      [Win32]::SetForegroundWindow($proc.MainWindowHandle)
      Write-Output "Focused: $($proc.MainWindowTitle)"
    } else {
      Write-Error "Window not found: $searchTitle"
      exit 1
    }
  `.trim()

  // Use -EncodedCommand to avoid shell metacharacter issues
  const encoded = Buffer.from(psScript, 'utf16le').toString('base64')

  try {
    const { stdout } = await execAsync(`powershell -NoProfile -EncodedCommand ${encoded}`, {
      timeout: 5000,
    })
    logger.info({ title, result: stdout.trim() }, 'Window focused')
  } catch (err) {
    logger.warn({ title, err: err.message }, 'Failed to focus window (may not be open yet)')
    // Don't throw — focus failure is non-fatal
  }
}
