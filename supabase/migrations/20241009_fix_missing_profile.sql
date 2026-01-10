-- Fix missing profile for authenticated user
-- This migration ensures that the authenticated user has a profile and organization

DO $$
DECLARE
    v_user_id UUID;
    v_user_email TEXT;
    v_org_id UUID;
BEGIN
    -- Get the first authenticated user
    SELECT id, email INTO v_user_id, v_user_email
    FROM auth.users
    LIMIT 1;

    -- Only proceed if a user exists
    IF v_user_id IS NOT NULL THEN
        -- Create a default organization if it doesn't exist
        INSERT INTO organizations (id, name, created_at, updated_at)
        VALUES (
            gen_random_uuid(),
            'Default Organization',
            NOW(),
            NOW()
        )
        ON CONFLICT DO NOTHING
        RETURNING id INTO v_org_id;

        -- If organization already exists, get its ID
        IF v_org_id IS NULL THEN
            SELECT id INTO v_org_id FROM organizations LIMIT 1;
        END IF;

        -- Create or update the profile
        INSERT INTO profiles (id, organization_id, email, full_name, role, created_at, updated_at)
        VALUES (
            v_user_id,
            v_org_id,
            v_user_email,
            split_part(v_user_email, '@', 1), -- Use email username as name
            'owner',
            NOW(),
            NOW()
        )
        ON CONFLICT (id) DO UPDATE
        SET
            organization_id = EXCLUDED.organization_id,
            email = EXCLUDED.email,
            updated_at = NOW();

        RAISE NOTICE 'Created/updated profile for user % with organization %', v_user_email, v_org_id;
    END IF;
END $$;
