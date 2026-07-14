/*
# Seed demo account

Creates a demo CRM user so the app is immediately usable without manual signup.
- Email: demo@1cngcrm.com
- Password: Demo1234!
- Role: sales_manager (so the demo can see most modules)
- Profile row is auto-created by the on_auth_user_created trigger.

This is a one-time seed. Re-running is safe (idempotent via ON CONFLICT).

IMPORTANT: We must insert into BOTH auth.users AND auth.identities.
GoTrue requires an auth.identities row (provider='email') to authenticate
password-based users. Without it the login endpoint returns a 500
"Database error querying schema" regardless of whether the password is correct.
raw_app_meta_data must also include {"provider":"email","providers":["email"]}
for GoTrue to resolve the auth provider on sign-in.
*/

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- Insert the demo user into auth.users
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
  raw_app_meta_data,
  is_sso_user,
  is_anonymous
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  '11111111-1111-1111-1111-111111111111',
  'authenticated',
  'authenticated',
  'demo@1cngcrm.com',
  extensions.crypt('Demo1234!', extensions.gen_salt('bf', 10)),
  now(),
  now(),
  now(),
  '{"full_name":"Renee Walker","avatar_color":"#ffdccb"}'::jsonb,
  '{"provider":"email","providers":["email"]}'::jsonb,
  false,
  false
)
ON CONFLICT (id) DO UPDATE
  SET raw_app_meta_data = '{"provider":"email","providers":["email"]}'::jsonb,
      email_confirmed_at = COALESCE(auth.users.email_confirmed_at, now());

-- Insert the required identity row so GoTrue can resolve the email provider
INSERT INTO auth.identities (
  id,
  user_id,
  provider_id,
  provider,
  identity_data,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  '11111111-1111-1111-1111-111111111111',
  '11111111-1111-1111-1111-111111111111',
  'email',
  jsonb_build_object(
    'sub',            '11111111-1111-1111-1111-111111111111',
    'email',          'demo@1cngcrm.com',
    'email_verified', true,
    'provider',       'email'
  ),
  now(),
  now()
)
ON CONFLICT (provider, provider_id) DO NOTHING;

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
