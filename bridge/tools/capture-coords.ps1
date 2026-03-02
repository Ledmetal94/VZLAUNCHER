Add-Type -AssemblyName System.Windows.Forms

Write-Host ""
Write-Host "=== Mouse Coordinate Capture ===" -ForegroundColor Cyan
Write-Host "Hover over a spot and press SPACE to capture coordinates." -ForegroundColor Yellow
Write-Host "Press ESC to quit." -ForegroundColor Yellow
Write-Host ""

$captured = @()

while ($true) {
    if ([System.Console]::KeyAvailable) {
        $key = [System.Console]::ReadKey($true)

        if ($key.Key -eq 'Spacebar') {
            $pos = [System.Windows.Forms.Cursor]::Position
            $label = Read-Host "  Label (e.g. 'terminator tile')"
            $captured += [PSCustomObject]@{ label = $label; x = $pos.X; y = $pos.Y }
            Write-Host "  Captured: $label -> x=$($pos.X), y=$($pos.Y)" -ForegroundColor Green
            Write-Host ""
        }

        if ($key.Key -eq 'Escape') {
            break
        }
    }
    Start-Sleep -Milliseconds 50
}

Write-Host ""
Write-Host "=== Results ===" -ForegroundColor Cyan
$captured | ForEach-Object {
    Write-Host "  $($_.label): x=$($_.x), y=$($_.y)"
}

Write-Host ""
Write-Host "JSON:" -ForegroundColor Cyan
$captured | ConvertTo-Json
