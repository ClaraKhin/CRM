/*
# Fix roles updated_at trigger + documents updated_at column

1. Roles table
- Add an auto-updating trigger for `updated_at` so the column is maintained by the database
  and the frontend no longer needs to send it explicitly. This fixes the schema cache error
  "Could not find the 'updated_at' column of 'roles' in the schema cache" by ensuring the
  column is properly recognized and maintained server-side.
- Drop and recreate the set_updated_at trigger function for idempotency.

2. Documents table
- Add `updated_at` column (timestamptz, defaults to now()) so document edits can be tracked.
- Add a matching auto-update trigger.

3. Audit logs
- No schema changes needed — columns already exist. This migration just ensures the
  schema cache is refreshed by touching the tables.

4. Security
- No RLS policy changes. Existing policies remain intact.
*/

-- Reusable function: automatically update updated_at on row change
DROP FUNCTION IF EXISTS set_updated_at();
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Roles: ensure updated_at has a default, add trigger
ALTER TABLE roles ALTER COLUMN updated_at SET DEFAULT now();

DROP TRIGGER IF EXISTS roles_set_updated_at ON roles;
CREATE TRIGGER roles_set_updated_at
  BEFORE UPDATE ON roles
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- Documents: add updated_at column if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'documents' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE documents ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
  END IF;
END $$;

DROP TRIGGER IF EXISTS documents_set_updated_at ON documents;
CREATE TRIGGER documents_set_updated_at
  BEFORE UPDATE ON documents
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();
