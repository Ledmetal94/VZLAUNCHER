# automate.ps1
# Called by the bridge server to run UI automation for a game launch
# Usage: powershell -File automate.ps1 -StepsJson '<json>'

param (
  [string]$StepsJson
)

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

function Invoke-Step($step) {
  switch ($step.type) {
    "wait" {
      Start-Sleep -Milliseconds $step.ms
    }
    "click" {
      [System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point($step.x, $step.y)
      Start-Sleep -Milliseconds 100
      Add-Type -TypeDefinition @"
        using System;
        using System.Runtime.InteropServices;
        public class MouseClick {
          [DllImport("user32.dll")] public static extern void mouse_event(int dwFlags, int dx, int dy, int cButtons, int dwExtraInfo);
          public const int MOUSEEVENTF_LEFTDOWN = 0x02;
          public const int MOUSEEVENTF_LEFTUP = 0x04;
          public static void Click() {
            mouse_event(MOUSEEVENTF_LEFTDOWN, 0, 0, 0, 0);
            System.Threading.Thread.Sleep(50);
            mouse_event(MOUSEEVENTF_LEFTUP, 0, 0, 0, 0);
          }
        }
"@ -ErrorAction SilentlyContinue
      [MouseClick]::Click()
    }
    "key" {
      [System.Windows.Forms.SendKeys]::SendWait($step.key)
      Start-Sleep -Milliseconds 100
    }
    "focus_window" {
      $hwnd = (Get-Process | Where-Object { $_.MainWindowTitle -like "*$($step.title)*" } | Select-Object -First 1).MainWindowHandle
      if ($hwnd) {
        Add-Type -TypeDefinition @"
          using System;
          using System.Runtime.InteropServices;
          public class WinFocus {
            [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
          }
"@ -ErrorAction SilentlyContinue
        [WinFocus]::SetForegroundWindow($hwnd)
        Start-Sleep -Milliseconds 500
      }
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
