#!/bin/bash
# Security Scan Hook for Student Dome
# Prevents accidental commits of API keys and sensitive data
# This is a BLOCKING hook that can prevent dangerous operations

# Enable strict error handling
set -euo pipefail

# Configuration
LOG_FILE=".claude/logs/security-scan.log"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

# Create log file if it doesn't exist
mkdir -p "$(dirname "$LOG_FILE")"
touch "$LOG_FILE"

# Function to log messages
log() {
    echo "[$TIMESTAMP] $1" >> "$LOG_FILE"
    echo "$1"
}

# Sensitive patterns to detect (case-insensitive)
SENSITIVE_PATTERNS=(
    "GEMINI_API_KEY.*=.*[A-Za-z0-9]"
    "API_KEY.*=.*[A-Za-z0-9]"
    "sk-[A-Za-z0-9]{48}"  # OpenAI API key pattern
    "AIza[A-Za-z0-9_-]{35}"  # Google API key pattern
    "process\.env\.API_KEY.*=.*['\"][A-Za-z0-9]"
    "Bearer [A-Za-z0-9_-]{20,}"
    "token.*=.*['\"][A-Za-z0-9_-]{20,}"
)

# Function to scan content for sensitive data
scan_content() {
    local content="$1"
    local violations=()
    
    for pattern in "${SENSITIVE_PATTERNS[@]}"; do
        if echo "$content" | grep -iE "$pattern" > /dev/null 2>&1; then
            violations+=("Detected potential API key or token: $pattern")
        fi
    done
    
    echo "${violations[@]}"
}

# Function to scan file for sensitive data
scan_file() {
    local file_path="$1"
    
    if [[ -f "$file_path" ]]; then
        local content
        content=$(cat "$file_path" 2>/dev/null || echo "")
        scan_content "$content"
    fi
}

log "SECURITY SCAN: Started for tool $CLAUDE_TOOL_NAME"

# Check different tool types
case "$CLAUDE_TOOL_NAME" in
    "Edit"|"MultiEdit"|"Write")
        # Get file path and new content
        FILE_PATH="${CLAUDE_TOOL_ARGS_file_path:-}"
        NEW_STRING="${CLAUDE_TOOL_ARGS_new_string:-}"
        CONTENT="${CLAUDE_TOOL_ARGS_content:-}"
        
        # Skip scanning certain safe files
        if [[ "$FILE_PATH" =~ \.(md|txt|log|json|lock)$ ]] && [[ ! "$FILE_PATH" =~ (package\.json|\.env) ]]; then
            log "SECURITY SCAN: Skipping documentation/log file: $FILE_PATH"
            exit 0
        fi
        
        log "SECURITY SCAN: Scanning file edit: $FILE_PATH"
        
        # Scan the new content being written
        VIOLATIONS=""
        if [[ -n "$NEW_STRING" ]]; then
            VIOLATIONS=$(scan_content "$NEW_STRING")
        elif [[ -n "$CONTENT" ]]; then
            VIOLATIONS=$(scan_content "$CONTENT")
        fi
        
        if [[ -n "$VIOLATIONS" ]]; then
            log "SECURITY SCAN: ❌ VIOLATIONS DETECTED in $FILE_PATH"
            log "SECURITY SCAN: $VIOLATIONS"
            echo ""
            echo "🚨 SECURITY VIOLATION DETECTED! 🚨"
            echo "File: $FILE_PATH"
            echo "Issue: Potential API key or sensitive data detected"
            echo ""
            echo "This operation has been BLOCKED to prevent accidental exposure of secrets."
            echo "Please remove any API keys or tokens from your code."
            echo "Use environment variables (.env.local) for sensitive data."
            echo ""
            exit 1
        fi
        ;;
        
    "Bash")
        COMMAND="${CLAUDE_TOOL_ARGS_command:-}"
        
        # Check for git commands that might commit sensitive data
        if [[ "$COMMAND" =~ git.*commit ]] || [[ "$COMMAND" =~ git.*add ]]; then
            log "SECURITY SCAN: Scanning git operation: $COMMAND"
            
            # Check staged files for sensitive data
            if git rev-parse --git-dir > /dev/null 2>&1; then
                staged_files=$(git diff --cached --name-only 2>/dev/null || echo "")
                
                for file in $staged_files; do
                    if [[ -f "$file" ]]; then
                        VIOLATIONS=$(scan_file "$file")
                        if [[ -n "$VIOLATIONS" ]]; then
                            log "SECURITY SCAN: ❌ VIOLATIONS DETECTED in staged file $file"
                            echo ""
                            echo "🚨 SECURITY VIOLATION DETECTED! 🚨"
                            echo "Staged file: $file"
                            echo "Issue: $VIOLATIONS"
                            echo ""
                            echo "This git operation has been BLOCKED."
                            echo "Please unstage and fix the file before committing."
                            echo ""
                            exit 1
                        fi
                    fi
                done
            fi
        fi
        ;;
esac

log "SECURITY SCAN: ✅ No violations detected"
exit 0