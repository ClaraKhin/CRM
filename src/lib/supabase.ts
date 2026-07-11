import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase env vars. Expected VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

export type UserRole =
  | 'super_admin'
  | 'admin'
  | 'sales_manager'
  | 'sales_executive'
  | 'marketing'
  | 'finance';

export type Profile = {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  avatar_color: string;
  created_at: string;
  updated_at: string;
};

export const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  sales_manager: 'Sales Manager',
  sales_executive: 'Sales Executive',
  marketing: 'Marketing',
  finance: 'Finance'
};

export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  super_admin: ['*'],
  admin: ['*'],
  sales_manager: [
    'leads:read', 'leads:write',
    'customers:read', 'customers:write',
    'pipeline:read', 'pipeline:write',
    'tasks:read', 'tasks:write',
    'quotes:read', 'quotes:write',
    'invoices:read', 'invoices:write',
    'reports:read', 'reports:write',
    'automation:read', 'automation:write',
    'settings:read', 'settings:write'
  ],
  sales_executive: [
    'leads:read', 'leads:write',
    'customers:read', 'customers:write',
    'pipeline:read', 'pipeline:write',
    'tasks:read', 'tasks:write',
    'quotes:read', 'quotes:write',
    'reports:read'
  ],
  marketing: [
    'leads:read', 'leads:write',
    'customers:read',
    'reports:read'
  ],
  finance: [
    'invoices:read', 'invoices:write',
    'quotes:read',
    'reports:read'
  ]
};

export function can(userRole: UserRole | undefined, permission: string): boolean {
  if (!userRole) return false;
  const perms = ROLE_PERMISSIONS[userRole] ?? [];
  return perms.includes('*') || perms.includes(permission);
}
