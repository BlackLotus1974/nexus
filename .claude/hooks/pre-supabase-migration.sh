---
name: pre-supabase-migration
description: Validates and backs up before Supabase migrations
events: ["before:bash:supabase db push", "before:bash:supabase db reset"]
---
#!/bin/bash

echo "🔍 Pre-migration check for Student Dome..."

# Check if we're in the right project
if [ ! -f "Backend_Architecture.md" ]; then
    echo "⚠️ WARNING: Backend_Architecture.md not found. Wrong directory?"
    exit 1
fi

# Verify environment
if [ ! -f ".env.local" ]; then
    echo "❌ ERROR: .env.local not found. Run setup first!"
    exit 1
fi

# Create backups directory if it doesn't exist
mkdir -p backups

# Check migration files
echo "📋 Migrations to be applied:"
if ls supabase/migrations/*.sql 1> /dev/null 2>&1; then
    ls -la supabase/migrations/*.sql
else
    echo "No migrations found in supabase/migrations/"
fi

# Backup current schema (if exists)
echo "💾 Creating backup..."
BACKUP_FILE="backups/pre-migration-$(date +%Y%m%d-%H%M%S).sql"

# Try to create backup (will fail gracefully if no DB exists yet)
if command -v supabase &> /dev/null; then
    supabase db dump > "$BACKUP_FILE" 2>/dev/null && echo "✅ Backup created: $BACKUP_FILE" || echo "ℹ️ No existing database to backup"
else
    echo "⚠️ Supabase CLI not found - skipping backup"
fi

# Validate migration files for common issues
echo "🔍 Validating migration files..."
for file in supabase/migrations/*.sql; do
    if [ -f "$file" ]; then
        # Check for common issues
        if grep -q "DROP TABLE" "$file"; then
            echo "⚠️ WARNING: $file contains DROP TABLE - destructive operation!"
        fi
        if grep -q "CREATE EXTENSION" "$file"; then
            echo "ℹ️ INFO: $file creates extensions - ensure permissions are correct"
        fi
        echo "✓ Validated: $(basename "$file")"
    fi
done

echo "✅ Pre-migration checks complete - ready for migration"