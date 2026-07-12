/*
# Deal Enhancements, Deal-Based Quotes/Invoices, and API Sync

## Overview
This migration enhances the deals table with project volume and sale fields,
links quotes and invoices to deals (so a single customer can have multiple
projects/deals), adds a customer_id column to deals for direct customer linkage,
and creates new tables for MCP/API sync management.

## Changes to existing tables

### deals
- Added `customer_id` (uuid, nullable, references customers) — direct link to customer record
- Added `project_volume` (numeric, default 0) — total project volume/contract value
- Added `sale_type` (text, default 'New') — type of sale: New, Renewal, Upsell, Cross-sell
- Added `quotation_status` (text, default 'None') — quotation status: None, Draft, Sent, Approved
- Added `deal_type` (text, default 'Project') — deal type: Project, Product, Service

### quotes
- Added `deal_id` (uuid, nullable, references deals) — links quote to a specific deal/project

### invoices
- Added `deal_id` (uuid, nullable, references deals) — links invoice to a specific deal/project

## New tables

### api_sync_connections
Stores external API sync connections (e.g., Google, Outlook, Slack, custom APIs).
- id, user_id, name, provider, endpoint_url, auth_type, status, last_synced_at, config (jsonb), created_at, updated_at

### api_sync_logs
Logs of sync operations for each connection.
- id, user_id, connection_id, status, records_synced, error_message, created_at

## Security
- RLS enabled on all new tables with 4 CRUD policies scoped to auth.uid() = user_id.
- New columns on existing tables inherit existing RLS policies.
*/

-- ============================================================
-- deals: add customer_id, project_volume, sale_type, quotation_status, deal_type
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'deals' AND column_name = 'customer_id') THEN
    ALTER TABLE public.deals ADD COLUMN customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'deals' AND column_name = 'project_volume') THEN
    ALTER TABLE public.deals ADD COLUMN project_volume numeric NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'deals' AND column_name = 'sale_type') THEN
    ALTER TABLE public.deals ADD COLUMN sale_type text NOT NULL DEFAULT 'New';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'deals' AND column_name = 'quotation_status') THEN
    ALTER TABLE public.deals ADD COLUMN quotation_status text NOT NULL DEFAULT 'None';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'deals' AND column_name = 'deal_type') THEN
    ALTER TABLE public.deals ADD COLUMN deal_type text NOT NULL DEFAULT 'Project';
  END IF;
END $$;

-- ============================================================
-- quotes: add deal_id
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quotes' AND column_name = 'deal_id') THEN
    ALTER TABLE public.quotes ADD COLUMN deal_id uuid REFERENCES public.deals(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ============================================================
-- invoices: add deal_id
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'deal_id') THEN
    ALTER TABLE public.invoices ADD COLUMN deal_id uuid REFERENCES public.deals(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ============================================================
-- api_sync_connections
-- ============================================================
CREATE TABLE IF NOT EXISTS public.api_sync_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  provider text NOT NULL DEFAULT 'custom',
  endpoint_url text NOT NULL DEFAULT '',
  auth_type text NOT NULL DEFAULT 'api_key' CHECK (auth_type IN ('api_key','oauth2','bearer','basic','none')),
  status text NOT NULL DEFAULT 'inactive' CHECK (status IN ('active','inactive','error','syncing')),
  last_synced_at timestamptz,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.api_sync_connections ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- api_sync_logs
-- ============================================================
CREATE TABLE IF NOT EXISTS public.api_sync_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  connection_id uuid REFERENCES public.api_sync_connections(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'success' CHECK (status IN ('success','failed','partial')),
  records_synced int NOT NULL DEFAULT 0,
  error_message text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.api_sync_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS Policies for new tables
-- ============================================================
DO $$
DECLARE
  t text;
  tables text[] := ARRAY['api_sync_connections','api_sync_logs'];
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
CREATE INDEX IF NOT EXISTS api_sync_connections_user_idx ON public.api_sync_connections(user_id);
CREATE INDEX IF NOT EXISTS api_sync_logs_user_idx ON public.api_sync_logs(user_id);
CREATE INDEX IF NOT EXISTS deals_customer_idx ON public.deals(customer_id);
CREATE INDEX IF NOT EXISTS quotes_deal_idx ON public.quotes(deal_id);
CREATE INDEX IF NOT EXISTS invoices_deal_idx ON public.invoices(deal_id);

-- Triggers for updated_at on new tables
DO $$
DECLARE
  t text;
  tables text[] := ARRAY['api_sync_connections','api_sync_logs'];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS touch_%I ON public.%I;', t, t);
    EXECUTE format('CREATE TRIGGER touch_%I BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();', t, t);
  END LOOP;
END $$;
