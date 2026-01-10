#!/bin/bash
# .claude/hooks/tenant-isolation-check.sh
# ---
# name: tenant-isolation-check
# description: Validates multi-tenant data isolation
# events: ["after:save:*.sql", "after:save:supabase/functions/**/*.ts"]
# ---

echo "🔒 Validating tenant isolation..."

# Check for tenant context in functions
grep -r "TenantContext\|tenant_id\|resolveTenant" supabase/functions/ || {
    echo "⚠️ WARNING: No tenant context found in functions!"
}

# Check for RLS policies
grep -r "ROW LEVEL SECURITY\|RLS\|CREATE POLICY" supabase/migrations/ || {
    echo "⚠️ WARNING: No RLS policies found!"
}

# Check for tenant_id columns in tables
if [ -d "supabase/migrations" ]; then
    echo ""
    echo "📋 Checking tenant_id columns in tables..."
    
    # Look for CREATE TABLE statements without tenant_id
    tables_without_tenant=$(grep -l "CREATE TABLE" supabase/migrations/*.sql 2>/dev/null | xargs grep -L "tenant_id" 2>/dev/null)
    
    if [ -n "$tables_without_tenant" ]; then
        echo "⚠️ WARNING: Tables found without tenant_id column:"
        echo "$tables_without_tenant" | while read file; do
            grep "CREATE TABLE" "$file" | sed 's/CREATE TABLE[^(]*(//' | sed 's/(.*//' | head -1
        done
    else
        echo "✅ All tables include tenant_id column"
    fi
fi

# Check for proper tenant filtering in Edge Functions
if [ -d "supabase/functions" ]; then
    echo ""
    echo "🔍 Checking tenant filtering in Edge Functions..."
    
    # Look for database queries without tenant filtering
    functions_without_filtering=$(find supabase/functions -name "*.ts" -exec grep -l "\.from\|\.select\|\.insert\|\.update\|\.delete" {} \; | xargs grep -L "tenant_id\|TenantContext" 2>/dev/null)
    
    if [ -n "$functions_without_filtering" ]; then
        echo "⚠️ WARNING: Functions with database queries but no tenant filtering:"
        echo "$functions_without_filtering"
    else
        echo "✅ All functions include tenant filtering"
    fi
fi

# Check for admin bypass patterns
echo ""
echo "🛡️ Checking for admin bypass patterns..."
admin_bypasses=$(grep -r "service_role\|bypass.*tenant\|admin.*override" supabase/functions/ 2>/dev/null)

if [ -n "$admin_bypasses" ]; then
    echo "⚠️ WARNING: Potential admin bypass patterns found:"
    echo "$admin_bypasses"
else
    echo "✅ No admin bypass patterns detected"
fi

echo ""
echo "✅ Tenant isolation check complete"