-- Fix RLS infinite recursion on profiles table
-- The issue: The SELECT policy queries profiles table within itself, causing infinite recursion
-- Solution: Simplify policies to avoid self-referencing queries

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view profiles in their organization" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Create simplified policies

-- Allow users to view their own profile (no recursion)
CREATE POLICY "Users can view own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id);

-- Allow users to insert their own profile (needed for trigger)
CREATE POLICY "Users can insert own profile"
  ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- For viewing other profiles in the same organization, we'll use a function
-- that doesn't cause recursion by using a security definer function

-- Create a security definer function to get user's organization
CREATE OR REPLACE FUNCTION public.get_user_organization_id(user_id UUID)
RETURNS UUID
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT organization_id FROM public.profiles WHERE id = user_id;
$$;

-- Now create a policy for viewing other profiles in the organization
CREATE POLICY "Users can view profiles in same organization"
  ON public.profiles
  FOR SELECT
  USING (
    -- User can see their own profile
    auth.uid() = id
    OR
    -- Or profiles in the same organization (using the security definer function)
    organization_id = public.get_user_organization_id(auth.uid())
  );

-- Drop the redundant "view own profile" policy since it's covered by the broader policy
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
