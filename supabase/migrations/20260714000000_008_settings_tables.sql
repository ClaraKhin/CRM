/*
# Settings tables: roles, custom_fields, lead_score_rules, app_settings

Creates the four tables referenced by the Settings page that were missing from
previous migrations, plus fixes the profiles RLS so managers/admins can list
all team members in the User Management tab.

## New Tables

### roles
User-defined custom roles with permission maps.
- id, user_id, name, description, permissions (jsonb), is_system (bool), created_at, updated_at

### custom_fields
User-defined extra fields attached to CRM entities (leads, deals, etc.).
- id, user_id, entity_type, field_name, field_label, field_type, field_options, is_required, position, created_at, updated_at

### lead_score_rules
Rules that auto-adjust a lead's score based on field conditions.
- id, user_id, name, condition_field, condition_operator, condition_value, points, enabled, created_at, updated_at

### app_settings
Key/value store for per-user application settings (currency, tax_rate, etc.).
- id, user_id, key, value, created_at, updated_at

## profiles RLS fix
Adds a policy so sales_manager, admin, and super_admin roles can SELECT all
profiles (needed for the User Management tab). The existing select_own_profile
policy still covers everyone else.
*/

-- ============================================================
-- roles
-- ============================================================
CREATE TABLE IF NOT EXISTS public.roles (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        text NOT NULL,
  description text NOT NULL DEFAULT '',
  permissions jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_system   boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_roles" ON public.roles;
CREATE POLICY "select_own_roles" ON public.roles FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_roles" ON public.roles;
CREATE POLICY "insert_own_roles" ON public.roles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_roles" ON public.roles;
CREATE POLICY "update_own_roles" ON public.roles FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_roles" ON public.roles;
CREATE POLICY "delete_own_roles" ON public.roles FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'touch_roles') THEN
    CREATE TRIGGER touch_roles BEFORE UPDATE ON public.roles
      FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS roles_user_idx ON public.roles(user_id);

-- ============================================================
-- custom_fields
-- ============================================================
CREATE TABLE IF NOT EXISTS public.custom_fields (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_type  text NOT NULL CHECK (entity_type IN ('lead','customer','deal','product','quote','invoice','task')),
  field_name   text NOT NULL,
  field_label  text NOT NULL,
  field_type   text NOT NULL DEFAULT 'text' CHECK (field_type IN ('text','number','date','select','textarea','checkbox')),
  field_options text,
  is_required  boolean NOT NULL DEFAULT false,
  position     int NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.custom_fields ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_custom_fields" ON public.custom_fields;
CREATE POLICY "select_own_custom_fields" ON public.custom_fields FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_custom_fields" ON public.custom_fields;
CREATE POLICY "insert_own_custom_fields" ON public.custom_fields FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_custom_fields" ON public.custom_fields;
CREATE POLICY "update_own_custom_fields" ON public.custom_fields FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_custom_fields" ON public.custom_fields;
CREATE POLICY "delete_own_custom_fields" ON public.custom_fields FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'touch_custom_fields') THEN
    CREATE TRIGGER touch_custom_fields BEFORE UPDATE ON public.custom_fields
      FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS custom_fields_user_entity_idx ON public.custom_fields(user_id, entity_type);

-- ============================================================
-- lead_score_rules
-- ============================================================
CREATE TABLE IF NOT EXISTS public.lead_score_rules (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name               text NOT NULL,
  condition_field    text NOT NULL DEFAULT 'source',
  condition_operator text NOT NULL DEFAULT 'equals',
  condition_value    text NOT NULL DEFAULT '',
  points             int NOT NULL DEFAULT 10,
  enabled            boolean NOT NULL DEFAULT true,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.lead_score_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_lead_score_rules" ON public.lead_score_rules;
CREATE POLICY "select_own_lead_score_rules" ON public.lead_score_rules FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_lead_score_rules" ON public.lead_score_rules;
CREATE POLICY "insert_own_lead_score_rules" ON public.lead_score_rules FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_lead_score_rules" ON public.lead_score_rules;
CREATE POLICY "update_own_lead_score_rules" ON public.lead_score_rules FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_lead_score_rules" ON public.lead_score_rules;
CREATE POLICY "delete_own_lead_score_rules" ON public.lead_score_rules FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'touch_lead_score_rules') THEN
    CREATE TRIGGER touch_lead_score_rules BEFORE UPDATE ON public.lead_score_rules
      FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS lead_score_rules_user_idx ON public.lead_score_rules(user_id);

-- ============================================================
-- app_settings
-- ============================================================
CREATE TABLE IF NOT EXISTS public.app_settings (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  key        text NOT NULL,
  value      text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, key)
);
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_app_settings" ON public.app_settings;
CREATE POLICY "select_own_app_settings" ON public.app_settings FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_app_settings" ON public.app_settings;
CREATE POLICY "insert_own_app_settings" ON public.app_settings FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_app_settings" ON public.app_settings;
CREATE POLICY "update_own_app_settings" ON public.app_settings FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_app_settings" ON public.app_settings;
CREATE POLICY "delete_own_app_settings" ON public.app_settings FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'touch_app_settings') THEN
    CREATE TRIGGER touch_app_settings BEFORE UPDATE ON public.app_settings
      FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS app_settings_user_key_idx ON public.app_settings(user_id, key);

-- ============================================================
-- profiles RLS: allow managers/admins to list all team members
-- ============================================================
-- NOTE: The actual implementation is in migration 009_fix_profiles_rls.sql
-- which uses a SECURITY DEFINER helper function to avoid the recursive
-- policy issue (querying profiles inside a policy on profiles = 500 error).
-- Nothing to do here — kept for documentation only.
