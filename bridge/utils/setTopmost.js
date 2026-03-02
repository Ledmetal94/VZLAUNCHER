import { execFile } from 'child_process'

/**
 * Set or release always-on-top for Chrome windows via Win32 SetWindowPos.
 * HWND_TOPMOST = -1, HWND_NOTOPMOST = -2
 */
export function setTopmostChrome(topmost) {
  const hwnd = topmost ? '-1' : '-2'

  const script = `
$ErrorActionPreference = 'SilentlyContinue'
try { [Win32Topmost] | Out-Null } catch {
  Add-Type @"
using System;
using System.Runtime.InteropServices;
public class Win32Topmost {
    [DllImport("user32.dll")]
    public static extern bool SetWindowPos(IntPtr hWnd, IntPtr hWndInsertAfter, int X, int Y, int cx, int cy, uint uFlags);
}
"@
}
$target = [IntPtr]::new(${hwnd})
$flags = 0x0003
Get-Process chrome | Where-Object { $_.MainWindowHandle -ne 0 } | ForEach-Object {
    [Win32Topmost]::SetWindowPos($_.MainWindowHandle, $target, 0, 0, 0, 0, $flags)
}
`

  return new Promise((resolve, reject) => {
    execFile(
      'powershell',
      ['-NoProfile', '-NonInteractive', '-Command', script],
      { timeout: 5000 },
      (err) => {
        if (err) reject(err)
        else resolve()
      }
    )
  })
}
