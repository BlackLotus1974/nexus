#!/bin/bash

# Debugging Documentation Hook
# Triggers: Always when debugging issues occur
# Purpose: Systematic documentation of problem-solving processes

# Hook metadata
echo "=== Debugging Documentation Hook Triggered ==="
echo "Timestamp: $(date -Iseconds)"
echo "Session ID: ${RANDOM}_$(date +%s)"

# Create debugging log file if it doesn't exist
DEBUGGING_LOG="debugging_log.jsonl"

if [ ! -f "$DEBUGGING_LOG" ]; then
    echo "Creating debugging log file: $DEBUGGING_LOG"
    touch "$DEBUGGING_LOG"
fi

# Function to prompt for debugging documentation
prompt_debugging_documentation() {
    local session_id="${RANDOM}_$(date +%s)"
    local timestamp=$(date -Iseconds)
    
    echo ""
    echo "🐛 DEBUGGING DOCUMENTATION REQUIRED"
    echo "=================================="
    echo ""
    echo "Please document your debugging process for knowledge base improvement."
    echo "This helps create a comprehensive debugging reference for the Sensemaker codebase."
    echo ""
    
    # Check if this is a common Sensemaker pattern
    echo "Common Sensemaker debugging scenarios:"
    echo "  1. React/Electron integration issues"
    echo "  2. Supabase authentication problems"
    echo "  3. ReactFlow mind map rendering issues"
    echo "  4. Real-time collaboration sync problems"
    echo "  5. File save/load IPC communication issues"
    echo "  6. Custom node component problems"
    echo "  7. Tab state management issues"
    echo "  8. Performance optimization challenges"
    echo ""
    
    # Prompt for basic problem information
    echo "Enter problem details (press Enter twice to finish each section):"
    echo ""
    
    echo "Problem Title (brief description):"
    read -r problem_title
    
    echo "Problem Description (detailed context):"
    read -r problem_description
    
    echo "Error Messages (exact messages, comma-separated):"
    read -r error_messages
    
    echo "Context (where/when occurred):"
    read -r problem_context
    
    echo "Severity (low/medium/high/critical):"
    read -r severity
    
    echo "Solution Status (successful/failed/partial):"
    read -r solution_status
    
    echo "Solution Description:"
    read -r solution_description
    
    echo "Code Changes Made (files modified, comma-separated):"
    read -r code_changes
    
    echo "Time Invested (minutes):"
    read -r time_invested
    
    echo "Initial Hypothesis:"
    read -r initial_hypothesis
    
    echo "Investigation Steps (comma-separated):"
    read -r investigation_steps
    
    echo "What Worked:"
    read -r what_worked
    
    echo "What Didn't Work:"
    read -r what_didnt_work
    
    echo "Key Insight/Breakthrough:"
    read -r breakthrough_moment
    
    echo "Tags (comma-separated, e.g., supabase, reactflow, electron):"
    read -r tags
    
    echo "Difficulty Level (1-5):"
    read -r difficulty_level
    
    echo "Tools Used (comma-separated):"
    read -r tools_used
    
    # Create JSON log entry
    cat >> "$DEBUGGING_LOG" << EOF
{"timestamp": "$timestamp", "session_id": "$session_id", "problem": {"title": "$problem_title", "description": "$problem_description", "error_messages": ["$error_messages"], "context": "$problem_context", "severity": "$severity"}, "solution": {"status": "$solution_status", "description": "$solution_description", "code_changes": ["$code_changes"], "time_invested": "$time_invested", "approach": "systematic"}, "thinking_process": {"initial_hypothesis": "$initial_hypothesis", "investigation_steps": ["$investigation_steps"], "dead_ends": [], "breakthrough_moment": "$breakthrough_moment", "alternative_approaches": []}, "lessons_learned": {"what_worked": "$what_worked", "what_didnt_work": "$what_didnt_work", "time_wasters": [], "efficiency_tips": [], "prevention": ""}, "tags": ["$tags"], "difficulty_level": "$difficulty_level", "tools_used": ["$tools_used"]}
EOF
    
    echo ""
    echo "✅ Debugging documentation logged to $DEBUGGING_LOG"
    echo "📊 Total debugging sessions logged: $(wc -l < "$DEBUGGING_LOG")"
    echo ""
    
    # Show recent patterns
    if [ -f "$DEBUGGING_LOG" ] && [ -s "$DEBUGGING_LOG" ]; then
        echo "Recent debugging patterns:"
        echo "========================="
        tail -3 "$DEBUGGING_LOG" | jq -r '.problem.title + " (" + .solution.status + ")"' 2>/dev/null || echo "Install jq for better log analysis"
        echo ""
    fi
    
    # Suggest reviewing similar issues
    echo "💡 TIP: Before next debugging session, check $DEBUGGING_LOG for similar problems"
    echo "💡 TIP: Use 'grep -i \"keyword\" $DEBUGGING_LOG' to find related issues"
    echo ""
}

# Function to check for debugging context
check_debugging_context() {
    # Check if we're in a debugging scenario
    if [[ "$*" == *"error"* ]] || [[ "$*" == *"debug"* ]] || [[ "$*" == *"fix"* ]] || [[ "$*" == *"bug"* ]]; then
        return 0
    fi
    
    # Check recent git commits for debugging indicators
    if git log --oneline -5 2>/dev/null | grep -iq -E "(fix|bug|debug|error|issue)"; then
        return 0
    fi
    
    # Check for common debugging file patterns
    if find . -name "*.log" -o -name "debug*" -o -name "*error*" 2>/dev/null | head -1 | grep -q .; then
        return 0
    fi
    
    return 1
}

# Function to show debugging tips for Sensemaker
show_sensemaker_debugging_tips() {
    echo ""
    echo "🔍 SENSEMAKER-SPECIFIC DEBUGGING TIPS"
    echo "====================================="
    echo ""
    echo "Common Issue Categories:"
    echo "  • Electron IPC: Check main.js and preload.js for communication issues"
    echo "  • Supabase Auth: Verify redirect URLs and session handling"
    echo "  • ReactFlow: Check node/edge state management and custom node rendering"
    echo "  • Real-time Sync: Debug WebSocket connections and subscription cleanup"
    echo "  • File Operations: Test .mmap file format and cross-platform compatibility"
    echo "  • Tab Management: Verify tab-specific state isolation"
    echo ""
    echo "Quick Debugging Commands:"
    echo "  • Check Electron console: Ctrl+Shift+I in Electron app"
    echo "  • Monitor Supabase: Check Supabase dashboard for auth/database errors"
    echo "  • ReactFlow debug: Add console.logs to CustomNode component"
    echo "  • Memory usage: Use built-in memory monitoring in app"
    echo ""
    echo "Debugging Log Analysis:"
    echo "  • View all logs: cat debugging_log.jsonl | jq ."
    echo "  • Filter by tag: grep '\"supabase\"' debugging_log.jsonl"
    echo "  • Count by severity: grep -c '\"high\"' debugging_log.jsonl"
    echo ""
}

# Main execution
main() {
    # Always show debugging tips for context
    show_sensemaker_debugging_tips
    
    # Check if we should prompt for documentation
    if check_debugging_context "$@"; then
        echo "🚨 Debugging context detected. Documentation recommended."
        echo ""
        read -p "Document this debugging session? (y/N): " -n 1 -r
        echo ""
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            prompt_debugging_documentation
        else
            echo "Skipped documentation. Remember to log manually if issue persists."
        fi
    else
        echo "ℹ️  No immediate debugging context detected."
        echo "💡 Use this hook manually when debugging: bash .claude/hooks/debugging-documentation.sh"
    fi
    
    # Show existing log stats
    if [ -f "$DEBUGGING_LOG" ] && [ -s "$DEBUGGING_LOG" ]; then
        echo ""
        echo "📈 DEBUGGING LOG STATISTICS"
        echo "=========================="
        echo "Total sessions: $(wc -l < "$DEBUGGING_LOG")"
        echo "Recent activity: $(tail -1 "$DEBUGGING_LOG" | jq -r '.timestamp' 2>/dev/null || echo "Unknown")"
        echo ""
    fi
}

# Run main function with all arguments
main "$@"

echo "=== Debugging Documentation Hook Complete ==="