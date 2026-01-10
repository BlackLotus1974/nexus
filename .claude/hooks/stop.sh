#!/bin/bash

# Bell sound hook - plays notification when Claude finishes
echo "🔔 Claude task completed - playing notification sound..."

# Check if we're on Windows and use PowerShell
if [[ "$OS" == "Windows_NT" ]] || [[ "$(uname -s 2>/dev/null)" == MINGW* ]] || [[ "$(uname -s 2>/dev/null)" == CYGWIN* ]] || [[ "$(uname -o 2>/dev/null)" == "Msys" ]]; then
    echo "🪟 Detected Windows environment"
    
    # Try PowerShell methods
    if powershell.exe -Command "[console]::beep(800,300)" 2>/dev/null; then
        echo "✅ PowerShell beep successful"
    elif powershell.exe -Command "Add-Type -AssemblyName System.Windows.Forms; [System.Media.SystemSounds]::Beep.Play()" 2>/dev/null; then
        echo "✅ PowerShell SystemSounds successful"
    elif cmd.exe /c "echo " 2>/dev/null; then
        echo "✅ CMD beep successful"
    else
        echo "❌ All Windows beep methods failed"
    fi
    
    # Windows visual notification
    powershell.exe -Command "
        try {
            Add-Type -AssemblyName System.Windows.Forms
            Add-Type -AssemblyName System.Drawing
            \$notify = New-Object System.Windows.Forms.NotifyIcon
            \$notify.Icon = [System.Drawing.SystemIcons]::Information
            \$notify.BalloonTipTitle = 'Claude Code'
            \$notify.BalloonTipText = 'Task completed! 🎉'
            \$notify.Visible = \$true
            \$notify.ShowBalloonTip(3000)
            Start-Sleep -Seconds 1
            \$notify.Dispose()
            Write-Host '✅ Windows notification successful'
        } catch {
            Write-Host '❌ Visual notification failed'
        }
    " 2>/dev/null

elif command -v afplay >/dev/null 2>&1; then
    echo "🍎 Detected macOS environment"
    # macOS
    if afplay /System/Library/Sounds/Glass.aiff 2>/dev/null || \
       afplay /System/Library/Sounds/Ping.aiff 2>/dev/null || \
       osascript -e "beep" 2>/dev/null; then
        echo "✅ macOS sound successful"
    fi
    
    # macOS notification
    osascript -e 'display notification "Task completed! 🎉" with title "Claude Code"' 2>/dev/null

elif command -v paplay >/dev/null 2>&1; then
    echo "🐧 Detected Linux with PulseAudio"
    # Linux with PulseAudio
    if paplay /usr/share/sounds/alsa/Front_Left.wav 2>/dev/null || \
       paplay /usr/share/sounds/freedesktop/stereo/bell.oga 2>/dev/null; then
        echo "✅ Linux sound successful"
    fi
    
    # Linux notification
    notify-send "Claude Code" "Task completed! 🎉" 2>/dev/null

else
    echo "🔄 Using fallback methods..."
    # Fallback - terminal bell
    printf "\a\a\a" 2>/dev/null || echo -ne "\007\007\007" 2>/dev/null
fi

echo "✨ Notification sequence completed"

# Always try terminal bell as final fallback
printf "\a"