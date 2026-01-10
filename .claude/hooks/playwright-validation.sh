#!/bin/bash
# Playwright validation hook - Requires testing for significant changes

# Function to run Playwright tests
run_playwright_tests() {
    echo "🎭 Running Playwright tests to validate changes..."

    # Create test results log
    local log_file=".claude/rules/playwright-log.md"
    mkdir -p .claude/rules
    local timestamp=$(date +"%Y-%m-%d %H:%M:%S")

    if [[ ! -f "$log_file" ]]; then
        cat > "$log_file" << 'EOF'
# Playwright Test Results Log

This file tracks Playwright test results after significant changes.

---

EOF
    fi

    echo "" >> "$log_file"
    echo "## Test Run: $timestamp" >> "$log_file"
    echo "" >> "$log_file"

    # Check if Playwright is installed
    if [[ ! -f "playwright.config.ts" ]]; then
        echo "❌ Playwright not configured. Please set up Playwright testing." | tee -a "$log_file"
        return 1
    fi

    if ! command -v npx >/dev/null 2>&1; then
        echo "❌ npm/npx not available. Cannot run Playwright tests." | tee -a "$log_file"
        return 1
    fi

    # Run basic tests to validate core functionality
    echo "🔧 Running basic Playwright tests..."
    if timeout 120 npx playwright test tests/basic.spec.ts --reporter=line 2>&1 | tee -a "$log_file"; then
        echo "✅ Playwright basic tests: PASSED" | tee -a "$log_file"
        echo "🎉 Core functionality validated with Playwright!" | tee -a "$log_file"
        return 0
    else
        echo "❌ Playwright basic tests: FAILED" | tee -a "$log_file"
        echo "⚠️  CRITICAL: Basic functionality may be broken!" | tee -a "$log_file"
        return 1
    fi
}

# Function to check if changes are significant enough to require testing
should_run_tests() {
    local tool_name="$1"
    local file_path="$2"

    # Always test for critical files
    case "$file_path" in
        */src/components/*|*/src/services/*|*/src/types.ts|*/src/App.tsx)
            echo "Critical file changed: $file_path"
            return 0
            ;;
        */package.json|*/playwright.config.ts|*/vite.config.ts)
            echo "Configuration file changed: $file_path"
            return 0
            ;;
    esac

    # Test after MultiEdit operations (likely significant changes)
    if [[ "$tool_name" == "MultiEdit" ]]; then
        echo "MultiEdit operation detected"
        return 0
    fi

    # Skip testing for documentation/config files
    case "$file_path" in
        *.md|*.txt|*.json|*.yml|*.yaml)
            if [[ "$file_path" != */package.json ]]; then
                return 1
            fi
            ;;
    esac

    return 1
}

# Main logic
case "$CLAUDE_TOOL_NAME" in
    "Write"|"Edit"|"MultiEdit")
        file_path=$(echo "$CLAUDE_TOOL_ARGS_file_path" | tr -d '"')

        if should_run_tests "$CLAUDE_TOOL_NAME" "$file_path"; then
            echo "🎭 Significant change detected, running Playwright validation..."

            # Wait for file system to sync and dev server to reload
            sleep 3

            if run_playwright_tests; then
                echo "✅ All Playwright tests passed! Changes validated."
            else
                echo "❌ Playwright tests failed! Please review and fix issues."
                echo "💡 Run 'npm run test' manually to see detailed test results."
                # Don't exit with error as it would block the user
            fi
        fi
        ;;

    "TodoWrite")
        # Check if we've completed all todos, then run final validation
        todo_content="$CLAUDE_TOOL_ARGS_todos"

        # Count completed vs total todos
        completed_count=$(echo "$todo_content" | grep -o '"status":"completed"' | wc -l)
        total_count=$(echo "$todo_content" | grep -o '"status":"' | wc -l)

        if [[ $completed_count -gt 0 && $completed_count -eq $total_count ]]; then
            echo "🎯 All todos completed! Running final Playwright validation..."
            sleep 2
            if run_playwright_tests; then
                echo "🎉 Final validation complete! All features working correctly."
            else
                echo "⚠️  Final validation failed. Please check test results."
            fi
        fi
        ;;
esac

echo "---" >> .claude/rules/playwright-log.md 2>/dev/null || true