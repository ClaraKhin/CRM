/*
# Task enhancements: rich fields, CRM links, comments, custom statuses

1. Modified Tables
- `tasks`: add columns for description, task type, start date, estimated hours, actual hours, lead_id, deal_id, customer_id, quote_id, invoice_id, archived flag. Expand priority CHECK to include 'Critical'.
- `subtasks`: add `status` column (Pending/In Progress/Done) and `due_date`.

2. New Tables
- `task_comments`: threaded comments on tasks (id, user_id, task_id, parent_comment_id, body, created_at). RLS enabled, owner-scoped.
- `task_statuses`: custom user-defined statuses (id, user_id, name, color, position). RLS enabled, owner-scoped.

3. Security
- RLS enabled on all new tables with 4 CRUD policies scoped to auth.uid() = user_id.
*/

-- ============================================================
-- tasks: add rich fields
-- ============================================================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tasks' AND column_name='description') THEN
    ALTER TABLE public.tasks ADD COLUMN description text NOT NULL DEFAULT '';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tasks' AND column_name='task_type') THEN
    ALTER TABLE public.tasks ADD COLUMN task_type text NOT NULL DEFAULT 'To-Do' CHECK (task_type IN ('To-Do','Meeting','Call','Email','Follow-up'));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tasks' AND column_name='start_date') THEN
    ALTER TABLE public.tasks ADD COLUMN start_date date;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tasks' AND column_name='estimated_hours') THEN
    ALTER TABLE public.tasks ADD COLUMN estimated_hours numeric NOT NULL DEFAULT 0;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tasks' AND column_name='actual_hours') THEN
    ALTER TABLE public.tasks ADD COLUMN actual_hours numeric NOT NULL DEFAULT 0;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tasks' AND column_name='lead_id') THEN
    ALTER TABLE public.tasks ADD COLUMN lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tasks' AND column_name='deal_id') THEN
    ALTER TABLE public.tasks ADD COLUMN deal_id uuid REFERENCES public.deals(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tasks' AND column_name='customer_id') THEN
    ALTER TABLE public.tasks ADD COLUMN customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tasks' AND column_name='quote_id') THEN
    ALTER TABLE public.tasks ADD COLUMN quote_id uuid REFERENCES public.quotes(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tasks' AND column_name='invoice_id') THEN
    ALTER TABLE public.tasks ADD COLUMN invoice_id uuid REFERENCES public.invoices(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tasks' AND column_name='archived') THEN
    ALTER TABLE public.tasks ADD COLUMN archived boolean NOT NULL DEFAULT false;
  END IF;
END $$;

-- Expand priority to include Critical
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='tasks_priority_check' AND table_name='tasks') THEN
    ALTER TABLE public.tasks DROP CONSTRAINT tasks_priority_check;
  END IF;
END $$;
ALTER TABLE public.tasks ADD CONSTRAINT tasks_priority_check CHECK (priority IN ('Critical','High','Medium','Low'));

-- ============================================================
-- subtasks: add status + due_date
-- ============================================================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='subtasks' AND column_name='status') THEN
    ALTER TABLE public.subtasks ADD COLUMN status text NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending','In Progress','Done'));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='subtasks' AND column_name='due_date') THEN
    ALTER TABLE public.subtasks ADD COLUMN due_date date;
  END IF;
END $$;

-- ============================================================
-- task_comments
-- ============================================================
CREATE TABLE IF NOT EXISTS public.task_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  parent_comment_id uuid REFERENCES public.task_comments(id) ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_task_comments" ON public.task_comments;
CREATE POLICY "select_own_task_comments" ON public.task_comments FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_task_comments" ON public.task_comments;
CREATE POLICY "insert_own_task_comments" ON public.task_comments FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_task_comments" ON public.task_comments;
CREATE POLICY "update_own_task_comments" ON public.task_comments FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_task_comments" ON public.task_comments;
CREATE POLICY "delete_own_task_comments" ON public.task_comments FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- task_statuses (custom user-defined statuses)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.task_statuses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text NOT NULL DEFAULT '#6b7488',
  position int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.task_statuses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_task_statuses" ON public.task_statuses;
CREATE POLICY "select_own_task_statuses" ON public.task_statuses FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_task_statuses" ON public.task_statuses;
CREATE POLICY "insert_own_task_statuses" ON public.task_statuses FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_task_statuses" ON public.task_statuses;
CREATE POLICY "update_own_task_statuses" ON public.task_statuses FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_task_statuses" ON public.task_statuses;
CREATE POLICY "delete_own_task_statuses" ON public.task_statuses FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON public.tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_subtasks_parent_id ON public.subtasks(parent_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_task_id ON public.task_comments(task_id);
