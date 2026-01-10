#!/bin/bash
# Git discipline hook - Auto-add/commit after tasks with descriptive messages

# Function to generate descriptive commit message
generate_commit_message() {
    local tool_name="$1"
    local file_path="$2"
    local timestamp=$(date +"%Y-%m-%d %H:%M")
    
    case "$tool_name" in
        "Write")
            filename=$(basename "$file_path")
            extension="${filename##*.}"
            case "$extension" in
                tsx|jsx) echo "feat: add React component $filename" ;;
                ts) 
                    if [[ "$filename" == *"[Ss]ervice"* ]]; then
                        echo "feat: add service module $filename"
                    elif [[ "$filename" == *"[Tt]ype"* ]]; then
                        echo "feat: add type definitions in $filename"
                    else
                        echo "feat: add TypeScript module $filename"
                    fi
                    ;;
                css|scss) echo "style: add stylesheet $filename" ;;
                md) echo "docs: add documentation $filename" ;;
                json) echo "config: add configuration $filename" ;;
                *) echo "feat: add new file $filename" ;;
            esac
            ;;
        "Edit"|"MultiEdit")
            filename=$(basename "$file_path")
            echo "refactor: update $filename"
            ;;
        "Bash")
            command_args="$CLAUDE_TOOL_ARGS_command"
            if [[ "$command_args" == *"npm install"* ]]; then
                package=$(echo "$command_args" | sed 's/.*npm install[[:space:]]*//' | awk '{print $1}')
                echo "deps: install $package dependency"
            elif [[ "$command_args" == *"mkdir"* ]]; then
                dir=$(echo "$command_args" | sed 's/.*mkdir[[:space:]]*[-p]*[[:space:]]*//' | awk '{print $1}')
                echo "structure: create directory $dir"
            elif [[ "$command_args" == *"npm run build"* ]]; then
                echo "build: run production build"
            else
                echo "chore: run command - $(echo "$command_args" | cut -c1-50)"
            fi
            ;;
        *)
            echo "chore: Claude Code task completion - $timestamp"
            ;;
    esac
}

# Function to check if we should commit
should_commit() {
    # Check if there are any changes to commit
    if ! git diff --quiet 2>/dev/null; then
        return 0  # Unstaged changes
    fi
    
    if ! git diff --cached --quiet 2>/dev/null; then
        return 0  # Staged changes
    fi
    
    # Check for untracked files that aren't in .gitignore
    untracked=$(git ls-files --others --exclude-standard 2>/dev/null)
    if [[ -n "$untracked" ]]; then
        return 0  # Untracked files
    fi
    
    return 1  # No changes
}

# Function to auto-commit changes
auto_commit() {
    local commit_message="$1"
    
    # Add all changes (staged and unstaged)
    git add . 2>/dev/null
    
    # Commit with generated message
    git commit -m "$commit_message

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>" 2>/dev/null
    
    if [[ $? -eq 0 ]]; then
        echo "✅ Auto-committed: $commit_message"
        
        # Log the commit for reference
        local log_file=".claude/rules/auto-commit-log.md"
        mkdir -p .claude/rules
        
        if [[ ! -f "$log_file" ]]; then
            echo "# Auto-Commit Log" > "$log_file"
            echo "" >> "$log_file"
            echo "This file tracks automatic commits made by Claude Code." >> "$log_file"
            echo "" >> "$log_file"
        fi
        
        echo "- $(date '+%Y-%m-%d %H:%M:%S'): $commit_message" >> "$log_file"
    else
        echo "⚠️  Commit failed or no changes to commit"
    fi
}

# Main logic - only commit after significant tool operations
case "$CLAUDE_TOOL_NAME" in
    "Write"|"Edit"|"MultiEdit")
        file_path=$(echo "$CLAUDE_TOOL_ARGS_file_path" | tr -d '"')
        
        # Wait a moment for file system to sync
        sleep 1
        
        if should_commit; then
            commit_message=$(generate_commit_message "$CLAUDE_TOOL_NAME" "$file_path")
            auto_commit "$commit_message"
        fi
        ;;
        
    "Bash")
        command_args="$CLAUDE_TOOL_ARGS_command"
        
        # Only commit for significant bash operations
        if [[ "$command_args" == *"npm install"* ]] || [[ "$command_args" == *"mkdir"* ]] || [[ "$command_args" == *"npm run build"* ]]; then
            sleep 1
            
            if should_commit; then
                commit_message=$(generate_commit_message "$CLAUDE_TOOL_NAME" "")
                auto_commit "$commit_message"
            fi
        fi
        ;;
esac