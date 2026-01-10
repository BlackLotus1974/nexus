# Simple PowerShell Bell Hook for Claude Code
Write-Host "Claude task completed - playing notification..." -ForegroundColor Green

# Method 1: Try system beep with multiple tones
try {
    [Console]::Beep(800, 200)
    [Console]::Beep(1000, 200)
    [Console]::Beep(800, 200)
    Write-Host "System beep played successfully!" -ForegroundColor Green
    exit 0
} catch {
    Write-Host "System beep failed, trying alternatives..." -ForegroundColor Yellow
}

# Method 2: Try Windows notification sound
try {
    Add-Type -AssemblyName System.Media
    $sound = New-Object System.Media.SoundPlayer("C:\Windows\Media\Windows Notify.wav")
    $sound.PlaySync()
    Write-Host "Windows sound played successfully!" -ForegroundColor Green
    exit 0
} catch {
    Write-Host "Windows sound failed, trying more alternatives..." -ForegroundColor Yellow
}

# Method 3: Try system sounds API
try {
    Add-Type -AssemblyName System.Windows.Forms
    [System.Media.SystemSounds]::Asterisk.Play()
    Write-Host "System sound API worked!" -ForegroundColor Green
    exit 0
} catch {
    Write-Host "System sound API failed..." -ForegroundColor Yellow
}

# Method 4: Visual notification as fallback
try {
    Add-Type -AssemblyName System.Windows.Forms
    $notify = New-Object System.Windows.Forms.NotifyIcon
    $notify.Icon = [System.Drawing.SystemIcons]::Information
    $notify.Visible = $true
    $notify.ShowBalloonTip(2000, "Claude Code", "Task completed!", [System.Windows.Forms.ToolTipIcon]::Info)
    Start-Sleep -Seconds 3
    $notify.Dispose()
    Write-Host "Visual notification shown!" -ForegroundColor Green
} catch {
    Write-Host "Visual notification failed too..." -ForegroundColor Red
}

# Final fallback: bell characters
Write-Host "`a`a`a" -NoNewline
Write-Host "Bell characters sent as final fallback" -ForegroundColor Cyan