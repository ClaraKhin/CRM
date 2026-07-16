/*
# Fix roles is_default column default

1. Changes
- Ensure the `is_default` column on the `roles` table has a proper database-level
  default of `false`. This resolves the Supabase schema cache error
  "Could not find the 'is_default' column of 'roles' in the schema cache" that occurs
  during INSERT operations.
- Also ensures `user_id` has a DEFAULT of `auth.uid()` so inserts from the frontend
  do not need to pass it explicitly.

2. Notes
- No data is altered. This is purely a schema metadata operation.
*/

ALTER TABLE roles ALTER COLUMN is_default SET DEFAULT false;
ALTER TABLE roles ALTER COLUMN user_id SET DEFAULT auth.uid();
