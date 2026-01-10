#!/bin/bash

# Debugging Documentation Trigger
# This script identifies when debugging documentation should be prompted
# and triggers the debugging documentation hook accordingly

HOOK_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" &> /dev/null && pwd)"
DEBUG_HOOK="$HOOK_DIR/debugging-documentation.sh"

# Function to check various debugging indicators
should_trigger_debugging_docs() {
    local context="$*"
    
    # Check command line arguments for debugging keywords
    if echo "$context" | grep -iq -E "(error|debug|fix|bug|issue|problem|crash|fail)"; then
        return 0
    fi
    
    # Check recent file modifications for debugging-related changes
    if git diff --name-only HEAD~1 HEAD 2>/dev/null | xargs grep -l -i -E "(console\.|debugger|TODO|FIXME|BUG)" 2>/dev/null | head -1 | grep -q .; then
        return 0
    fi
    
    # Check if we're working on known problematic areas
    local sensemaker_problem_files=(
        "src/components/App.js"
        "src/components/CustomNode.js" 
        "src/services/supabase.js"
        "src/components/CloudSync.js"
        "src/components/RealtimeMindMaps.js"
        "main.js"
        "preload.js"
    )
    
    for file in "${sensemaker_problem_files[@]}"; do
        if [[ -f "$file" ]] && git diff --quiet HEAD~1 HEAD -- "$file" 2>/dev/null; then
            # File was recently modified
            return 0
        fi
    done
    
    # Check for recent error logs
    if find . -name "*.log" -newer ".git/COMMIT_EDITMSG" 2>/dev/null | head -1 | grep -q .; then
        return 0
    fi
    
    # Check npm/yarn error scenarios
    if [[ -f "package.json" ]] && find . -name "npm-debug.log" -o -name "yarn-error.log" 2>/dev/null | head -1 | grep -q .; then
        return 0
    fi
    
    return 1
}

# Function to get debugging context from environment
get_debugging_context() {
    local context=""
    
    # Add tool information if available
    if [[ -n "$CLAUDE_TOOL_NAME" ]]; then
        context="$context Tool: $CLAUDE_TOOL_NAME"
    fi
    
    if [[ -n "$CLAUDE_TOOL_ERROR" ]]; then
        context="$context Error: $CLAUDE_TOOL_ERROR"
    fi
    
    # Add current working context
    if [[ -d ".git" ]]; then
        local recent_commits=$(git log --oneline -3 2>/dev/null)
        if echo "$recent_commits" | grep -iq -E "(fix|bug|debug|error)"; then
            context="$context Recent-commits-suggest-debugging"
        fi
    fi
    
    # Add file context
    if [[ -n "$CLAUDE_TOOL_ARGS_file_path" ]]; then
        local file_path=$(echo "$CLAUDE_TOOL_ARGS_file_path" | tr -d '"')
        if [[ -f "$file_path" ]]; then
            context="$context Modified-file: $file_path"
        fi
    fi
    
    echo "$context"
}

# Main execution
main() {
    local all_args="$*"
    local debugging_context=$(get_debugging_context)
    local full_context="$all_args $debugging_context"
    
    echo "=== Debugging Documentation Trigger Check ==="
    echo "Context: $full_context"
    
    if should_trigger_debugging_docs "$full_context"; then
        echo "✅ Debugging context detected - triggering documentation"
        
        # Trigger the debugging documentation hook
        if [[ -f "$DEBUG_HOOK" ]]; then
            bash "$DEBUG_HOOK" "$full_context"
        else
            echo "⚠️  Debugging documentation hook not found at: $DEBUG_HOOK"
        fi
    else
        echo "ℹ️  No debugging context detected"
        
        # Show manual trigger option
        echo ""
        echo "💡 Manual debugging documentation triggers:"
        echo "   • bash .claude/hooks/debugging-documentation.sh"
        echo "   • powershell .claude/hooks/debugging-documentation.ps1"
        echo ""
        
        # Show when to document
        echo "📋 Document debugging when:"
        echo "   • Resolving any bug or issue"
        echo "   • Spending >30 minutes on a problem"  
        echo "   • Discovering new debugging techniques"
        echo "   • Sensemaker-specific issues (Electron, Supabase, ReactFlow)"
    fi
}

# Execute main function
main "$@"