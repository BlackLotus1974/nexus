#!/bin/bash
# IDE diagnostics hook - Type checks + linting after each task

# Function to run comprehensive diagnostics
run_diagnostics() {
    local file_path="$1"
    local extension="${file_path##*.}"
    local diagnostics_passed=true
    
    echo "🔍 Running IDE diagnostics..."
    
    # Create diagnostics log
    local log_file=".claude/rules/diagnostics-log.md"
    mkdir -p .claude/rules
    local timestamp=$(date +"%Y-%m-%d %H:%M:%S")
    
    if [[ ! -f "$log_file" ]]; then
        cat > "$log_file" << 'EOF'
# IDE Diagnostics Log

This file tracks diagnostic results after code changes.

---

EOF
    fi
    
    echo "" >> "$log_file"
    echo "## Diagnostics Run: $timestamp" >> "$log_file"
    echo "File: $file_path" >> "$log_file"
    echo "" >> "$log_file"
    
    # TypeScript/JavaScript diagnostics
    if [[ "$extension" == "ts" || "$extension" == "tsx" || "$extension" == "js" || "$extension" == "jsx" ]]; then
        
        # TypeScript type checking
        if [[ -f "package.json" ]] && command -v npm >/dev/null 2>&1; then
            
            # Check if TypeScript check script exists
            if npm run 2>/dev/null | grep -q "typecheck"; then
                echo "🔧 Running TypeScript type check..."
                if npm run typecheck 2>&1; then
                    echo "✅ TypeScript: PASSED" | tee -a "$log_file"
                else
                    echo "❌ TypeScript: FAILED" | tee -a "$log_file"
                    diagnostics_passed=false
                fi
            elif command -v tsc >/dev/null 2>&1; then
                echo "🔧 Running TypeScript compiler check..."
                if tsc --noEmit 2>&1; then
                    echo "✅ TypeScript: PASSED" | tee -a "$log_file"
                else
                    echo "❌ TypeScript: FAILED" | tee -a "$log_file"
                    diagnostics_passed=false
                fi
            fi
            
            # Linting
            if npm run 2>/dev/null | grep -q "lint"; then
                echo "🔧 Running linter..."
                if npm run lint 2>&1; then
                    echo "✅ Linting: PASSED" | tee -a "$log_file"
                else
                    echo "❌ Linting: FAILED" | tee -a "$log_file"
                    diagnostics_passed=false
                fi
            elif command -v eslint >/dev/null 2>&1; then
                echo "🔧 Running ESLint..."
                if eslint "$file_path" 2>&1; then
                    echo "✅ ESLint: PASSED" | tee -a "$log_file"
                else
                    echo "❌ ESLint: FAILED" | tee -a "$log_file"
                    diagnostics_passed=false
                fi
            fi
            
            # Prettier formatting check
            if command -v prettier >/dev/null 2>&1; then
                echo "🔧 Checking code formatting..."
                if prettier --check "$file_path" 2>&1; then
                    echo "✅ Formatting: PASSED" | tee -a "$log_file"
                else
                    echo "⚠️  Formatting: Auto-fixing..." | tee -a "$log_file"
                    prettier --write "$file_path" 2>/dev/null || true
                fi
            fi
        fi
        
        # Node.js syntax check for JS files
        if [[ "$extension" == "js" ]] && command -v node >/dev/null 2>&1; then
            echo "🔧 Checking Node.js syntax..."
            if node -c "$file_path" 2>&1; then
                echo "✅ Node.js syntax: PASSED" | tee -a "$log_file"
            else
                echo "❌ Node.js syntax: FAILED" | tee -a "$log_file"
                diagnostics_passed=false
            fi
        fi
    fi
    
    # Python diagnostics
    if [[ "$extension" == "py" ]]; then
        if command -v python >/dev/null 2>&1; then
            echo "🔧 Checking Python syntax..."
            if python -m py_compile "$file_path" 2>&1; then
                echo "✅ Python syntax: PASSED" | tee -a "$log_file"
            else
                echo "❌ Python syntax: FAILED" | tee -a "$log_file"
                diagnostics_passed=false
            fi
            
            # Flake8 linting if available
            if command -v flake8 >/dev/null 2>&1; then
                echo "🔧 Running Flake8..."
                if flake8 "$file_path" 2>&1; then
                    echo "✅ Flake8: PASSED" | tee -a "$log_file"
                else
                    echo "❌ Flake8: FAILED" | tee -a "$log_file"
                    diagnostics_passed=false
                fi
            fi
        fi
    fi
    
    # CSS/SCSS diagnostics
    if [[ "$extension" == "css" || "$extension" == "scss" ]]; then
        if command -v stylelint >/dev/null 2>&1; then
            echo "🔧 Running Stylelint..."
            if stylelint "$file_path" 2>&1; then
                echo "✅ Stylelint: PASSED" | tee -a "$log_file"
            else
                echo "❌ Stylelint: FAILED" | tee -a "$log_file"
                diagnostics_passed=false
            fi
        fi
    fi
    
    # Overall result
    echo "" >> "$log_file"
    if [[ "$diagnostics_passed" == true ]]; then
        echo "🎉 All diagnostics passed!" | tee -a "$log_file"
    else
        echo "⚠️  Some diagnostics failed - review above for details" | tee -a "$log_file"
    fi
    echo "---" >> "$log_file"
    
    return $([ "$diagnostics_passed" == true ] && echo 0 || echo 1)
}

# Function to run quick project-wide checks
run_project_diagnostics() {
    echo "🔍 Running project-wide diagnostics..."
    
    if [[ -f "package.json" ]] && command -v npm >/dev/null 2>&1; then
        # Run all available diagnostic scripts
        available_scripts=$(npm run 2>/dev/null | grep -E "typecheck|lint|test" | head -3)
        
        if [[ -n "$available_scripts" ]]; then
            echo "Available diagnostic scripts:"
            echo "$available_scripts"
            
            # Run typecheck if available
            if npm run 2>/dev/null | grep -q "typecheck"; then
                echo "🔧 Running project TypeScript check..."
                npm run typecheck
            fi
            
            # Run lint if available
            if npm run 2>/dev/null | grep -q "lint"; then
                echo "🔧 Running project linting..."
                npm run lint
            fi
        fi
    fi
}

# Main logic
case "$CLAUDE_TOOL_NAME" in
    "Write"|"Edit"|"MultiEdit")
        file_path=$(echo "$CLAUDE_TOOL_ARGS_file_path" | tr -d '"')
        
        if [[ -n "$file_path" && -f "$file_path" ]]; then
            # Wait for file system to sync
            sleep 1
            
            # Run diagnostics on the specific file
            run_diagnostics "$file_path"
            
            # For TypeScript/JavaScript files, also run project-wide checks occasionally
            extension="${file_path##*.}"
            if [[ "$extension" == "ts" || "$extension" == "tsx" ]]; then
                # Run project checks every 3rd file change (to save time)
                if [[ $((RANDOM % 3)) -eq 0 ]]; then
                    run_project_diagnostics
                fi
            fi
        fi
        ;;
        
    "Bash")
        command_args="$CLAUDE_TOOL_ARGS_command"
        
        # Run diagnostics after dependency changes
        if [[ "$command_args" == *"npm install"* ]] || [[ "$command_args" == *"npm update"* ]]; then
            echo "📦 Dependency change detected, running diagnostics..."
            sleep 2  # Wait for npm to finish
            run_project_diagnostics
        fi
        ;;
esac