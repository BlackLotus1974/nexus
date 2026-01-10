#!/bin/bash
# Project structure rule - Helps Claude navigate & avoid duplication

# Create rules directory if it doesn't exist
mkdir -p .claude/rules

# Function to analyze project structure and suggest alternatives
analyze_project_structure() {
    local target_file="$1"
    local suggestions_file=".claude/rules/project-structure-guidance.md"
    local timestamp=$(date +"%Y-%m-%d %H:%M:%S")
    
    # Create guidance file if it doesn't exist
    if [[ ! -f "$suggestions_file" ]]; then
        cat > "$suggestions_file" << 'EOF'
# Project Structure Guidance

This file provides Claude with guidance on project structure, existing modules, and best practices for this codebase.

## Current Project Structure

EOF
        # Generate current structure
        echo '```' >> "$suggestions_file"
        if command -v tree >/dev/null 2>&1; then
            tree -I 'node_modules|.git|dist|build' . >> "$suggestions_file" 2>/dev/null || ls -la >> "$suggestions_file"
        else
            find . -type f -not -path '*/node_modules/*' -not -path '*/.git/*' -not -path '*/dist/*' -not -path '*/build/*' | head -50 >> "$suggestions_file"
        fi
        echo '```' >> "$suggestions_file"
        echo "" >> "$suggestions_file"
        echo "## Module Reuse Guidelines" >> "$suggestions_file"
        echo "" >> "$suggestions_file"
    fi
    
    # Check if creating duplicate functionality
    local filename=$(basename "$target_file")
    local extension="${filename##*.}"
    local basename_no_ext="${filename%.*}"
    
    echo "🔍 Analyzing project structure for: $target_file"
    
    # Check for existing similar files
    case "$extension" in
        tsx|jsx)
            # Check for existing React components
            existing_components=$(find . -name "*.tsx" -o -name "*.jsx" | grep -v node_modules | grep -v dist | grep -v build)
            if [[ -n "$existing_components" ]]; then
                echo "📦 Existing React components found:"
                echo "$existing_components" | head -10
                
                # Check for similar component names
                similar=$(echo "$existing_components" | grep -i "$basename_no_ext" | head -3)
                if [[ -n "$similar" ]]; then
                    echo "⚠️  Warning: Similar component names found:"
                    echo "$similar"
                    echo "Consider reusing or extending existing components instead of creating new ones."
                    
                    # Log this pattern
                    echo "" >> "$suggestions_file"
                    echo "## Duplication Warning: $timestamp" >> "$suggestions_file"
                    echo "Attempted to create: $target_file" >> "$suggestions_file"
                    echo "Similar existing components:" >> "$suggestions_file"
                    echo "$similar" >> "$suggestions_file"
                    echo "**Recommendation**: Check if existing components can be reused or extended." >> "$suggestions_file"
                    echo "" >> "$suggestions_file"
                fi
            fi
            
            # Suggest proper component location
            if [[ "$target_file" != *"/components/"* ]] && [[ -d "src/components" || -d "components" ]]; then
                echo "📁 Suggestion: Place React components in the components/ directory"
                echo "   Consider: src/components/$filename or components/$filename"
            fi
            ;;
            
        ts)
            # Check for existing services/utilities
            if [[ "$basename_no_ext" == *"Service"* ]] || [[ "$basename_no_ext" == *"service"* ]]; then
                existing_services=$(find . -name "*[Ss]ervice*.ts" | grep -v node_modules | grep -v dist)
                if [[ -n "$existing_services" ]]; then
                    echo "🔧 Existing services found:"
                    echo "$existing_services"
                fi
                
                if [[ "$target_file" != *"/services/"* ]] && [[ -d "src/services" || -d "services" ]]; then
                    echo "📁 Suggestion: Place services in the services/ directory"
                fi
            fi
            
            if [[ "$basename_no_ext" == *"Type"* ]] || [[ "$basename_no_ext" == *"type"* ]] || [[ "$target_file" == *"types"* ]]; then
                # Check for existing type definitions
                existing_types=$(find . -name "*[Tt]ype*.ts" -o -name "types.ts" | grep -v node_modules)
                if [[ -n "$existing_types" ]]; then
                    echo "📋 Existing type files found:"
                    echo "$existing_types"
                    echo "💡 Consider adding to existing type files instead of creating new ones"
                fi
            fi
            ;;
    esac
    
    # Check project conventions
    analyze_naming_conventions "$target_file"
    suggest_module_reuse "$target_file"
}

# Function to analyze naming conventions
analyze_naming_conventions() {
    local target_file="$1"
    local dir=$(dirname "$target_file")
    
    # Check existing files in the same directory for naming patterns
    if [[ -d "$dir" ]]; then
        existing_files=$(ls "$dir" 2>/dev/null | grep -E '\.(ts|tsx|js|jsx)$' | head -5)
        if [[ -n "$existing_files" ]]; then
            echo "📝 Existing files in $dir:"
            echo "$existing_files"
            
            # Check naming pattern (camelCase vs PascalCase vs kebab-case)
            pascal_count=$(echo "$existing_files" | grep -c '^[A-Z]' || echo "0")
            camel_count=$(echo "$existing_files" | grep -c '^[a-z]' || echo "0")
            kebab_count=$(echo "$existing_files" | grep -c '-' || echo "0")
            
            if [[ "$pascal_count" -gt "$camel_count" ]] && [[ "$pascal_count" -gt "$kebab_count" ]]; then
                echo "📏 Directory uses PascalCase naming convention"
            elif [[ "$kebab_count" -gt 0 ]]; then
                echo "📏 Directory uses kebab-case naming convention"
            else
                echo "📏 Directory uses camelCase naming convention"
            fi
        fi
    fi
}

# Function to suggest module reuse
suggest_module_reuse() {
    local target_file="$1"
    local filename=$(basename "$target_file")
    
    # Check for existing utility functions that might be reusable
    if [[ "$filename" == *"util"* ]] || [[ "$filename" == *"helper"* ]]; then
        existing_utils=$(find . -name "*[Uu]til*" -o -name "*[Hh]elper*" | grep -v node_modules | head -5)
        if [[ -n "$existing_utils" ]]; then
            echo "🛠️  Existing utility files found:"
            echo "$existing_utils"
            echo "💡 Consider extending existing utilities instead of creating new ones"
        fi
    fi
    
    # Check for existing constants files
    if [[ "$filename" == *"constant"* ]] || [[ "$filename" == *"config"* ]]; then
        existing_constants=$(find . -name "*[Cc]onstant*" -o -name "*[Cc]onfig*" | grep -v node_modules | head -5)
        if [[ -n "$existing_constants" ]]; then
            echo "📊 Existing constant/config files found:"
            echo "$existing_constants"
            echo "💡 Consider adding to existing constant files"
        fi
    fi
}

# Main logic - only run for Write operations creating new files
if [[ "$CLAUDE_TOOL_NAME" == "Write" ]]; then
    file_path=$(echo "$CLAUDE_TOOL_ARGS_file_path" | tr -d '"')
    
    if [[ -n "$file_path" ]]; then
        # Only analyze if the file doesn't exist (new file creation)
        if [[ ! -f "$file_path" ]]; then
            analyze_project_structure "$file_path"
        fi
    fi
fi