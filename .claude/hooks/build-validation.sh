#!/bin/bash
# Build Validation Hook for Student Dome
# Runs TypeScript compilation and build after code changes
# Logs results to .claude/logs/build-validation.log

# Enable strict error handling
set -euo pipefail

# Configuration
LOG_FILE=".claude/logs/build-validation.log"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

# Create log file if it doesn't exist
mkdir -p "$(dirname "$LOG_FILE")"
touch "$LOG_FILE"

# Function to log messages
log() {
    echo "[$TIMESTAMP] $1" >> "$LOG_FILE"
    echo "$1"
}

# Check if this is a code file change that should trigger build validation
if [[ "$CLAUDE_TOOL_NAME" == "Edit" || "$CLAUDE_TOOL_NAME" == "MultiEdit" || "$CLAUDE_TOOL_NAME" == "Write" ]]; then
    # Get the file being changed from environment variables
    FILE_PATH="${CLAUDE_TOOL_ARGS_file_path:-}"
    
    # Only run for TypeScript/React files and config files
    if [[ "$FILE_PATH" =~ \.(tsx?|js|jsx|json|ts)$ ]] || [[ "$FILE_PATH" =~ (vite\.config|tsconfig|tailwind\.config) ]]; then
        log "BUILD VALIDATION: Triggered by $CLAUDE_TOOL_NAME on $FILE_PATH"
        
        # Run TypeScript compilation check
        log "BUILD VALIDATION: Running TypeScript compilation check..."
        if npm run build > ".claude/logs/build-output.log" 2>&1; then
            log "BUILD VALIDATION: ✅ Build successful"
        else
            log "BUILD VALIDATION: ❌ Build failed - check .claude/logs/build-output.log for details"
            echo "⚠️  Build validation failed! Check .claude/logs/build-output.log for TypeScript errors."
            exit 1
        fi
    else
        log "BUILD VALIDATION: Skipped for non-code file: $FILE_PATH"
    fi
else
    log "BUILD VALIDATION: Skipped for tool: $CLAUDE_TOOL_NAME"
fi

log "BUILD VALIDATION: Completed successfully"