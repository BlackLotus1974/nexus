#!/bin/bash
# Project structure analyzer - Creates comprehensive project map

# Create rules directory if it doesn't exist
mkdir -p .claude/rules

# Function to generate project structure analysis
generate_structure_analysis() {
    local analysis_file=".claude/rules/project-structure-map.md"
    local timestamp=$(date +"%Y-%m-%d %H:%M:%S")
    
    cat > "$analysis_file" << EOF
# Project Structure Map

Generated: $timestamp

This file helps Claude understand the current project structure and module organization.

## Directory Structure

\`\`\`
EOF
    
    # Generate directory tree
    if command -v tree >/dev/null 2>&1; then
        tree -I 'node_modules|.git|dist|build|.next|coverage' -L 3 . >> "$analysis_file" 2>/dev/null
    else
        # Fallback for Windows without tree
        find . -type d -not -path '*/node_modules/*' -not -path '*/.git/*' -not -path '*/dist/*' -not -path '*/build/*' -not -path '*/.next/*' | head -30 | sort >> "$analysis_file"
    fi
    
    cat >> "$analysis_file" << 'EOF'
```

## Component Organization

EOF
    
    # Analyze React components
    echo "### React Components" >> "$analysis_file"
    find . -name "*.tsx" -o -name "*.jsx" | grep -v node_modules | sort | while read -r file; do
        # Extract component name and location
        component_name=$(grep -m1 "export.*function\|export.*const.*=" "$file" 2>/dev/null | head -1)
        if [[ -n "$component_name" ]]; then
            echo "- \`$file\`: $(echo "$component_name" | sed 's/export//' | sed 's/function//' | sed 's/const//' | sed 's/=//' | awk '{print $1}')" >> "$analysis_file"
        else
            echo "- \`$file\`" >> "$analysis_file"
        fi
    done
    
    echo "" >> "$analysis_file"
    echo "### Services & Utilities" >> "$analysis_file"
    find . -name "*.ts" | grep -v node_modules | grep -v ".d.ts" | sort | while read -r file; do
        if [[ "$file" == *"service"* ]] || [[ "$file" == *"util"* ]] || [[ "$file" == *"helper"* ]]; then
            echo "- \`$file\`" >> "$analysis_file"
        fi
    done
    
    echo "" >> "$analysis_file"
    echo "### Type Definitions" >> "$analysis_file"
    find . -name "types.ts" -o -name "*Type*.ts" -o -name "*.d.ts" | grep -v node_modules | sort | while read -r file; do
        echo "- \`$file\`" >> "$analysis_file"
    done
    
    cat >> "$analysis_file" << 'EOF'

## Module Reuse Guidelines

### Before Creating New Files:
1. **Check existing components** - Look for similar functionality
2. **Follow naming conventions** - Match the pattern used in each directory
3. **Use appropriate directories** - Place files in logical locations
4. **Extend existing modules** - Add to existing files when appropriate

### Preferred Locations:
- **React Components**: `src/components/` or `components/`
- **Services**: `src/services/` or `services/`
- **Types**: `src/types/` or add to existing `types.ts`
- **Utilities**: `src/utils/` or `src/lib/`
- **Constants**: `src/constants/` or add to existing constants file

### Naming Conventions:
EOF
    
    # Analyze naming patterns
    echo "- **Components**: " >> "$analysis_file"
    component_files=$(find . -name "*.tsx" -o -name "*.jsx" | grep -v node_modules | head -5)
    if [[ -n "$component_files" ]]; then
        first_component=$(echo "$component_files" | head -1 | xargs basename)
        if [[ "$first_component" =~ ^[A-Z] ]]; then
            echo "PascalCase (e.g., \`UserProfile.tsx\`)" >> "$analysis_file"
        else
            echo "camelCase (e.g., \`userProfile.tsx\`)" >> "$analysis_file"
        fi
    else
        echo "Not determined yet" >> "$analysis_file"
    fi
    
    echo "- **Services**: " >> "$analysis_file"
    service_files=$(find . -name "*[Ss]ervice*.ts" | grep -v node_modules | head -3)
    if [[ -n "$service_files" ]]; then
        echo "Use 'Service' suffix (e.g., \`userService.ts\`)" >> "$analysis_file"
    else
        echo "Not determined yet" >> "$analysis_file"
    fi
    
    cat >> "$analysis_file" << 'EOF'

## Anti-Patterns to Avoid:
- Creating duplicate components with similar functionality
- Placing files in random directories without considering existing structure
- Ignoring established naming conventions
- Creating new utility files when existing ones could be extended

EOF
    
    # Add package.json analysis if it exists
    if [[ -f "package.json" ]]; then
        echo "## Dependencies & Scripts" >> "$analysis_file"
        echo "" >> "$analysis_file"
        echo "### Available Scripts:" >> "$analysis_file"
        if command -v npm >/dev/null 2>&1; then
            npm run 2>/dev/null | grep -A 20 "available via" | tail -n +2 >> "$analysis_file" || echo "- Run \`npm run\` to see available scripts" >> "$analysis_file"
        fi
        
        echo "" >> "$analysis_file"
        echo "### Key Dependencies:" >> "$analysis_file"
        grep -A 10 '"dependencies"' package.json | grep -E '"[^"]+":' | head -10 | sed 's/^[[:space:]]*/- /' >> "$analysis_file" 2>/dev/null || echo "- Check package.json for dependencies" >> "$analysis_file"
    fi
    
    echo "" >> "$analysis_file"
    echo "---" >> "$analysis_file"
    echo "*This analysis is automatically updated by Claude Code hooks*" >> "$analysis_file"
}

# Run the analysis
generate_structure_analysis

echo "📊 Project structure analysis completed: .claude/rules/project-structure-map.md"