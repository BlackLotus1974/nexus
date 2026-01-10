#!/bin/bash
# Self-improve rule - Track successful patterns for future reference

# Create rules directory if it doesn't exist
mkdir -p .claude/rules

# Function to add a successful pattern
add_success_pattern() {
    local pattern_file=".claude/rules/successful-patterns.md"
    local timestamp=$(date +"%Y-%m-%d %H:%M:%S")
    local pattern_content="$1"
    
    # Create patterns file if it doesn't exist
    if [[ ! -f "$pattern_file" ]]; then
        cat > "$pattern_file" << 'EOF'
# Successful Patterns for Claude Code

This file tracks successful patterns and approaches that work well in this codebase.

---

EOF
    fi
    
    # Add the new pattern (avoid duplicates)
    if ! grep -q "$pattern_content" "$pattern_file" 2>/dev/null; then
        echo "" >> "$pattern_file"
        echo "## Success Pattern: $timestamp" >> "$pattern_file"
        echo "" >> "$pattern_file"
        echo "$pattern_content" >> "$pattern_file"
        echo "" >> "$pattern_file"
        echo "---" >> "$pattern_file"
        echo "" >> "$pattern_file"
    fi
}

# Track successful tool completions
if [[ "$CLAUDE_TOOL_NAME" == "Write" || "$CLAUDE_TOOL_NAME" == "Edit" || "$CLAUDE_TOOL_NAME" == "MultiEdit" ]]; then
    file_path=$(echo "$CLAUDE_TOOL_ARGS_file_path" | tr -d '"')
    
    if [[ -n "$file_path" && -f "$file_path" ]]; then
        extension="${file_path##*.}"
        
        case "$extension" in
            tsx|jsx)
                # Check for React component patterns
                if grep -q "export.*function\|export.*const.*=.*=>" "$file_path" 2>/dev/null; then
                    if grep -q "useState\|useEffect\|useCallback" "$file_path" 2>/dev/null; then
                        add_success_pattern "**React Component Success**: Successfully used functional components with hooks in '$file_path'. This pattern works well for this codebase."
                    fi
                fi
                
                if grep -q "interface.*Props" "$file_path" 2>/dev/null; then
                    add_success_pattern "**TypeScript Props Pattern**: Successfully defined component props with interfaces in '$file_path'. This provides good type safety."
                fi
                ;;
                
            ts)
                # Check for service patterns
                if grep -q "async.*function\|export.*async" "$file_path" 2>/dev/null; then
                    if grep -q "try.*catch\|\.catch(" "$file_path" 2>/dev/null; then
                        add_success_pattern "**Async Service Pattern**: Successfully implemented async functions with error handling in '$file_path'. This is the preferred pattern for services."
                    fi
                fi
                
                if grep -q "export.*interface\|export.*type" "$file_path" 2>/dev/null; then
                    add_success_pattern "**TypeScript Exports**: Successfully defined and exported types in '$file_path'. This promotes type reusability."
                fi
                ;;
        esac
        
        # Check for general good practices
        if ! grep -q "console\.log" "$file_path" 2>/dev/null; then
            add_success_pattern "**Clean Code**: File '$file_path' was created/modified without debug console statements. This is good for production code."
        fi
    fi
fi

# Track successful builds
if [[ "$CLAUDE_TOOL_NAME" == "Bash" ]]; then
    command_args="$CLAUDE_TOOL_ARGS_command"
    
    if [[ "$command_args" == *"npm run build"* ]]; then
        add_success_pattern "**Build Success**: Successfully ran 'npm run build'. The current configuration and code structure supports clean builds."
    fi
    
    if [[ "$command_args" == *"npm run typecheck"* ]]; then
        add_success_pattern "**TypeScript Success**: TypeScript compilation succeeded. Current type definitions and imports are working correctly."
    fi
    
    if [[ "$command_args" == *"npm run lint"* ]]; then
        add_success_pattern "**Linting Success**: Code passed linting rules. Current code style is consistent with project standards."
    fi
fi