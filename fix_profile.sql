-- Quick fix: Create organization and profile for authenticated user
-- Run this with: cat fix_profile.sql | docker exec -i supabase_db_nexus psql -U postgres postgres

-- Create default organization
INSERT INTO organizations (id, name, created_at, updated_at)
VALUES (
    'a0000000-0000-0000-0000-000000000001'::uuid,
    'Default Organization',
    NOW(),
    NOW()
)
ON CONFLICT (id) DO NOTHING;

-- Create/update profile for the authenticated user (replace with actual user ID)
INSERT INTO profiles (id, organization_id, email, full_name, role, created_at, updated_at)
SELECT
    u.id,
    'a0000000-0000-0000-0000-000000000001'::uuid,
    u.email,
    COALESCE(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)),
    'owner',
    NOW(),
    NOW()
FROM auth.users u
WHERE NOT EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = u.id
)
ON CONFLICT (id) DO UPDATE
SET
    organization_id = EXCLUDED.organization_id,
    email = EXCLUDED.email,
    updated_at = NOW();
