#!/bin/bash
# Type Validation Hook for Student Dome
# Validates TypeScript consistency after type or schema changes
# Ensures type safety across the application

# Enable strict error handling
set -euo pipefail

# Configuration
LOG_FILE=".claude/logs/type-validation.log"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

# Create log file if it doesn't exist
mkdir -p "$(dirname "$LOG_FILE")"
touch "$LOG_FILE"

# Function to log messages
log() {
    echo "[$TIMESTAMP] $1" >> "$LOG_FILE"
    echo "$1"
}

# Function to run TypeScript type checking
run_type_check() {
    log "TYPE VALIDATION: Running TypeScript type check..."
    
    # Run tsc in noEmit mode to only check types
    if npx tsc --noEmit > ".claude/logs/tsc-output.log" 2>&1; then
        log "TYPE VALIDATION: ✅ Type check passed"
        echo "✅ TypeScript type validation passed"
        return 0
    else
        local error_count
        error_count=$(grep -c "error TS" ".claude/logs/tsc-output.log" 2>/dev/null || echo "0")
        
        log "TYPE VALIDATION: ❌ Type check failed with $error_count errors"
        echo ""
        echo "❌ TypeScript type validation failed!"
        echo "Found $error_count type errors"
        echo ""
        
        # Show first few errors
        echo "First few errors:"
        head -10 ".claude/logs/tsc-output.log" | grep "error TS" || echo "See .claude/logs/tsc-output.log for details"
        echo ""
        echo "Full error details in: .claude/logs/tsc-output.log"
        
        return 1
    fi
}

# Function to validate interface consistency
validate_interfaces() {
    log "TYPE VALIDATION: Validating interface consistency..."
    
    # Check for common interface issues
    local issues_found=false
    
    # Check if UserInput interface matches constants
    if [[ -f "types.ts" ]] && [[ -f "constants.ts" ]]; then
        # Check if INCIDENT_TYPES are properly typed
        if grep -q "incidentType.*string" types.ts && grep -q "INCIDENT_TYPES" constants.ts; then
            log "TYPE VALIDATION: UserInput interface and constants appear consistent"
        else
            log "TYPE VALIDATION: ⚠️  Potential inconsistency between types.ts and constants.ts"
            echo "⚠️  Check consistency between UserInput.incidentType and INCIDENT_TYPES"
            issues_found=true
        fi
    fi
    
    # Check for unused exports in types.ts
    if [[ -f "types.ts" ]]; then
        local exported_interfaces
        exported_interfaces=$(grep "^export interface" types.ts | cut -d' ' -f3 || echo "")
        
        for interface in $exported_interfaces; do
            # Count usage across TypeScript files
            local usage_count
            usage_count=$(find . -name "*.ts" -o -name "*.tsx" | xargs grep -l "$interface" | wc -l)
            
            if [[ $usage_count -le 1 ]]; then
                log "TYPE VALIDATION: ⚠️  Interface '$interface' may be unused"
                echo "ℹ️  Interface '$interface' appears to have limited usage"
            fi
        done
    fi
    
    if [[ "$issues_found" == true ]]; then
        return 1
    else
        log "TYPE VALIDATION: Interface validation completed"
        return 0
    fi
}

# Function to check for missing type annotations
check_type_annotations() {
    log "TYPE VALIDATION: Checking for missing type annotations..."
    
    local files_to_check
    files_to_check=$(find . -name "*.ts" -o -name "*.tsx" | grep -v node_modules | head -20)
    
    local missing_annotations=()
    
    for file in $files_to_check; do
        # Check for functions without return types (simple heuristic)
        if grep -n "function.*(" "$file" | grep -v ": " | grep -v "=>" > /dev/null 2>&1; then
            missing_annotations+=("$file: Functions may be missing return type annotations")
        fi
        
        # Check for arrow functions without explicit types
        if grep -n "const.*=" "$file" | grep "=>" | grep -v ": " > /dev/null 2>&1; then
            missing_annotations+=("$file: Arrow functions may be missing type annotations")
        fi
    done
    
    if [[ ${#missing_annotations[@]} -gt 0 ]]; then
        log "TYPE VALIDATION: ⚠️  Potential missing type annotations found"
        for annotation in "${missing_annotations[@]}"; do
            echo "ℹ️  $annotation"
        done
        return 1
    else
        log "TYPE VALIDATION: Type annotation check passed"
        return 0
    fi
}

log "TYPE VALIDATION: Starting for tool $CLAUDE_TOOL_NAME"

# Check if this hook should run
case "$CLAUDE_TOOL_NAME" in
    "Edit"|"MultiEdit"|"Write")
        FILE_PATH="${CLAUDE_TOOL_ARGS_file_path:-}"
        
        # Run for TypeScript files and type-related files
        if [[ "$FILE_PATH" =~ \.(ts|tsx)$ ]] || [[ "$FILE_PATH" =~ (types\.ts|constants\.ts)$ ]]; then
            log "TYPE VALIDATION: Triggered by change to $FILE_PATH"
            
            # Wait for file system to sync
            sleep 1
            
            # Run type check
            type_check_passed=true
            if ! run_type_check; then
                type_check_passed=false
            fi
            
            # For critical type files, run additional validations
            if [[ "$FILE_PATH" =~ (types\.ts|constants\.ts)$ ]]; then
                log "TYPE VALIDATION: Running additional validation for core type file"
                
                if ! validate_interfaces; then
                    echo "⚠️  Interface consistency issues detected"
                fi
                
                if ! check_type_annotations; then
                    echo "ℹ️  Consider adding explicit type annotations"
                fi
            fi
            
            # If type check failed, this is serious
            if [[ "$type_check_passed" == false ]]; then
                log "TYPE VALIDATION: CRITICAL - Type check failed"
                echo ""
                echo "🔴 CRITICAL: TypeScript compilation errors detected"
                echo "Please fix type errors before proceeding"
                # Don't exit 1 here as it would block the operation
                # Instead, let the build-validation hook handle blocking if needed
            fi
            
        else
            log "TYPE VALIDATION: Skipped for non-TypeScript file: $FILE_PATH"
        fi
        ;;
        
    *)
        log "TYPE VALIDATION: Skipped for tool: $CLAUDE_TOOL_NAME"
        ;;
esac

log "TYPE VALIDATION: Hook completed"
exit 0