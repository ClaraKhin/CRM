/*
# Core CRM Schema

Tables for the Enterprise AI Sales CRM: people, customers, leads, deals,
tasks, products, quotes, invoices, events, activities, automations,
mcp_servers, notifications, audit_logs.

All tables use user_id for ownership and have RLS enabled with 4 CRUD policies
scoped to auth.uid() = user_id.
*/

-- ============================================================
-- people (shared contacts)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.people (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text,
  phone text,
  company text,
  avatar_color text NOT NULL DEFAULT '#d8e7ff',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.people ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- customers
-- ============================================================
CREATE TABLE IF NOT EXISTS public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  person_id uuid REFERENCES public.people(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'Lead' CHECK (status IN ('Lead','Prospect','Customer','VIP','Inactive')),
  industry text NOT NULL DEFAULT '',
  website text NOT NULL DEFAULT '',
  tags text[] NOT NULL DEFAULT '{}',
  lifetime_value numeric NOT NULL DEFAULT 0,
  address text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- leads
-- ============================================================
CREATE TABLE IF NOT EXISTS public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  person_id uuid REFERENCES public.people(id) ON DELETE SET NULL,
  source text NOT NULL DEFAULT 'Manual' CHECK (source IN ('Website','Facebook','Google Ads','Referral','Walk-in','Event','Manual')),
  score int NOT NULL DEFAULT 50,
  ai_score int NOT NULL DEFAULT 50,
  status text NOT NULL DEFAULT 'New' CHECK (status IN ('New','Contacted','Qualified','Proposal','Won','Lost','Unqualified')),
  owner_id text NOT NULL DEFAULT '',
  owner_name text NOT NULL DEFAULT '',
  value numeric NOT NULL DEFAULT 0,
  follow_up_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- deals (pipeline)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.deals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  person_id uuid REFERENCES public.people(id) ON DELETE SET NULL,
  title text NOT NULL,
  value numeric NOT NULL DEFAULT 0,
  stage text NOT NULL DEFAULT 'New' CHECK (stage IN ('New','Contacted','Qualified','Meeting','Proposal','Negotiation','Won','Lost')),
  probability int NOT NULL DEFAULT 20,
  owner_id text NOT NULL DEFAULT '',
  owner_name text NOT NULL DEFAULT '',
  close_date date,
  competitors text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- tasks
-- ============================================================
CREATE TABLE IF NOT EXISTS public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  priority text NOT NULL DEFAULT 'Medium' CHECK (priority IN ('High','Medium','Low')),
  status text NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending','In Progress','Done')),
  done boolean NOT NULL DEFAULT false,
  due_date date,
  owner_id text NOT NULL DEFAULT '',
  owner_name text NOT NULL DEFAULT '',
  checklist_total int NOT NULL DEFAULT 0,
  checklist_done int NOT NULL DEFAULT 0,
  recurring text NOT NULL DEFAULT 'None' CHECK (recurring IN ('None','Daily','Weekly','Monthly')),
  reminder boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- products
-- ============================================================
CREATE TABLE IF NOT EXISTS public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text NOT NULL DEFAULT 'Platform',
  price numeric NOT NULL DEFAULT 0,
  stock int NOT NULL DEFAULT 0,
  variants int NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'In stock' CHECK (status IN ('In stock','Low stock','Out of stock')),
  description text NOT NULL DEFAULT '',
  image_url text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- quotes
-- ============================================================
CREATE TABLE IF NOT EXISTS public.quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  person_id uuid REFERENCES public.people(id) ON DELETE SET NULL,
  number text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  tax numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft','Sent','Approved','Rejected')),
  version int NOT NULL DEFAULT 1,
  items int NOT NULL DEFAULT 0,
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- invoices
-- ============================================================
CREATE TABLE IF NOT EXISTS public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  person_id uuid REFERENCES public.people(id) ON DELETE SET NULL,
  number text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  tax numeric NOT NULL DEFAULT 0,
  discount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'Draft' CHECK (status IN ('Paid','Pending','Overdue','Draft')),
  due_date date,
  payment_history jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- events (calendar)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  type text NOT NULL DEFAULT 'Meeting' CHECK (type IN ('Meeting','Call','Demo','Event')),
  event_date date NOT NULL,
  time text NOT NULL DEFAULT '09:00',
  sync text CHECK (sync IN ('Google','Outlook',NULL)),
  description text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- activities (timeline)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  person_id uuid REFERENCES public.people(id) ON DELETE SET NULL,
  type text NOT NULL DEFAULT 'Note' CHECK (type IN ('Call','Email','Meeting','WhatsApp','Telegram','SMS','Note')),
  subject text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- automations
-- ============================================================
CREATE TABLE IF NOT EXISTS public.automations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  trigger text NOT NULL DEFAULT '',
  action text NOT NULL DEFAULT '',
  enabled boolean NOT NULL DEFAULT true,
  runs int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.automations ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- mcp_servers
-- ============================================================
CREATE TABLE IF NOT EXISTS public.mcp_servers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text NOT NULL DEFAULT 'Custom',
  connected boolean NOT NULL DEFAULT false,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.mcp_servers ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- notifications
-- ============================================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  type text NOT NULL DEFAULT 'info' CHECK (type IN ('info','reminder','alert','success','warning')),
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS Policies (4 per table: select/insert/update/delete)
-- ============================================================
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'people','customers','leads','deals','tasks','products',
    'quotes','invoices','events','activities','automations',
    'mcp_servers','notifications'
  ];
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
CREATE INDEX IF NOT EXISTS people_user_idx ON public.people(user_id);
CREATE INDEX IF NOT EXISTS customers_user_idx ON public.customers(user_id);
CREATE INDEX IF NOT EXISTS leads_user_idx ON public.leads(user_id);
CREATE INDEX IF NOT EXISTS deals_user_idx ON public.deals(user_id);
CREATE INDEX IF NOT EXISTS tasks_user_idx ON public.tasks(user_id);
CREATE INDEX IF NOT EXISTS products_user_idx ON public.products(user_id);
CREATE INDEX IF NOT EXISTS quotes_user_idx ON public.quotes(user_id);
CREATE INDEX IF NOT EXISTS invoices_user_idx ON public.invoices(user_id);
CREATE INDEX IF NOT EXISTS events_user_idx ON public.events(user_id);
CREATE INDEX IF NOT EXISTS activities_user_idx ON public.activities(user_id);
CREATE INDEX IF NOT EXISTS automations_user_idx ON public.automations(user_id);
CREATE INDEX IF NOT EXISTS mcp_servers_user_idx ON public.mcp_servers(user_id);
CREATE INDEX IF NOT EXISTS notifications_user_idx ON public.notifications(user_id);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'people','customers','leads','deals','tasks','products',
    'quotes','invoices','events','activities','automations',
    'mcp_servers','notifications','profiles'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS touch_%I ON public.%I;', t, t);
    EXECUTE format('CREATE TRIGGER touch_%I BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();', t, t);
  END LOOP;
END $$;
