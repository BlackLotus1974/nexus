#!/bin/bash
# Auto-format code after each file write
if [[ "$CLAUDE_TOOL_NAME" == "Write" || "$CLAUDE_TOOL_NAME" == "Edit" || "$CLAUDE_TOOL_NAME" == "MultiEdit" ]]; then
    file_path=""
    
    # Extract file path from tool args
    if [[ "$CLAUDE_TOOL_NAME" == "Write" ]]; then
        file_path=$(echo "$CLAUDE_TOOL_ARGS_file_path" | tr -d '"')
    elif [[ "$CLAUDE_TOOL_NAME" == "Edit" || "$CLAUDE_TOOL_NAME" == "MultiEdit" ]]; then
        file_path=$(echo "$CLAUDE_TOOL_ARGS_file_path" | tr -d '"')
    fi
    
    if [[ -n "$file_path" && -f "$file_path" ]]; then
        extension="${file_path##*.}"
        
        case "$extension" in
            ts|tsx|js|jsx)
                if command -v npx >/dev/null 2>&1; then
                    npx prettier --write "$file_path" 2>/dev/null || true
                elif command -v npm >/dev/null 2>&1; then
                    npm exec prettier -- --write "$file_path" 2>/dev/null || true
                fi
                ;;
            py)
                if command -v black >/dev/null 2>&1; then
                    black "$file_path" 2>/dev/null || true
                elif command -v autopep8 >/dev/null 2>&1; then
                    autopep8 --in-place "$file_path" 2>/dev/null || true
                fi
                ;;
            rs)
                if command -v rustfmt >/dev/null 2>&1; then
                    rustfmt "$file_path" 2>/dev/null || true
                fi
                ;;
        esac
    fi
fi

# Enhanced debugging detection and documentation triggering
echo "Tool used: $CLAUDE_TOOL_NAME"

HOOK_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" &> /dev/null && pwd)"

# Check for patterns that might indicate debugging issues
debugging_detected=false

if [[ "$CLAUDE_TOOL_NAME" == "Edit" ]] && echo "$CLAUDE_TOOL_ARGS" | grep -iq "fix\|debug\|error\|bug"; then
    echo "Detected potential debugging/fixing activity"
    debugging_detected=true
fi

if [[ "$CLAUDE_TOOL_NAME" == "Bash" ]] && echo "$CLAUDE_TOOL_ARGS" | grep -iq "npm.*error\|yarn.*error\|test.*fail\|build.*fail"; then
    echo "Detected build/test failure activity"
    debugging_detected=true
fi

if [[ "$CLAUDE_TOOL_NAME" == "Read" ]] && echo "$CLAUDE_TOOL_ARGS" | grep -iq "log\|error\|debug"; then
    echo "Detected error log investigation"
    debugging_detected=true
fi

# Trigger debugging documentation if debugging detected
if [[ "$debugging_detected" == "true" ]]; then
    echo "=== Triggering Debugging Documentation Check ==="
    if [[ -f "$HOOK_DIR/trigger-debugging-docs.sh" ]]; then
        bash "$HOOK_DIR/trigger-debugging-docs.sh" "post-tool-use" "$CLAUDE_TOOL_NAME" "$CLAUDE_TOOL_ARGS"
    fi
fi

# Sensemaker-specific debugging patterns
if [[ "$CLAUDE_TOOL_NAME" == "Edit" ]]; then
    file_path=$(echo "$CLAUDE_TOOL_ARGS_file_path" | tr -d '"')
    
    # Check if editing common problem files
    case "$file_path" in
        *"src/components/App.js"*)
            echo "🔍 Editing main App component - consider documenting state management issues"
            ;;
        *"src/services/supabase.js"*)
            echo "🔍 Editing Supabase service - consider documenting auth/database issues"
            ;;
        *"src/components/CustomNode.js"*)
            echo "🔍 Editing CustomNode - consider documenting ReactFlow rendering issues"
            ;;
        *"main.js"*|*"preload.js"*)
            echo "🔍 Editing Electron files - consider documenting IPC communication issues"
            ;;
    esac
fi