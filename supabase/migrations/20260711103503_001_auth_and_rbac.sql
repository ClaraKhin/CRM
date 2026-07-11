/*
# Authentication, RBAC Profiles, and Audit Logs

## What this migration does
Lays the foundation for the Enterprise AI Sales CRM's authentication system on Supabase Auth.
It introduces a `profiles` table that extends `auth.users` with role and display info,
an `audit_logs` table for tracking user actions, plus the RLS policies that keep each
user scoped to their own data. This is the prerequisite for RBAC across every CRM module.

## 1. New Tables

### profiles
One row per auth user, created automatically when a new user signs up.
- id (uuid, PK, FK -> auth.users.id) — the user's auth id
- email (text) — mirrored from auth for quick reads
- full_name (text) — display name shown in the CRM UI
- role (text) — one of: super_admin | admin | sales_manager | sales_executive | marketing | finance
- avatar_color (text) — pastel color used for the avatar background (matches app avatarColor)
- created_at, updated_at (timestamptz)

### audit_logs
Append-only record of notable user actions (login, logout, profile updates, CRUD on protected resources).
- id (uuid, PK)
- user_id (uuid, FK -> auth.users.id, nullable for unauthenticated events)
- action (text) — e.g. "login", "logout", "update_profile"
- entity_type (text, nullable) — e.g. "lead", "customer"
- entity_id (text, nullable)
- metadata (jsonb, default '{}') — extra structured context
- created_at (timestamptz, default now())

## 2. Security (RLS)
- profiles: each authenticated user can SELECT/UPDATE only their own row.
  Inserts are handled server-side by the trigger (no direct client INSERT needed),
  but a guard policy is included for completeness.
- audit_logs: authenticated users can SELECT their own logs; INSERT is allowed
  for authenticated users (the app writes audit entries for the current user);
  UPDATE/DELETE are denied to keep logs immutable from the client.

## 3. Trigger / Function
- handle_new_user(): a SECURITY DEFINER trigger function that inserts a `profiles`
  row whenever a new row lands in auth.users. It reads the user's email and (if
  present) full_name from raw_user_meta_data, and assigns the default role
  `sales_executive`. SECURITY DEFINER + search_path guard keeps it safe.

## 4. Important Notes
- Email confirmation stays OFF (Supabase default). Sign-up logs the user in
  immediately, which the frontend uses to route into the app.
- The default role is sales_executive. Admins can promote users via the profile
  update flow (gated by role policies in a later migration).
- All policies use auth.uid() — never current_user.
*/

-- ============================================================
-- profiles table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text NOT NULL DEFAULT 'CRM User',
  role text NOT NULL DEFAULT 'sales_executive'
    CHECK (role IN ('super_admin','admin','sales_manager','sales_executive','marketing','finance')),
  avatar_color text NOT NULL DEFAULT '#ffdccb',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_profile" ON public.profiles;
CREATE POLICY "select_own_profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "insert_own_profile" ON public.profiles;
CREATE POLICY "insert_own_profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_profile" ON public.profiles;
CREATE POLICY "update_own_profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ============================================================
-- audit_logs table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text,
  entity_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_audit_logs" ON public.audit_logs;
CREATE POLICY "select_own_audit_logs"
  ON public.audit_logs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_audit_logs" ON public.audit_logs;
CREATE POLICY "insert_audit_logs"
  ON public.audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- Auto-create profile on signup
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Index for common profile lookups
CREATE INDEX IF NOT EXISTS profiles_role_idx ON public.profiles(role);
CREATE INDEX IF NOT EXISTS audit_logs_user_id_idx ON public.audit_logs(user_id, created_at DESC);
