#!/bin/bash
# Dependency Audit Hook for Student Dome
# Runs security audit after package.json or package-lock.json changes
# Helps catch vulnerable dependencies early

# Enable strict error handling
set -euo pipefail

# Configuration
LOG_FILE=".claude/logs/dependency-audit.log"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

# Create log file if it doesn't exist
mkdir -p "$(dirname "$LOG_FILE")"
touch "$LOG_FILE"

# Function to log messages
log() {
    echo "[$TIMESTAMP] $1" >> "$LOG_FILE"
    echo "$1"
}

# Function to run npm audit and format results
run_audit() {
    log "DEPENDENCY AUDIT: Running npm audit..."
    
    # Run npm audit and capture output
    local audit_output
    local audit_exit_code
    
    audit_output=$(npm audit --audit-level=moderate 2>&1) || audit_exit_code=$?
    
    # Log the full output
    echo "$audit_output" >> "$LOG_FILE"
    
    # Check for vulnerabilities
    if [[ $audit_exit_code -eq 0 ]]; then
        log "DEPENDENCY AUDIT: ✅ No vulnerabilities found"
        echo "✅ Dependency audit passed - no vulnerabilities detected"
        return 0
    else
        # Parse the audit results for summary
        local high_vulns
        local moderate_vulns
        local low_vulns
        
        high_vulns=$(echo "$audit_output" | grep -o "[0-9]* high" | head -1 | cut -d' ' -f1 || echo "0")
        moderate_vulns=$(echo "$audit_output" | grep -o "[0-9]* moderate" | head -1 | cut -d' ' -f1 || echo "0")
        low_vulns=$(echo "$audit_output" | grep -o "[0-9]* low" | head -1 | cut -d' ' -f1 || echo "0")
        
        log "DEPENDENCY AUDIT: ⚠️  Vulnerabilities found - High: $high_vulns, Moderate: $moderate_vulns, Low: $low_vulns"
        
        echo ""
        echo "⚠️  DEPENDENCY VULNERABILITIES DETECTED"
        echo "High: $high_vulns | Moderate: $moderate_vulns | Low: $low_vulns"
        echo ""
        
        # Show critical vulnerabilities
        if [[ "$high_vulns" != "0" ]] && [[ -n "$high_vulns" ]]; then
            echo "🔴 HIGH SEVERITY vulnerabilities found!"
            echo "Run 'npm audit fix' to attempt automatic fixes"
            echo "Or 'npm audit' for detailed vulnerability information"
        elif [[ "$moderate_vulns" != "0" ]] && [[ -n "$moderate_vulns" ]]; then
            echo "🟡 MODERATE vulnerabilities found"
            echo "Consider running 'npm audit fix' to resolve them"
        else
            echo "ℹ️  Only low-severity vulnerabilities found"
        fi
        
        echo ""
        echo "Full audit details logged to: $LOG_FILE"
        
        return 1
    fi
}

# Function to check for outdated packages
check_outdated() {
    log "DEPENDENCY AUDIT: Checking for outdated packages..."
    
    local outdated_output
    outdated_output=$(npm outdated 2>/dev/null || echo "")
    
    if [[ -n "$outdated_output" ]]; then
        log "DEPENDENCY AUDIT: Outdated packages found"
        echo "$outdated_output" >> "$LOG_FILE"
        echo ""
        echo "📦 Some packages have newer versions available"
        echo "Run 'npm outdated' to see details"
    else
        log "DEPENDENCY AUDIT: All packages are up to date"
    fi
}

log "DEPENDENCY AUDIT: Starting for tool $CLAUDE_TOOL_NAME"

# Check if this hook should run based on the tool and file being modified
case "$CLAUDE_TOOL_NAME" in
    "Edit"|"MultiEdit"|"Write")
        FILE_PATH="${CLAUDE_TOOL_ARGS_file_path:-}"
        
        # Only run for package files
        if [[ "$FILE_PATH" =~ package\.json$ ]] || [[ "$FILE_PATH" =~ package-lock\.json$ ]]; then
            log "DEPENDENCY AUDIT: Triggered by change to $FILE_PATH"
            
            # Wait a moment for file system to sync
            sleep 1
            
            # Run the audit
            if run_audit; then
                # Also check for outdated packages on package.json changes
                if [[ "$FILE_PATH" =~ package\.json$ ]]; then
                    check_outdated
                fi
            else
                # Audit found vulnerabilities - don't fail the hook but warn user
                log "DEPENDENCY AUDIT: Completed with vulnerabilities detected"
            fi
        else
            log "DEPENDENCY AUDIT: Skipped - not a package file: $FILE_PATH"
        fi
        ;;
        
    "Bash")
        COMMAND="${CLAUDE_TOOL_ARGS_command:-}"
        
        # Run audit after npm install commands
        if [[ "$COMMAND" =~ npm.*install ]] || [[ "$COMMAND" =~ npm.*add ]] || [[ "$COMMAND" =~ npm.*update ]]; then
            log "DEPENDENCY AUDIT: Triggered by npm command: $COMMAND"
            
            # Wait for the npm command to complete and then run audit
            sleep 2
            run_audit
        fi
        ;;
        
    *)
        log "DEPENDENCY AUDIT: Skipped for tool: $CLAUDE_TOOL_NAME"
        ;;
esac

log "DEPENDENCY AUDIT: Hook completed"
exit 0