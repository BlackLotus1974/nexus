-- Fix profile creation trigger to handle organization assignment
-- This migration updates the trigger to properly create profiles with organizations

-- First, ensure we have a default organization
INSERT INTO organizations (id, name, created_at, updated_at)
VALUES (
    '00000000-0000-0000-0000-000000000001'::uuid,
    'Default Organization',
    NOW(),
    NOW()
)
ON CONFLICT (id) DO NOTHING;

-- Update the profile creation function to assign default organization
CREATE OR REPLACE FUNCTION public.create_profile_for_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_org_id UUID;
    v_full_name TEXT;
BEGIN
    -- Get or create default organization
    SELECT id INTO v_org_id FROM organizations ORDER BY created_at ASC LIMIT 1;

    -- If no organization exists, create one
    IF v_org_id IS NULL THEN
        INSERT INTO organizations (name, created_at, updated_at)
        VALUES ('Default Organization', NOW(), NOW())
        RETURNING id INTO v_org_id;
    END IF;

    -- Extract full name from metadata or use email username
    v_full_name := COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        split_part(NEW.email, '@', 1)
    );

    -- Insert profile with organization
    INSERT INTO public.profiles (id, organization_id, email, full_name, role, created_at, updated_at)
    VALUES (
        NEW.id,
        v_org_id,
        NEW.email,
        v_full_name,
        'user',
        NOW(),
        NOW()
    );

    RAISE NOTICE 'Created profile for user % in organization %', NEW.email, v_org_id;
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log error but don't fail the user creation
        RAISE WARNING 'Error creating profile for user % (id: %): %', NEW.email, NEW.id, SQLERRM;
        RETURN NEW;
END;
$$;

-- Recreate the trigger (just to be safe)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.create_profile_for_user();

-- Create profiles for any existing users without profiles
DO $$
DECLARE
    v_user RECORD;
    v_org_id UUID;
BEGIN
    -- Get default organization
    SELECT id INTO v_org_id FROM organizations ORDER BY created_at ASC LIMIT 1;

    -- Loop through users without profiles
    FOR v_user IN
        SELECT u.id, u.email, u.raw_user_meta_data
        FROM auth.users u
        LEFT JOIN profiles p ON u.id = p.id
        WHERE p.id IS NULL
    LOOP
        INSERT INTO profiles (id, organization_id, email, full_name, role, created_at, updated_at)
        VALUES (
            v_user.id,
            v_org_id,
            v_user.email,
            COALESCE(
                v_user.raw_user_meta_data->>'full_name',
                split_part(v_user.email, '@', 1)
            ),
            'user',
            NOW(),
            NOW()
        )
        ON CONFLICT (id) DO NOTHING;

        RAISE NOTICE 'Backfilled profile for user %', v_user.email;
    END LOOP;
END $$;
