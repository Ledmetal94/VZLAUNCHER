# automate.ps1
# Called by the bridge server to run UI automation for a game launch
# Usage: powershell -File automate.ps1 -StepsJson '<json>'

param (
  [string]$StepsJson
)

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

# Single Add-Type block with all Win32 helpers to avoid redefinition errors
Add-Type -TypeDefinition @"
  using System;
  using System.Runtime.InteropServices;
  public class WinAuto {
    [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
    [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);
    [DllImport("kernel32.dll")] public static extern uint GetCurrentThreadId();
    [DllImport("user32.dll")] public static extern bool AttachThreadInput(uint idAttach, uint idAttachTo, bool fAttach);
    [DllImport("user32.dll")] public static extern bool BringWindowToTop(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);
    [DllImport("user32.dll")] public static extern void mouse_event(int dwFlags, int dx, int dy, int cButtons, int dwExtraInfo);

    public const int SW_MINIMIZE = 6;
    public const int SW_RESTORE = 9;
    public const int MOUSEEVENTF_LEFTDOWN = 0x02;
    public const int MOUSEEVENTF_LEFTUP = 0x04;
    public const byte VK_MENU = 0x12;
    public const uint KEYEVENTF_KEYUP = 0x0002;

    // Force a window to foreground using AttachThreadInput trick
    public static bool ForceForeground(IntPtr targetHwnd) {
      IntPtr foreHwnd = GetForegroundWindow();
      if (foreHwnd == targetHwnd) return true;

      uint pid = 0;
      uint currentThread = GetCurrentThreadId();
      uint foreThread = GetWindowThreadProcessId(foreHwnd, out pid);
      uint targetThread = GetWindowThreadProcessId(targetHwnd, out pid);

      // Attach to foreground thread to gain focus-change permission
      if (foreThread != currentThread)
        AttachThreadInput(currentThread, foreThread, true);
      if (targetThread != currentThread)
        AttachThreadInput(currentThread, targetThread, true);

      // Simulate Alt key press — Windows allows SetForegroundWindow after keyboard input
      keybd_event(VK_MENU, 0, 0, UIntPtr.Zero);
      keybd_event(VK_MENU, 0, KEYEVENTF_KEYUP, UIntPtr.Zero);

      ShowWindow(targetHwnd, SW_RESTORE);
      BringWindowToTop(targetHwnd);
      bool result = SetForegroundWindow(targetHwnd);

      // Detach threads
      if (foreThread != currentThread)
        AttachThreadInput(currentThread, foreThread, false);
      if (targetThread != currentThread)
        AttachThreadInput(currentThread, targetThread, false);

      return result;
    }

    public static void Click() {
      mouse_event(MOUSEEVENTF_LEFTDOWN, 0, 0, 0, 0);
      System.Threading.Thread.Sleep(50);
      mouse_event(MOUSEEVENTF_LEFTUP, 0, 0, 0, 0);
    }
  }
"@ -ErrorAction SilentlyContinue

function Invoke-Step($step) {
  switch ($step.type) {
    "wait" {
      Start-Sleep -Milliseconds $step.ms
    }
    "click" {
      [System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point($step.x, $step.y)
      Start-Sleep -Milliseconds 100
      [WinAuto]::Click()
    }
    "key" {
      [System.Windows.Forms.SendKeys]::SendWait($step.key)
      Start-Sleep -Milliseconds 100
    }
    "focus_window" {
      $proc = Get-Process | Where-Object { $_.MainWindowTitle -like "*$($step.title)*" -and $_.MainWindowHandle -ne 0 } | Select-Object -First 1
      if ($proc) {
        [WinAuto]::ForceForeground([IntPtr]$proc.MainWindowHandle)
        Start-Sleep -Milliseconds 500
      }
    }
    "minimize_window" {
      Get-Process | Where-Object {
        ($_.MainWindowTitle -like "*$($step.title)*" -or $_.ProcessName -like "*$($step.title)*") -and $_.MainWindowHandle -ne 0
      } | ForEach-Object {
        [WinAuto]::ShowWindow([IntPtr]$_.MainWindowHandle, [WinAuto]::SW_MINIMIZE)
      }
      Start-Sleep -Milliseconds 400
    }
    "restore_window" {
      Get-Process | Where-Object {
        ($_.MainWindowTitle -like "*$($step.title)*" -or $_.ProcessName -like "*$($step.title)*") -and $_.MainWindowHandle -ne 0
      } | ForEach-Object {
        [WinAuto]::ForceForeground([IntPtr]$_.MainWindowHandle)
      }
      Start-Sleep -Milliseconds 400
    }
  }
}

try {
  $steps = $StepsJson | ConvertFrom-Json
  foreach ($step in $steps) {
    Invoke-Step $step
  }
  Write-Output "SUCCESS"
  exit 0
} catch {
  Write-Error "AUTOMATION_ERROR: $_"
  exit 1
}
