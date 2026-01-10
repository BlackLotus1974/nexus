#!/bin/bash
# Project structure rule - Updates structure map when significant changes occur

# Function to check if structure analysis needs updating
needs_structure_update() {
    local analysis_file=".claude/rules/project-structure-map.md"
    
    # Update if analysis file doesn't exist
    if [[ ! -f "$analysis_file" ]]; then
        return 0
    fi
    
    # Update if analysis is older than 24 hours
    if [[ $(find "$analysis_file" -mtime +1 2>/dev/null) ]]; then
        return 0
    fi
    
    # Update if new directories were created
    if [[ "$CLAUDE_TOOL_NAME" == "Write" ]]; then
        file_path=$(echo "$CLAUDE_TOOL_ARGS_file_path" | tr -d '"')
        if [[ -n "$file_path" ]]; then
            dir_path=$(dirname "$file_path")
            # Check if this is a new directory structure
            if [[ ! -f "$analysis_file" ]] || ! grep -q "$dir_path" "$analysis_file" 2>/dev/null; then
                return 0
            fi
        fi
    fi
    
    return 1
}

# Function to record structural changes
record_structural_change() {
    local changes_file=".claude/rules/recent-structure-changes.md"
    local timestamp=$(date +"%Y-%m-%d %H:%M:%S")
    local change_description="$1"
    
    # Create changes file if it doesn't exist
    if [[ ! -f "$changes_file" ]]; then
        cat > "$changes_file" << 'EOF'
# Recent Structure Changes

This file tracks recent structural changes to help Claude understand project evolution.

---

EOF
    fi
    
    # Add the change (keep only last 20 entries)
    {
        echo ""
        echo "## $timestamp"
        echo "$change_description"
        echo ""
        echo "---"
        tail -n 100 "$changes_file" 2>/dev/null
    } > "${changes_file}.tmp" && mv "${changes_file}.tmp" "$changes_file"
}

# Main logic
if [[ "$CLAUDE_TOOL_NAME" == "Write" ]]; then
    file_path=$(echo "$CLAUDE_TOOL_ARGS_file_path" | tr -d '"')
    
    if [[ -n "$file_path" && ! -f "$file_path" ]]; then
        # New file created
        extension="${file_path##*.}"
        filename=$(basename "$file_path")
        dir_path=$(dirname "$file_path")
        
        case "$extension" in
            tsx|jsx)
                record_structural_change "**New React Component**: Created \`$file_path\`
- Location: \`$dir_path\`
- Type: React Component
- Consider: Does this duplicate existing functionality?"
                ;;
            ts)
                if [[ "$filename" == *"[Ss]ervice"* ]]; then
                    record_structural_change "**New Service**: Created \`$file_path\`
- Location: \`$dir_path\`
- Type: Service Module
- Consider: Can existing services be extended instead?"
                elif [[ "$filename" == *"[Tt]ype"* ]] || [[ "$filename" == "types.ts" ]]; then
                    record_structural_change "**New Type Definition**: Created \`$file_path\`
- Location: \`$dir_path\`
- Type: Type Definitions
- Consider: Can types be added to existing type files?"
                else
                    record_structural_change "**New TypeScript Module**: Created \`$file_path\`
- Location: \`$dir_path\`
- Type: General Module"
                fi
                ;;
            css|scss|module.css)
                record_structural_change "**New Stylesheet**: Created \`$file_path\`
- Location: \`$dir_path\`
- Type: Styling
- Consider: CSS modules vs global styles consistency"
                ;;
        esac
        
        # Check if we need to update the structure analysis
        if needs_structure_update; then
            echo "🔄 Updating project structure analysis..."
            bash .claude/hooks/analyze-structure.sh 2>/dev/null || true
        fi
    fi
fi

# Also run for directory creation via Bash mkdir
if [[ "$CLAUDE_TOOL_NAME" == "Bash" ]]; then
    command_args="$CLAUDE_TOOL_ARGS_command"
    
    if [[ "$command_args" == *"mkdir"* ]]; then
        # Extract directory name from mkdir command
        new_dir=$(echo "$command_args" | sed 's/.*mkdir[[:space:]]*[-p]*[[:space:]]*//' | awk '{print $1}')
        if [[ -n "$new_dir" ]]; then
            record_structural_change "**New Directory**: Created \`$new_dir\`
- Type: Directory Structure
- Consider: Does this follow project organization patterns?"
            
            # Update structure analysis for new directories
            if needs_structure_update; then
                echo "🔄 Updating project structure analysis for new directory..."
                bash .claude/hooks/analyze-structure.sh 2>/dev/null || true
            fi
        fi
    fi
fi