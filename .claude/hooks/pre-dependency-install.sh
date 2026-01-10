#!/bin/bash
# Dependency documentation hook - Prevent duplicate or redundant installs

# Function to document dependencies
document_dependency() {
    local package_name="$1"
    local install_type="$2"  # "dependency" or "devDependency"
    local timestamp=$(date +"%Y-%m-%d %H:%M:%S")
    local deps_file=".claude/rules/dependency-tracking.md"
    
    mkdir -p .claude/rules
    
    # Create dependency tracking file if it doesn't exist
    if [[ ! -f "$deps_file" ]]; then
        cat > "$deps_file" << 'EOF'
# Dependency Tracking

This file tracks package installations to prevent duplicates and redundant installs.

## Installation History

EOF
    fi
    
    # Log the installation attempt
    echo "- **$timestamp**: Attempted to install \`$package_name\` as $install_type" >> "$deps_file"
}

# Function to check for existing dependencies
check_existing_dependencies() {
    local package_name="$1"
    local found_existing=false
    
    echo "🔍 Checking for existing dependencies..."
    
    # Check package.json for existing dependencies
    if [[ -f "package.json" ]]; then
        if grep -q "\"$package_name\"" package.json 2>/dev/null; then
            echo "⚠️  Package '$package_name' already exists in package.json!"
            
            # Show where it exists
            if grep -A 5 -B 5 "\"$package_name\"" package.json; then
                echo "📋 Current entry in package.json shown above"
            fi
            found_existing=true
        fi
    fi
    
    # Check for similar/related packages
    check_similar_packages "$package_name"
    
    return $([ "$found_existing" == true ] && echo 0 || echo 1)
}

# Function to check for similar packages that might conflict
check_similar_packages() {
    local package_name="$1"
    local similar_file=".claude/rules/similar-packages.md"
    
    # Create similar packages reference if it doesn't exist
    if [[ ! -f "$similar_file" ]]; then
        cat > "$similar_file" << 'EOF'
# Similar Package Reference

This file helps identify potentially conflicting or redundant packages.

## Common Conflicts:

### CSS Frameworks
- `tailwindcss` vs `bootstrap` vs `bulma`
- `styled-components` vs `emotion` vs `stitches`

### State Management  
- `redux` vs `zustand` vs `jotai` vs `valtio`
- `@reduxjs/toolkit` vs `redux`

### HTTP Clients
- `axios` vs `fetch` vs `ky` vs `got`

### Testing
- `jest` vs `vitest` vs `ava`
- `@testing-library/react` vs `enzyme`

### Build Tools
- `webpack` vs `vite` vs `parcel` vs `esbuild`

### Linting
- `eslint` vs `tslint` (tslint deprecated)
- `prettier` vs `beautify`

### UI Libraries
- `react-bootstrap` vs `antd` vs `material-ui` vs `chakra-ui`

---

EOF
    fi
    
    # Check for potential conflicts
    case "$package_name" in
        # CSS/Styling conflicts
        "tailwindcss"|"bootstrap"|"bulma")
            if [[ -f "package.json" ]]; then
                existing_css=$(grep -E "(tailwindcss|bootstrap|bulma)" package.json | head -3)
                if [[ -n "$existing_css" ]]; then
                    echo "⚠️  CSS framework conflict detected:"
                    echo "$existing_css"
                    echo "💡 Consider if multiple CSS frameworks are needed"
                fi
            fi
            ;;
            
        # State management conflicts
        "redux"|"zustand"|"jotai"|"valtio")
            if [[ -f "package.json" ]]; then
                existing_state=$(grep -E "(redux|zustand|jotai|valtio)" package.json | head -3)
                if [[ -n "$existing_state" ]]; then
                    echo "⚠️  State management conflict detected:"
                    echo "$existing_state"
                    echo "💡 Multiple state management libraries may cause complexity"
                fi
            fi
            ;;
            
        # HTTP client conflicts
        "axios"|"ky"|"got")
            if [[ -f "package.json" ]]; then
                existing_http=$(grep -E "(axios|ky|got)" package.json | head -3)
                if [[ -n "$existing_http" ]]; then
                    echo "⚠️  HTTP client conflict detected:"
                    echo "$existing_http"
                    echo "💡 Multiple HTTP clients may be redundant"
                fi
            fi
            ;;
            
        # Testing conflicts
        "jest"|"vitest"|"ava")
            if [[ -f "package.json" ]]; then
                existing_test=$(grep -E "(jest|vitest|ava)" package.json | head -3)
                if [[ -n "$existing_test" ]]; then
                    echo "⚠️  Testing framework conflict detected:"
                    echo "$existing_test"
                    echo "💡 Multiple testing frameworks may cause conflicts"
                fi
            fi
            ;;
    esac
}

# Function to suggest alternatives
suggest_alternatives() {
    local package_name="$1"
    
    case "$package_name" in
        "lodash")
            echo "💡 Alternative: Consider individual lodash functions (e.g., lodash.debounce) to reduce bundle size"
            ;;
        "moment")
            echo "💡 Alternative: Consider date-fns or dayjs for smaller bundle size"
            ;;
        "request")
            echo "💡 Alternative: 'request' is deprecated. Use axios, node-fetch, or built-in fetch"
            ;;
        "tslint")
            echo "💡 Alternative: TSLint is deprecated. Use ESLint with TypeScript support"
            ;;
    esac
}

# Function to check bundle impact
check_bundle_impact() {
    local package_name="$1"
    
    # Known heavy packages
    case "$package_name" in
        "lodash"|"moment"|"rxjs"|"antd")
            echo "⚠️  Bundle size warning: '$package_name' is a large package"
            echo "💡 Consider tree-shaking or lighter alternatives"
            ;;
    esac
}

# Main logic - intercept npm install commands
if [[ "$CLAUDE_TOOL_NAME" == "Bash" ]]; then
    command_args="$CLAUDE_TOOL_ARGS_command"
    
    if [[ "$command_args" == *"npm install"* ]] || [[ "$command_args" == *"npm i "* ]]; then
        # Extract package name from command
        package_name=""
        install_type="dependency"
        
        if [[ "$command_args" == *"--save-dev"* ]] || [[ "$command_args" == *"-D"* ]]; then
            install_type="devDependency"
        fi
        
        # Parse package name
        if [[ "$command_args" =~ npm[[:space:]]+(install|i)[[:space:]]+([^[:space:]]+) ]]; then
            package_name="${BASH_REMATCH[2]}"
            # Remove flags
            package_name=$(echo "$package_name" | sed 's/--[^[:space:]]*//' | sed 's/-[^[:space:]]*//' | awk '{print $1}')
        fi
        
        if [[ -n "$package_name" && "$package_name" != "--save-dev" && "$package_name" != "-D" ]]; then
            echo "📦 Analyzing dependency installation: $package_name"
            
            # Document the installation attempt
            document_dependency "$package_name" "$install_type"
            
            # Check for existing dependencies
            if check_existing_dependencies "$package_name"; then
                echo ""
                echo "❓ Do you want to continue with this installation?"
                echo "   The package may already exist or conflict with existing dependencies."
                echo ""
            fi
            
            # Suggest alternatives if applicable
            suggest_alternatives "$package_name"
            
            # Check bundle impact
            check_bundle_impact "$package_name"
            
            # Update dependency summary
            update_dependency_summary "$package_name" "$install_type"
        fi
    fi
fi

# Function to update dependency summary
update_dependency_summary() {
    local package_name="$1"
    local install_type="$2"
    local summary_file=".claude/rules/current-dependencies.md"
    
    mkdir -p .claude/rules
    
    # Regenerate current dependencies list
    cat > "$summary_file" << 'EOF'
# Current Dependencies Summary

Auto-generated summary of project dependencies.

EOF
    
    if [[ -f "package.json" ]]; then
        echo "## Production Dependencies" >> "$summary_file"
        echo "" >> "$summary_file"
        if command -v jq >/dev/null 2>&1; then
            jq -r '.dependencies | keys[]' package.json 2>/dev/null | while read dep; do
                echo "- \`$dep\`" >> "$summary_file"
            done
        else
            grep -A 20 '"dependencies"' package.json | grep '"' | sed 's/.*"\([^"]*\)".*/- `\1`/' >> "$summary_file" 2>/dev/null || echo "- Run with jq for better parsing" >> "$summary_file"
        fi
        
        echo "" >> "$summary_file"
        echo "## Development Dependencies" >> "$summary_file"
        echo "" >> "$summary_file"
        if command -v jq >/dev/null 2>&1; then
            jq -r '.devDependencies | keys[]' package.json 2>/dev/null | while read dep; do
                echo "- \`$dep\`" >> "$summary_file"
            done
        else
            grep -A 20 '"devDependencies"' package.json | grep '"' | sed 's/.*"\([^"]*\)".*/- `\1`/' >> "$summary_file" 2>/dev/null || echo "- Run with jq for better parsing" >> "$summary_file"
        fi
    fi
    
    echo "" >> "$summary_file"
    echo "---" >> "$summary_file"
    echo "*Updated: $(date)*" >> "$summary_file"
}