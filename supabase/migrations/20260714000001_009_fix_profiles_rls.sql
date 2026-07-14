/*
# Fix profiles RLS — remove recursive policy, use security definer function

The previous migration added select_all_profiles_for_managers which queried
public.profiles inside a policy on public.profiles, causing infinite recursion
and a 500 on every profiles SELECT.

Fix: replace it with a SECURITY DEFINER helper function that reads the current
user's role bypassing RLS, then reference that function in the policy.
*/

-- Helper: returns the role of the currently authenticated user.
-- SECURITY DEFINER + SET search_path means it bypasses the RLS policies on
-- profiles, so it does NOT recurse.
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;

-- Drop the broken recursive policy
DROP POLICY IF EXISTS "select_all_profiles_for_managers" ON public.profiles;

-- Replace with a non-recursive version using the helper function
CREATE POLICY "select_all_profiles_for_managers"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    public.get_my_role() IN ('super_admin', 'admin', 'sales_manager')
  );
