/*
# Seed demo account

Creates a demo CRM user so the app is immediately usable without manual signup.
- Email: demo@1cngcrm.com
- Password: Demo1234!
- Role: sales_manager (so the demo can see most modules)
- Profile row is auto-created by the on_auth_user_created trigger.

This is a one-time seed. Re-running is safe (idempotent via ON CONFLICT).
*/

INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_user_meta_data,
  raw_app_meta_data
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  '11111111-1111-1111-1111-111111111111',
  'authenticated',
  'authenticated',
  'demo@1cngcrm.com',
  crypt('Demo1234!', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"full_name":"Renee Walker","avatar_color":"#ffdccb"}'::jsonb,
  '{}'::jsonb
)
ON CONFLICT (id) DO NOTHING;

-- Ensure profile exists with sales_manager role (trigger handles insert; update role if already present)
INSERT INTO public.profiles (id, email, full_name, role, avatar_color)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'demo@1cngcrm.com',
  'Renee Walker',
  'sales_manager',
  '#ffdccb'
)
ON CONFLICT (id) DO UPDATE
  SET role = 'sales_manager',
      full_name = 'Renee Walker',
      avatar_color = '#ffdccb';
