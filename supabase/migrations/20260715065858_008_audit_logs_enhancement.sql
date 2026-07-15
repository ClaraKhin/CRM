/*
# Enhance audit_logs with IP, device, and browser tracking

## Purpose
The Audit Logs module needs to track user login activity, CRUD operations,
IP address, device information, and browser information. This migration
adds the missing columns to the existing audit_logs table.

## Changes
1. Added columns to `audit_logs`:
   - `ip_address` (inet, nullable) — client IP address
   - `user_agent` (text, nullable) — raw User-Agent header
   - `device_type` (text, nullable) — parsed device type (Desktop/Mobile/Tablet)
   - `browser` (text, nullable) — parsed browser name
   - `os` (text, nullable) — parsed operating system
   - `entity_id` (text, nullable) — ID of the affected entity for CRUD tracking
   - `action_type` (text, nullable) — categorization (login/logout/create/read/update/delete)

2. Added an index on user_id + created_at for faster per-user queries.

## Security
- No RLS changes — existing policies remain in place.
- No data loss — all new columns are nullable additions.
*/

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'ip_address') THEN
    ALTER TABLE audit_logs ADD COLUMN ip_address inet;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'user_agent') THEN
    ALTER TABLE audit_logs ADD COLUMN user_agent text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'device_type') THEN
    ALTER TABLE audit_logs ADD COLUMN device_type text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'browser') THEN
    ALTER TABLE audit_logs ADD COLUMN browser text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'os') THEN
    ALTER TABLE audit_logs ADD COLUMN os text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'entity_id') THEN
    ALTER TABLE audit_logs ADD COLUMN entity_id text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'action_type') THEN
    ALTER TABLE audit_logs ADD COLUMN action_type text;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_created ON audit_logs(user_id, created_at DESC);
