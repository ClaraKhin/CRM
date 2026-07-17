/*
# Fix subtasks status CHECK constraint

## Problem
The frontend (Tasks page) inserts/updates subtasks with status 'To Do',
but the CHECK constraint from migration 007 only allows
('Pending','In Progress','Done'), so every subtask insert fails silently.

## Changes
1. Drop the existing status CHECK constraint on `subtasks`.
2. Re-create it allowing: 'To Do', 'Pending', 'In Progress', 'Done'.
*/

DO $$
DECLARE
  con_name text;
BEGIN
  SELECT c.conname INTO con_name
  FROM pg_constraint c
  JOIN pg_class t ON t.oid = c.conrelid
  WHERE t.relname = 'subtasks'
    AND c.contype = 'c'
    AND pg_get_constraintdef(c.oid) ILIKE '%status%';

  IF con_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.subtasks DROP CONSTRAINT %I', con_name);
  END IF;
END $$;

ALTER TABLE public.subtasks
  ADD CONSTRAINT subtasks_status_check
  CHECK (status IN ('To Do', 'Pending', 'In Progress', 'Done'));
