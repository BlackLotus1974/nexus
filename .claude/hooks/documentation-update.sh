#!/bin/bash
# Documentation Update Hook for Student Dome
# Prompts for CLAUDE.md updates when significant architectural changes are made
# Helps keep documentation current with codebase

# Enable strict error handling
set -euo pipefail

# Configuration
LOG_FILE=".claude/logs/documentation-update.log"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

# Create log file if it doesn't exist
mkdir -p "$(dirname "$LOG_FILE")"
touch "$LOG_FILE"

# Function to log messages
log() {
    echo "[$TIMESTAMP] $1" >> "$LOG_FILE"
    echo "$1"
}

# Files that indicate architectural changes
ARCHITECTURAL_FILES=(
    "App.tsx"
    "types.ts" 
    "constants.ts"
    "vite.config.ts"
    "package.json"
    "tailwind.config.js"
    "services/geminiService.ts"
    "components/ActionDashboard.tsx"
    "components/LandingPage.tsx"
)

# Function to check if file is architecturally significant
is_architectural_file() {
    local file_path="$1"
    
    for arch_file in "${ARCHITECTURAL_FILES[@]}"; do
        if [[ "$file_path" == *"$arch_file" ]]; then
            return 0
        fi
    done
    return 1
}

# Function to analyze the type of change
analyze_change() {
    local file_path="$1"
    local change_type=""
    
    case "$file_path" in
        *"App.tsx")
            change_type="main application state machine or routing"
            ;;
        *"types.ts")
            change_type="TypeScript interfaces or data structures"
            ;;
        *"constants.ts")
            change_type="application constants or configuration"
            ;;
        *"package.json")
            change_type="dependencies or build scripts"
            ;;
        *"vite.config.ts")
            change_type="build configuration"
            ;;
        *"tailwind.config.js")
            change_type="design system or styling configuration"
            ;;
        *"geminiService.ts")
            change_type="AI service integration or API handling"
            ;;
        *"ActionDashboard.tsx")
            change_type="main dashboard component or action plan display"
            ;;
        *"LandingPage.tsx")
            change_type="initial user interface or form handling"
            ;;
        *)
            change_type="component or service architecture"
            ;;
    esac
    
    echo "$change_type"
}

# Function to check if CLAUDE.md needs updating
check_documentation_freshness() {
    if [[ ! -f "CLAUDE.md" ]]; then
        log "DOCUMENTATION: No CLAUDE.md found - should be created"
        echo "📝 No CLAUDE.md found. Consider creating one to document the architecture."
        return 1
    fi
    
    # Check if CLAUDE.md is older than key files
    local claude_md_time
    claude_md_time=$(stat -c %Y "CLAUDE.md" 2>/dev/null || stat -f %m "CLAUDE.md" 2>/dev/null || echo "0")
    
    local needs_update=false
    
    for arch_file in "${ARCHITECTURAL_FILES[@]}"; do
        if [[ -f "$arch_file" ]]; then
            local file_time
            file_time=$(stat -c %Y "$arch_file" 2>/dev/null || stat -f %m "$arch_file" 2>/dev/null || echo "0")
            
            if [[ $file_time -gt $claude_md_time ]]; then
                needs_update=true
                break
            fi
        fi
    done
    
    if [[ "$needs_update" == true ]]; then
        log "DOCUMENTATION: CLAUDE.md appears outdated compared to source files"
        return 1
    else
        log "DOCUMENTATION: CLAUDE.md appears current"
        return 0
    fi
}

# Function to suggest specific documentation updates
suggest_updates() {
    local file_path="$1"
    local change_type="$2"
    
    echo ""
    echo "📚 DOCUMENTATION UPDATE SUGGESTED"
    echo "Changed file: $file_path"
    echo "Change type: $change_type"
    echo ""
    
    case "$file_path" in
        *"App.tsx")
            echo "Consider updating:"
            echo "• Core Application Flow section"
            echo "• State Management Architecture section"
            ;;
        *"types.ts")
            echo "Consider updating:"
            echo "• Type System section"
            echo "• ActionPlan interface documentation"
            ;;
        *"package.json")
            echo "Consider updating:"
            echo "• Development Commands section"
            echo "• Technology Stack section"
            ;;
        *"constants.ts")
            echo "Consider updating:"
            echo "• Type System section (INCIDENT_TYPES)"
            ;;
        *"vite.config.ts")
            echo "Consider updating:"
            echo "• Prerequisites and Setup section"
            echo "• Build configuration details"
            ;;
        *"geminiService.ts")
            echo "Consider updating:"
            echo "• AI Service Architecture section"
            echo "• Technology Stack (AI Integration)"
            ;;
        *)
            echo "Consider reviewing CLAUDE.md for any needed updates"
            ;;
    esac
    
    echo ""
    echo "To update documentation: edit CLAUDE.md"
    echo "For architecture changes, focus on the 'big picture' that requires"
    echo "reading multiple files to understand."
    echo ""
}

log "DOCUMENTATION: Starting for tool $CLAUDE_TOOL_NAME"

# Check if this hook should run
case "$CLAUDE_TOOL_NAME" in
    "Edit"|"MultiEdit"|"Write")
        FILE_PATH="${CLAUDE_TOOL_ARGS_file_path:-}"
        
        # Skip documentation files themselves
        if [[ "$FILE_PATH" =~ \.(md|txt|log)$ ]]; then
            log "DOCUMENTATION: Skipped for documentation file: $FILE_PATH"
            exit 0
        fi
        
        # Check if this is an architectural file
        if is_architectural_file "$FILE_PATH"; then
            log "DOCUMENTATION: Architectural change detected in $FILE_PATH"
            
            local change_type
            change_type=$(analyze_change "$FILE_PATH")
            
            log "DOCUMENTATION: Change type identified as: $change_type"
            
            # Check if documentation might need updating
            if ! check_documentation_freshness; then
                suggest_updates "$FILE_PATH" "$change_type"
                log "DOCUMENTATION: Update suggestion provided to user"
            else
                log "DOCUMENTATION: CLAUDE.md appears current, no update needed"
                echo "ℹ️  Architectural file modified: $FILE_PATH"
                echo "   Documentation appears current."
            fi
        else
            log "DOCUMENTATION: Non-architectural file change: $FILE_PATH"
        fi
        ;;
        
    *)
        log "DOCUMENTATION: Skipped for tool: $CLAUDE_TOOL_NAME"
        ;;
esac

log "DOCUMENTATION: Hook completed"
exit 0