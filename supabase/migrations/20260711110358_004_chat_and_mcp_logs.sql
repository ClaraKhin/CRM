/*
# Chat messages and MCP tool execution logs

## New Tables

### chat_messages
Persists AI assistant conversation history per user.
- id (uuid, PK)
- user_id (uuid, FK -> auth.users, owner)
- role (text) — 'user' | 'ai'
- content (text) — message text
- tool_used (text, nullable) — which MCP tool was invoked for this message
- tool_status (text, nullable) — 'success' | 'error' | null
- created_at (timestamptz)

### mcp_tool_logs
Audit log of every MCP tool execution — who, what, when, result.
- id (uuid, PK)
- user_id (uuid, FK -> auth.users, owner)
- tool_name (text) — e.g. "Gmail", "Google Calendar", "CRM Database"
- action (text) — e.g. "search_customers", "summarize_meetings"
- input (jsonb) — request parameters
- output (jsonb, nullable) — response data summary
- status (text) — 'success' | 'error'
- latency_ms (int) — execution duration
- created_at (timestamptz)

## Security
- Both tables have RLS enabled with 4 CRUD policies scoped to auth.uid() = user_id.
*/

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'ai')),
  content text NOT NULL,
  tool_used text,
  tool_status text CHECK (tool_status IS NULL OR tool_status IN ('success', 'error')),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.mcp_tool_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tool_name text NOT NULL,
  action text NOT NULL,
  input jsonb NOT NULL DEFAULT '{}'::jsonb,
  output jsonb,
  status text NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'error')),
  latency_ms int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.mcp_tool_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies
DO $$
DECLARE
  t text;
  tables text[] := ARRAY['chat_messages', 'mcp_tool_logs'];
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

-- Triggers for updated_at (not needed for append-only, but consistent)
CREATE INDEX IF NOT EXISTS chat_messages_user_idx ON public.chat_messages(user_id, created_at);
CREATE INDEX IF NOT EXISTS mcp_tool_logs_user_idx ON public.mcp_tool_logs(user_id, created_at DESC);
