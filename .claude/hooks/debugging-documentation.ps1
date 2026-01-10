# Debugging Documentation Hook (PowerShell)
# Triggers: Always when debugging issues occur
# Purpose: Systematic documentation of problem-solving processes

param(
    [string[]]$Args
)

# Hook metadata
Write-Host "=== Debugging Documentation Hook Triggered ===" -ForegroundColor Cyan
Write-Host "Timestamp: $(Get-Date -Format 'yyyy-MM-ddTHH:mm:sszzz')"
$sessionId = "{0}_{1}" -f (Get-Random), (Get-Date -UFormat %s)
Write-Host "Session ID: $sessionId"

# Create debugging log file if it doesn't exist
$debuggingLog = "debugging_log.jsonl"

if (-not (Test-Path $debuggingLog)) {
    Write-Host "Creating debugging log file: $debuggingLog" -ForegroundColor Green
    New-Item -ItemType File -Path $debuggingLog -Force | Out-Null
}

# Function to prompt for debugging documentation
function Invoke-DebuggingDocumentation {
    param(
        [string]$SessionId
    )
    
    $timestamp = Get-Date -Format 'yyyy-MM-ddTHH:mm:sszzz'
    
    Write-Host ""
    Write-Host "🐛 DEBUGGING DOCUMENTATION REQUIRED" -ForegroundColor Yellow
    Write-Host "==================================" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Please document your debugging process for knowledge base improvement."
    Write-Host "This helps create a comprehensive debugging reference for the Sensemaker codebase."
    Write-Host ""
    
    # Check if this is a common Sensemaker pattern
    Write-Host "Common Sensemaker debugging scenarios:" -ForegroundColor Blue
    Write-Host "  1. React/Electron integration issues"
    Write-Host "  2. Supabase authentication problems"
    Write-Host "  3. ReactFlow mind map rendering issues"
    Write-Host "  4. Real-time collaboration sync problems"
    Write-Host "  5. File save/load IPC communication issues"
    Write-Host "  6. Custom node component problems"
    Write-Host "  7. Tab state management issues"
    Write-Host "  8. Performance optimization challenges"
    Write-Host ""
    
    # Prompt for basic problem information
    Write-Host "Enter problem details:" -ForegroundColor Green
    Write-Host ""
    
    $problemTitle = Read-Host "Problem Title (brief description)"
    $problemDescription = Read-Host "Problem Description (detailed context)"
    $errorMessages = Read-Host "Error Messages (exact messages, comma-separated)"
    $problemContext = Read-Host "Context (where/when occurred)"
    $severity = Read-Host "Severity (low/medium/high/critical)"
    $solutionStatus = Read-Host "Solution Status (successful/failed/partial)"
    $solutionDescription = Read-Host "Solution Description"
    $codeChanges = Read-Host "Code Changes Made (files modified, comma-separated)"
    $timeInvested = Read-Host "Time Invested (minutes)"
    $initialHypothesis = Read-Host "Initial Hypothesis"
    $investigationSteps = Read-Host "Investigation Steps (comma-separated)"
    $whatWorked = Read-Host "What Worked"
    $whatDidntWork = Read-Host "What Didn't Work"
    $breakthroughMoment = Read-Host "Key Insight/Breakthrough"
    $tags = Read-Host "Tags (comma-separated, e.g., supabase, reactflow, electron)"
    $difficultyLevel = Read-Host "Difficulty Level (1-5)"
    $toolsUsed = Read-Host "Tools Used (comma-separated)"
    
    # Create JSON log entry
    $logEntry = @{
        timestamp = $timestamp
        session_id = $SessionId
        problem = @{
            title = $problemTitle
            description = $problemDescription
            error_messages = @($errorMessages -split ',')
            context = $problemContext
            severity = $severity
        }
        solution = @{
            status = $solutionStatus
            description = $solutionDescription
            code_changes = @($codeChanges -split ',')
            time_invested = $timeInvested
            approach = "systematic"
        }
        thinking_process = @{
            initial_hypothesis = $initialHypothesis
            investigation_steps = @($investigationSteps -split ',')
            dead_ends = @()
            breakthrough_moment = $breakthroughMoment
            alternative_approaches = @()
        }
        lessons_learned = @{
            what_worked = $whatWorked
            what_didnt_work = $whatDidntWork
            time_wasters = @()
            efficiency_tips = @()
            prevention = ""
        }
        tags = @($tags -split ',')
        difficulty_level = $difficultyLevel
        tools_used = @($toolsUsed -split ',')
    }
    
    # Convert to JSON and append to log file
    $jsonEntry = $logEntry | ConvertTo-Json -Compress -Depth 10
    Add-Content -Path $debuggingLog -Value $jsonEntry -Encoding UTF8
    
    Write-Host ""
    Write-Host "✅ Debugging documentation logged to $debuggingLog" -ForegroundColor Green
    $logCount = (Get-Content $debuggingLog | Measure-Object -Line).Lines
    Write-Host "📊 Total debugging sessions logged: $logCount" -ForegroundColor Blue
    Write-Host ""
    
    # Show recent patterns
    if (Test-Path $debuggingLog -and (Get-Item $debuggingLog).Length -gt 0) {
        Write-Host "Recent debugging patterns:" -ForegroundColor Blue
        Write-Host "=========================" -ForegroundColor Blue
        try {
            $recentEntries = Get-Content $debuggingLog -Tail 3 | ForEach-Object {
                $entry = $_ | ConvertFrom-Json
                "{0} ({1})" -f $entry.problem.title, $entry.solution.status
            }
            $recentEntries | ForEach-Object { Write-Host $_ }
        }
        catch {
            Write-Host "Recent entries available (install jq or use PowerShell for better analysis)"
        }
        Write-Host ""
    }
    
    # Suggest reviewing similar issues
    Write-Host "💡 TIP: Before next debugging session, check $debuggingLog for similar problems" -ForegroundColor Yellow
    Write-Host "💡 TIP: Use 'Select-String -Pattern \"keyword\" $debuggingLog' to find related issues" -ForegroundColor Yellow
    Write-Host ""
}

# Function to check for debugging context
function Test-DebuggingContext {
    param([string[]]$Arguments)
    
    # Check if we're in a debugging scenario
    $debugKeywords = @("error", "debug", "fix", "bug", "issue")
    foreach ($keyword in $debugKeywords) {
        if ($Arguments -join " " -like "*$keyword*") {
            return $true
        }
    }
    
    # Check recent git commits for debugging indicators
    try {
        $recentCommits = git log --oneline -5 2>$null
        if ($recentCommits) {
            $commitText = $recentCommits -join " "
            foreach ($keyword in @("fix", "bug", "debug", "error", "issue")) {
                if ($commitText -like "*$keyword*") {
                    return $true
                }
            }
        }
    }
    catch {
        # Git not available or not in a git repo
    }
    
    # Check for common debugging file patterns
    $debugFiles = Get-ChildItem -Path . -Recurse -Include "*.log", "debug*", "*error*" -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($debugFiles) {
        return $true
    }
    
    return $false
}

# Function to show debugging tips for Sensemaker
function Show-SensemakerDebuggingTips {
    Write-Host ""
    Write-Host "🔍 SENSEMAKER-SPECIFIC DEBUGGING TIPS" -ForegroundColor Cyan
    Write-Host "=====================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Common Issue Categories:" -ForegroundColor Blue
    Write-Host "  • Electron IPC: Check main.js and preload.js for communication issues"
    Write-Host "  • Supabase Auth: Verify redirect URLs and session handling"
    Write-Host "  • ReactFlow: Check node/edge state management and custom node rendering"
    Write-Host "  • Real-time Sync: Debug WebSocket connections and subscription cleanup"
    Write-Host "  • File Operations: Test .mmap file format and cross-platform compatibility"
    Write-Host "  • Tab Management: Verify tab-specific state isolation"
    Write-Host ""
    Write-Host "Quick Debugging Commands:" -ForegroundColor Blue
    Write-Host "  • Check Electron console: Ctrl+Shift+I in Electron app"
    Write-Host "  • Monitor Supabase: Check Supabase dashboard for auth/database errors"
    Write-Host "  • ReactFlow debug: Add console.logs to CustomNode component"
    Write-Host "  • Memory usage: Use built-in memory monitoring in app"
    Write-Host ""
    Write-Host "Debugging Log Analysis:" -ForegroundColor Blue
    Write-Host "  • View all logs: Get-Content debugging_log.jsonl | ConvertFrom-Json"
    Write-Host "  • Filter by tag: Select-String -Pattern 'supabase' debugging_log.jsonl"
    Write-Host "  • Count entries: (Get-Content debugging_log.jsonl | Measure-Object -Line).Lines"
    Write-Host ""
}

# Main execution
function Invoke-Main {
    param([string[]]$Arguments)
    
    # Always show debugging tips for context
    Show-SensemakerDebuggingTips
    
    # Check if we should prompt for documentation
    if (Test-DebuggingContext -Arguments $Arguments) {
        Write-Host "🚨 Debugging context detected. Documentation recommended." -ForegroundColor Red
        Write-Host ""
        $response = Read-Host "Document this debugging session? (y/N)"
        if ($response -eq 'y' -or $response -eq 'Y') {
            Invoke-DebuggingDocumentation -SessionId $sessionId
        }
        else {
            Write-Host "Skipped documentation. Remember to log manually if issue persists." -ForegroundColor Yellow
        }
    }
    else {
        Write-Host "ℹ️  No immediate debugging context detected." -ForegroundColor Blue
        Write-Host "💡 Use this hook manually when debugging: powershell .claude/hooks/debugging-documentation.ps1" -ForegroundColor Yellow
    }
    
    # Show existing log stats
    if (Test-Path $debuggingLog -and (Get-Item $debuggingLog).Length -gt 0) {
        Write-Host ""
        Write-Host "📈 DEBUGGING LOG STATISTICS" -ForegroundColor Magenta
        Write-Host "==========================" -ForegroundColor Magenta
        $logCount = (Get-Content $debuggingLog | Measure-Object -Line).Lines
        Write-Host "Total sessions: $logCount"
        
        try {
            $lastEntry = Get-Content $debuggingLog -Tail 1 | ConvertFrom-Json
            Write-Host "Recent activity: $($lastEntry.timestamp)"
        }
        catch {
            Write-Host "Recent activity: Unknown"
        }
        Write-Host ""
    }
}

# Run main function with all arguments
Invoke-Main -Arguments $Args

Write-Host "=== Debugging Documentation Hook Complete ===" -ForegroundColor Cyan