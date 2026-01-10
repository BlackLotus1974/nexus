# Nexus Docker & Supabase Setup Script for Windows
# Run as Administrator: Right-click PowerShell -> Run as Administrator

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Nexus Docker & Supabase Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "[ERROR] This script must be run as Administrator" -ForegroundColor Red
    Write-Host ""
    Write-Host "To run as Administrator:" -ForegroundColor Yellow
    Write-Host "1. Right-click on PowerShell" -ForegroundColor Yellow
    Write-Host "2. Select 'Run as Administrator'" -ForegroundColor Yellow
    Write-Host "3. Navigate to: cd C:\Users\eshay\nexus" -ForegroundColor Yellow
    Write-Host "4. Run: .\setup-windows.ps1" -ForegroundColor Yellow
    Write-Host ""
    exit 1
}

Write-Host "[OK] Running as Administrator" -ForegroundColor Green
Write-Host ""

# Step 1: Check if WSL is installed
Write-Host "Step 1: Checking WSL status..." -ForegroundColor Cyan
$wslStatus = wsl --status 2>&1

if ($LASTEXITCODE -ne 0) {
    Write-Host "[WARN] WSL is not installed" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Installing WSL 2..." -ForegroundColor Cyan

    try {
        wsl --install
        Write-Host "[OK] WSL installation initiated" -ForegroundColor Green
        Write-Host ""
        Write-Host "[IMPORTANT] You MUST restart your computer now!" -ForegroundColor Yellow
        Write-Host "After restart, run this script again to continue." -ForegroundColor Yellow
        Write-Host ""

        $restart = Read-Host "Restart now? (Y/N)"
        if ($restart -eq "Y" -or $restart -eq "y") {
            Restart-Computer
        }
        exit 0
    }
    catch {
        Write-Host "[ERROR] Failed to install WSL: $_" -ForegroundColor Red
        Write-Host ""
        Write-Host "Manual installation:" -ForegroundColor Yellow
        Write-Host "1. Run: wsl --install" -ForegroundColor Yellow
        Write-Host "2. Restart your computer" -ForegroundColor Yellow
        Write-Host "3. Run this script again" -ForegroundColor Yellow
        exit 1
    }
}
else {
    Write-Host "[OK] WSL is installed" -ForegroundColor Green
}

# Step 2: Check if Docker is installed
Write-Host ""
Write-Host "Step 2: Checking Docker installation..." -ForegroundColor Cyan

$dockerPath = Get-Command docker -ErrorAction SilentlyContinue

if (-not $dockerPath) {
    Write-Host "[WARN] Docker Desktop is not installed" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Please install Docker Desktop manually:" -ForegroundColor Yellow
    Write-Host "1. Download from: https://desktop.docker.com/win/main/amd/Docker%20Desktop%20Installer.exe" -ForegroundColor Yellow
    Write-Host "2. Run the installer" -ForegroundColor Yellow
    Write-Host "3. Select 'Use WSL 2 instead of Hyper-V' option" -ForegroundColor Yellow
    Write-Host "4. Complete installation and restart" -ForegroundColor Yellow
    Write-Host "5. Start Docker Desktop from Start Menu" -ForegroundColor Yellow
    Write-Host "6. Run this script again" -ForegroundColor Yellow
    Write-Host ""

    # Offer to open download page
    $openBrowser = Read-Host "Open download page in browser? (Y/N)"
    if ($openBrowser -eq "Y" -or $openBrowser -eq "y") {
        Start-Process "https://docs.docker.com/desktop/install/windows-install/"
    }

    exit 1
}
else {
    Write-Host "[OK] Docker Desktop is installed" -ForegroundColor Green
}

# Step 3: Check if Docker is running
Write-Host ""
Write-Host "Step 3: Checking if Docker is running..." -ForegroundColor Cyan

try {
    $dockerRunning = docker ps 2>&1

    if ($LASTEXITCODE -eq 0) {
        Write-Host "[OK] Docker is running" -ForegroundColor Green
    }
    else {
        throw "Docker is not running"
    }
}
catch {
    Write-Host "[WARN] Docker is not running" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Please start Docker Desktop:" -ForegroundColor Yellow
    Write-Host "1. Open Docker Desktop from Start Menu" -ForegroundColor Yellow
    Write-Host "2. Wait for the whale icon to stop animating" -ForegroundColor Yellow
    Write-Host "3. Run this script again" -ForegroundColor Yellow
    Write-Host ""
    exit 1
}

# Step 4: Start Supabase
Write-Host ""
Write-Host "Step 4: Starting Supabase..." -ForegroundColor Cyan
Write-Host "This may take several minutes on first run (downloading images)..." -ForegroundColor Yellow

Set-Location "C:\Users\eshay\nexus"

try {
    npx supabase start

    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "[OK] Supabase started successfully!" -ForegroundColor Green
    }
    else {
        throw "Supabase start failed"
    }
}
catch {
    Write-Host ""
    Write-Host "[ERROR] Failed to start Supabase: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Troubleshooting:" -ForegroundColor Yellow
    Write-Host "1. Make sure Docker Desktop is running" -ForegroundColor Yellow
    Write-Host "2. Check Docker has enough resources (Settings -> Resources)" -ForegroundColor Yellow
    Write-Host "3. Try: npx supabase stop && npx supabase start" -ForegroundColor Yellow
    exit 1
}

# Step 5: Apply migrations
Write-Host ""
Write-Host "Step 5: Applying database migrations..." -ForegroundColor Cyan

try {
    npx supabase db reset

    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "[OK] Database migrations applied successfully!" -ForegroundColor Green
    }
    else {
        throw "Migration failed"
    }
}
catch {
    Write-Host ""
    Write-Host "[ERROR] Failed to apply migrations: $_" -ForegroundColor Red
    exit 1
}

# Success!
Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "[SUCCESS] Setup Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Supabase is now running:" -ForegroundColor Cyan
Write-Host "  Studio:  http://localhost:54323" -ForegroundColor White
Write-Host "  API:     http://localhost:54321" -ForegroundColor White
Write-Host "  DB:      postgresql://postgres:postgres@localhost:54322/postgres" -ForegroundColor White
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Open Supabase Studio: http://localhost:54323" -ForegroundColor White
Write-Host "2. Verify tables exist (organizations, donors, etc.)" -ForegroundColor White
Write-Host "3. Your Next.js dev server is running on: http://localhost:3002" -ForegroundColor White
Write-Host "4. Begin Phase 2 implementation with subagents!" -ForegroundColor White
Write-Host ""
Write-Host "Useful commands:" -ForegroundColor Cyan
Write-Host "  npx supabase status  - Check Supabase status" -ForegroundColor White
Write-Host "  npx supabase stop    - Stop Supabase" -ForegroundColor White
Write-Host "  npm run dev          - Start Next.js (if not running)" -ForegroundColor White
Write-Host ""

# Ask if user wants to open Supabase Studio
$openStudio = Read-Host "Open Supabase Studio in browser? (Y/N)"
if ($openStudio -eq "Y" -or $openStudio -eq "y") {
    Start-Process "http://localhost:54323"
}

Write-Host ""
Write-Host "Setup complete!" -ForegroundColor Green
