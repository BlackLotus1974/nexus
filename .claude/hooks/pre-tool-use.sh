#!/bin/bash
# Force tests & verification before file modifications
if [[ "$CLAUDE_TOOL_NAME" == "Write" || "$CLAUDE_TOOL_NAME" == "Edit" || "$CLAUDE_TOOL_NAME" == "MultiEdit" ]]; then
    # Check if we're modifying source code files
    file_path=""
    
    if [[ "$CLAUDE_TOOL_NAME" == "Write" ]]; then
        file_path=$(echo "$CLAUDE_TOOL_ARGS_file_path" | tr -d '"')
    elif [[ "$CLAUDE_TOOL_NAME" == "Edit" || "$CLAUDE_TOOL_NAME" == "MultiEdit" ]]; then
        file_path=$(echo "$CLAUDE_TOOL_ARGS_file_path" | tr -d '"')
    fi
    
    if [[ -n "$file_path" ]]; then
        extension="${file_path##*.}"
        
        case "$extension" in
            ts|tsx|js|jsx)
                # Run TypeScript check if available
                if [[ -f "package.json" ]] && command -v npm >/dev/null 2>&1; then
                    # Check if typecheck script exists
                    if npm run 2>/dev/null | grep -q "typecheck"; then
                        echo "🔍 Running TypeScript check before modification..."
                        npm run typecheck || {
                            echo "❌ TypeScript errors found. Please fix before proceeding."
                            exit 1
                        }
                    fi
                    
                    # Check if lint script exists  
                    if npm run 2>/dev/null | grep -q "lint"; then
                        echo "🔍 Running linter before modification..."
                        npm run lint || {
                            echo "❌ Linting errors found. Please fix before proceeding."
                            exit 1
                        }
                    fi
                fi
                ;;
            py)
                # Run Python checks if available
                if command -v python >/dev/null 2>&1; then
                    # Check syntax
                    python -m py_compile "$file_path" 2>/dev/null || {
                        echo "❌ Python syntax errors found. Please fix before proceeding."
                        exit 1
                    }
                fi
                ;;
        esac
    fi
fi