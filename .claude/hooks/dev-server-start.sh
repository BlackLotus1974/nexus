#!/bin/bash
# Development Server Auto-Start Hook for Student Dome
# Automatically starts the Vite dev server when a Claude session begins
# Runs in background to provide immediate development feedback

# Enable strict error handling
set -euo pipefail

# Configuration
LOG_FILE=".claude/logs/dev-server.log"
PID_FILE=".claude/logs/dev-server.pid"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

# Create log file if it doesn't exist
mkdir -p "$(dirname "$LOG_FILE")"
touch "$LOG_FILE"

# Function to log messages
log() {
    echo "[$TIMESTAMP] $1" >> "$LOG_FILE"
    echo "$1"
}

# Function to check if dev server is already running
is_dev_server_running() {
    if [[ -f "$PID_FILE" ]]; then
        local pid
        pid=$(cat "$PID_FILE")
        if ps -p "$pid" > /dev/null 2>&1; then
            # Check if it's actually our Vite process
            if ps -p "$pid" -o command= | grep -q "vite"; then
                return 0
            fi
        fi
        # Clean up stale PID file
        rm -f "$PID_FILE"
    fi
    
    # Also check for any running Vite processes on common ports
    if lsof -ti:5173 > /dev/null 2>&1 || lsof -ti:3000 > /dev/null 2>&1; then
        return 0
    fi
    
    return 1
}

# Function to start dev server
start_dev_server() {
    log "DEV SERVER: Starting Vite development server..."
    
    # Start the server in background and capture PID
    nohup npm run dev > ".claude/logs/dev-server-output.log" 2>&1 &
    local pid=$!
    
    # Save PID for later management
    echo "$pid" > "$PID_FILE"
    
    log "DEV SERVER: Started with PID $pid"
    
    # Wait a moment and check if it started successfully
    sleep 3
    
    if ps -p "$pid" > /dev/null 2>&1; then
        log "DEV SERVER: ✅ Successfully started and running"
        echo "🚀 Development server started! Check http://localhost:5173"
        
        # Try to detect the actual port from the output
        sleep 2
        if [[ -f ".claude/logs/dev-server-output.log" ]]; then
            local port_info
            port_info=$(grep -o "localhost:[0-9]*" ".claude/logs/dev-server-output.log" | head -1 || echo "")
            if [[ -n "$port_info" ]]; then
                echo "   Available at: http://$port_info"
                log "DEV SERVER: Available at http://$port_info"
            fi
        fi
    else
        log "DEV SERVER: ❌ Failed to start - check .claude/logs/dev-server-output.log"
        rm -f "$PID_FILE"
        echo "⚠️  Failed to start development server. Check .claude/logs/dev-server-output.log for details."
    fi
}

log "DEV SERVER: Session start hook triggered"

# Check if package.json exists (we're in the right directory)
if [[ ! -f "package.json" ]]; then
    log "DEV SERVER: No package.json found, skipping dev server start"
    exit 0
fi

# Check if this is a Node.js project with Vite
if ! grep -q '"dev".*"vite"' package.json; then
    log "DEV SERVER: No Vite dev script found, skipping"
    exit 0
fi

# Check if dev server is already running
if is_dev_server_running; then
    log "DEV SERVER: Already running, skipping start"
    echo "ℹ️  Development server is already running"
    exit 0
fi

# Check if node_modules exists
if [[ ! -d "node_modules" ]]; then
    log "DEV SERVER: No node_modules found, running npm install first..."
    echo "📦 Installing dependencies first..."
    
    if npm install >> "$LOG_FILE" 2>&1; then
        log "DEV SERVER: Dependencies installed successfully"
    else
        log "DEV SERVER: Failed to install dependencies"
        echo "⚠️  Failed to install dependencies. Run 'npm install' manually."
        exit 1
    fi
fi

# Start the development server
start_dev_server

log "DEV SERVER: Hook completed"