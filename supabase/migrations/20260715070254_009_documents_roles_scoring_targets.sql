/*
# Documents, Roles, Lead Score Rules, Custom Fields, App Settings, Targets, Task Status Expansion

## Overview
This migration creates several tables referenced by the CRM admin module that
did not yet exist in the database, and expands the tasks status constraint to
support additional Kanban workflow statuses.

## 1. New Tables

### documents
Centralized document storage synced across all CRM modules.
- id, user_id, entity_type (deal/customer/lead/quote/invoice/product), entity_id, name, file_url, file_type, file_size, created_at

### roles
Custom role definitions with permission maps.
- id, user_id, name, description, permissions (jsonb), is_default, created_at, updated_at

### lead_score_rules
Configurable scoring rules for the Lead Scoring module.
- id, user_id, name, condition_field, condition_operator, condition_value, points, enabled, created_at, updated_at

### custom_fields
User-defined custom fields for CRM entities.
- id, user_id, entity_type, field_name, field_type, field_options (jsonb), created_at

### app_settings
Per-user application settings (key-value store).
- id, user_id, key, value (jsonb), updated_at

### targets
Sales targets/KPIs for team members.
- id, user_id, owner_id, owner_name, period_type, period_label, target_amount, won_amount, created_at

## 2. Modified Tables

### tasks
- Dropped old status CHECK constraint (Pending/In Progress/Done) and replaced with expanded constraint including: To Do, Pending, In Progress, On Hold, Cancelled, Done — adding "To Do" and "On Hold" as new workflow statuses.

## 3. Security
- RLS enabled on all new tables with 4 CRUD policies scoped to auth.uid() = user_id.
*/

-- ============================================================
-- documents table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_type text NOT NULL DEFAULT 'general',
  entity_id uuid,
  name text NOT NULL,
  file_url text NOT NULL,
  file_type text NOT NULL DEFAULT 'file',
  file_size bigint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- roles table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  permissions jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- lead_score_rules table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.lead_score_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  condition_field text NOT NULL DEFAULT 'source',
  condition_operator text NOT NULL DEFAULT 'equals',
  condition_value text NOT NULL DEFAULT '',
  points int NOT NULL DEFAULT 10,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.lead_score_rules ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- custom_fields table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.custom_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_type text NOT NULL DEFAULT 'lead',
  field_name text NOT NULL,
  field_type text NOT NULL DEFAULT 'text',
  field_options jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.custom_fields ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- app_settings table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.app_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  key text NOT NULL,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- targets table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  owner_id text NOT NULL,
  owner_name text NOT NULL,
  period_type text NOT NULL DEFAULT 'monthly' CHECK (period_type IN ('monthly','quarterly')),
  period_label text NOT NULL,
  target_amount numeric NOT NULL DEFAULT 0,
  won_amount numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.targets ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS Policies for all new tables
-- ============================================================
DO $$
DECLARE
  t text;
  tables text[] := ARRAY['documents','roles','lead_score_rules','custom_fields','app_settings','targets'];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', 'select_own_' || t, t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (auth.uid() = user_id);', 'select_own_' || t, t);

    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', 'insert_own_' || t, t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);', 'insert_own_' || t, t);

    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', 'update_own_' || t, t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);', 'update_own_' || t, t);

    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', 'delete_own_' || t, t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (auth.uid() = user_id);', 'delete_own_' || t, t);
  END LOOP;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS documents_user_idx ON public.documents(user_id);
CREATE INDEX IF NOT EXISTS documents_entity_idx ON public.documents(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS roles_user_idx ON public.roles(user_id);
CREATE INDEX IF NOT EXISTS lead_score_rules_user_idx ON public.lead_score_rules(user_id);
CREATE INDEX IF NOT EXISTS custom_fields_user_idx ON public.custom_fields(user_id);
CREATE INDEX IF NOT EXISTS app_settings_user_idx ON public.app_settings(user_id);
CREATE INDEX IF NOT EXISTS targets_user_idx ON public.targets(user_id);

-- Triggers for updated_at on roles, lead_score_rules
DO $$
DECLARE
  t text;
  tables text[] := ARRAY['roles','lead_score_rules','app_settings'];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS touch_%I ON public.%I;', t, t);
    EXECUTE format('CREATE TRIGGER touch_%I BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();', t, t);
  END LOOP;
END $$;

-- ============================================================
-- tasks: expand status CHECK constraint
-- ============================================================
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='tasks_status_check' AND table_name='tasks') THEN
    ALTER TABLE public.tasks DROP CONSTRAINT tasks_status_check;
  END IF;
END $$;
ALTER TABLE public.tasks ADD CONSTRAINT tasks_status_check CHECK (status IN ('To Do','Pending','In Progress','On Hold','Cancelled','Done'));
