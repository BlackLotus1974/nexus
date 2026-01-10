#!/bin/bash
# .claude/hooks/phase-completion.sh
# ---
# name: phase-completion
# description: Tracks Student Dome implementation phase completion
# events: ["after:task:*", "after:bash:supabase*"]
# ---

echo "📊 Checking phase completion..."

# Update implementation status
if [ -f "IMPLEMENTATION_STATUS.md" ]; then
    # Check Phase 1: Core Database
    if [ -f "supabase/migrations/001_initial_schema.sql" ]; then
        sed -i 's/Phase 1: Core Database ❌/Phase 1: Core Database ✅/' IMPLEMENTATION_STATUS.md
    fi
    
    # Check Phase 2: Authentication
    if grep -q "auth.signInWithPassword" components/*.tsx 2>/dev/null; then
        sed -i 's/Phase 2: Authentication ❌/Phase 2: Authentication ✅/' IMPLEMENTATION_STATUS.md
    fi
    
    # Check Phase 3: Edge Functions
    if [ -d "supabase/functions/submit-incident" ]; then
        sed -i 's/Phase 3: First Edge Function ❌/Phase 3: First Edge Function ✅/' IMPLEMENTATION_STATUS.md
    fi
    
    # Check Phase 4: AI Integration
    if [ -d "supabase/functions/analyze-incident" ]; then
        sed -i 's/Phase 4: AI Integration ❌/Phase 4: AI Integration ✅/' IMPLEMENTATION_STATUS.md
    fi
    
    # Check Phase 5: Admin Portal
    if [ -f "pages/admin/index.tsx" ] || [ -f "app/admin/page.tsx" ]; then
        sed -i 's/Phase 5: Admin Portal ❌/Phase 5: Admin Portal ✅/' IMPLEMENTATION_STATUS.md
    fi
    
    echo "✅ Phase status updated"
else
    echo "⚠️  IMPLEMENTATION_STATUS.md not found - creating it..."
    cat > IMPLEMENTATION_STATUS.md << 'EOF'
# Student Dome Implementation Status

## Phase Completion Tracker

- Phase 1: Core Database ❌
- Phase 2: Authentication ❌  
- Phase 3: First Edge Function ❌
- Phase 4: AI Integration ❌
- Phase 5: Admin Portal ❌

## Current Focus
Working on foundational database setup and basic functionality.

## Next Steps
1. Create initial database schema
2. Deploy first Edge Function
3. Implement authentication flow
4. Add AI analysis capability
5. Build admin management interface

Last updated: $(date)
EOF
    echo "📋 Created IMPLEMENTATION_STATUS.md with initial tracking"
fi

# Show current status
echo ""
echo "🎯 Current Implementation Status:"
if [ -f "IMPLEMENTATION_STATUS.md" ]; then
    grep "Phase [1-5]:" IMPLEMENTATION_STATUS.md
fi