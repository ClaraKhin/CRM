/*
# Fix profiles, roles, and documents for multi-user management

## Changes

### 1. Documents table — add uploaded_by_name for cross-user visibility
- Add `uploaded_by_name` text column (denormalized uploader name for display)
- Add `uploaded_by_email` text column (denormalized uploader email)
- Update RLS policies: allow all authenticated users to SELECT all documents (cross-user visibility)
- Keep INSERT/UPDATE/DELETE scoped to owner via user_id

### 2. Profiles table — add delete policy + allow all authenticated users to SELECT
- Add DELETE policy so users can delete their own profile
- Replace SELECT policy to allow all authenticated users to see all profiles (needed for User Management)
- Keep UPDATE scoped to own profile only

### 3. Roles table — allow all authenticated users to SELECT all roles
- Replace SELECT policy so admins can see all roles, not just their own
- Keep INSERT/UPDATE/DELETE scoped to owner

## Security
- Documents: all authenticated users can view all documents (centralized management requirement)
- Profiles: all authenticated users can view all profiles (User Management requirement)
- Roles: all authenticated users can view all roles (Role Management requirement)
- All write operations remain owner-scoped
*/

-- === Documents: add uploader info columns ===
ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS uploaded_by_name text DEFAULT '',
  ADD COLUMN IF NOT EXISTS uploaded_by_email text DEFAULT '';

-- === Documents: update RLS for cross-user visibility ===
DROP POLICY IF EXISTS "select_own_documents" ON documents;
DROP POLICY IF EXISTS "select_all_documents" ON documents;
CREATE POLICY "select_all_documents"
  ON documents FOR SELECT
  TO authenticated USING (true);

-- === Profiles: update RLS for cross-user visibility ===
DROP POLICY IF EXISTS "select_own_profile" ON profiles;
DROP POLICY IF EXISTS "select_all_profiles" ON profiles;
CREATE POLICY "select_all_profiles"
  ON profiles FOR SELECT
  TO authenticated USING (true);

-- Add delete policy for profiles
DROP POLICY IF EXISTS "delete_own_profile" ON profiles;
CREATE POLICY "delete_own_profile"
  ON profiles FOR DELETE
  TO authenticated USING (auth.uid() = id);

-- === Roles: update RLS for cross-user visibility ===
DROP POLICY IF EXISTS "select_own_roles" ON roles;
DROP POLICY IF EXISTS "select_all_roles" ON roles;
CREATE POLICY "select_all_roles"
  ON roles FOR SELECT
  TO authenticated USING (true);

-- Backfill uploaded_by_name from profiles for existing documents
UPDATE documents d
  SET uploaded_by_name = p.full_name,
      uploaded_by_email = p.email
  FROM profiles p
  WHERE d.user_id = p.id
    AND (d.uploaded_by_name = '' OR d.uploaded_by_name IS NULL);
