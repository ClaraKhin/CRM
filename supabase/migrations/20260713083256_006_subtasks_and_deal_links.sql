/*
# Subtasks table + deal_id links on quotes/invoices

1. New Tables
- `subtasks`: child tasks linked to a parent task via `parent_id`.
  - `id` (uuid, primary key)
  - `user_id` (uuid, not null, default auth.uid(), references auth.users)
  - `parent_id` (uuid, not null, references tasks(id) on delete cascade)
  - `title` (text, not null)
  - `done` (boolean, default false)
  - `created_at` (timestamptz, default now())

2. Modified Tables
- `quotes`: add `deal_id uuid REFERENCES public.deals(id) ON DELETE SET NULL` (nullable)
- `invoices`: add `deal_id uuid REFERENCES public.deals(id) ON DELETE SET NULL` (nullable)

3. Security
- RLS enabled on `subtasks` with 4 CRUD policies scoped to auth.uid() = user_id.
*/

CREATE TABLE IF NOT EXISTS public.subtasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  title text NOT NULL,
  done boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.subtasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_subtasks" ON public.subtasks;
CREATE POLICY "select_own_subtasks" ON public.subtasks FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_subtasks" ON public.subtasks;
CREATE POLICY "insert_own_subtasks" ON public.subtasks FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_subtasks" ON public.subtasks;
CREATE POLICY "update_own_subtasks" ON public.subtasks FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_subtasks" ON public.subtasks;
CREATE POLICY "delete_own_subtasks" ON public.subtasks FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quotes' AND column_name = 'deal_id') THEN
    ALTER TABLE public.quotes ADD COLUMN deal_id uuid REFERENCES public.deals(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'deal_id') THEN
    ALTER TABLE public.invoices ADD COLUMN deal_id uuid REFERENCES public.deals(id) ON DELETE SET NULL;
  END IF;
END $$;
