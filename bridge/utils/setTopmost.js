import { execFile } from 'child_process'

/**
 * Set or release always-on-top for Chrome windows via Win32 SetWindowPos.
 * When releasing (topmost=false), also minimizes Chrome so it's physically
 * out of the way for HeroZone automation.
 * When setting (topmost=true), restores and brings Chrome to foreground.
 */
export function setTopmostChrome(topmost) {
  const hwnd = topmost ? '-1' : '-2'  // HWND_TOPMOST / HWND_NOTOPMOST

  const script = topmost
    ? `
$ErrorActionPreference = 'SilentlyContinue'
try { [Win32Topmost] | Out-Null } catch {
  Add-Type @"
using System;
using System.Runtime.InteropServices;
public class Win32Topmost {
    [DllImport("user32.dll")]
    public static extern bool SetWindowPos(IntPtr hWnd, IntPtr hWndInsertAfter, int X, int Y, int cx, int cy, uint uFlags);
    [DllImport("user32.dll")]
    public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
    [DllImport("user32.dll")]
    public static extern bool SetForegroundWindow(IntPtr hWnd);
    [DllImport("user32.dll")]
    public static extern bool BringWindowToTop(IntPtr hWnd);
    [DllImport("user32.dll")]
    public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);
}
"@
}
$target = [IntPtr]::new(-1)
$flags = 0x0003
Get-Process chrome | Where-Object { $_.MainWindowHandle -ne 0 } | ForEach-Object {
    $h = $_.MainWindowHandle
    [Win32Topmost]::ShowWindow($h, 9)
    [Win32Topmost]::SetWindowPos($h, $target, 0, 0, 0, 0, $flags)
    [Win32Topmost]::keybd_event(0x12, 0, 0, [UIntPtr]::Zero)
    [Win32Topmost]::keybd_event(0x12, 0, 2, [UIntPtr]::Zero)
    [Win32Topmost]::BringWindowToTop($h)
    [Win32Topmost]::SetForegroundWindow($h)
}
`
    : `
$ErrorActionPreference = 'SilentlyContinue'
try { [Win32Topmost] | Out-Null } catch {
  Add-Type @"
using System;
using System.Runtime.InteropServices;
public class Win32Topmost {
    [DllImport("user32.dll")]
    public static extern bool SetWindowPos(IntPtr hWnd, IntPtr hWndInsertAfter, int X, int Y, int cx, int cy, uint uFlags);
    [DllImport("user32.dll")]
    public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
}
"@
}
$target = [IntPtr]::new(-2)
$flags = 0x0003
Get-Process chrome | Where-Object { $_.MainWindowHandle -ne 0 } | ForEach-Object {
    $h = $_.MainWindowHandle
    [Win32Topmost]::SetWindowPos($h, $target, 0, 0, 0, 0, $flags)
    [Win32Topmost]::ShowWindow($h, 6)
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
