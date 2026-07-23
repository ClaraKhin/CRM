import {
  BotIcon,
  CalendarDaysIcon,
  ChartNoAxesCombinedIcon,
  ClipboardListIcon,
  ContactRoundIcon,
  CreditCardIcon,
  FileTextIcon,
  GaugeIcon,
  HistoryIcon,
  LayoutDashboardIcon,
  PackageIcon,
  ReceiptTextIcon,
  ScrollTextIcon,
  Settings2Icon,
  ShieldCheckIcon,
  UsersRoundIcon,
  WorkflowIcon,
  type LucideIcon } from
'lucide-react';

export type NavItem = {
  label: string;
  path: string;
  icon: LucideIcon;
  badge?: string;
  section: 'Workspace' | 'Sales' | 'Intelligence' | 'Manage';
};

export const navItems: NavItem[] = [
{
  label: 'Dashboard',
  path: '/',
  icon: LayoutDashboardIcon,
  section: 'Workspace'
},
{
  label: 'Leads',
  path: '/leads',
  icon: UsersRoundIcon,
  badge: '8',
  section: 'Workspace'
},
{
  label: 'Pipeline',
  path: '/pipeline',
  icon: ChartNoAxesCombinedIcon,
  section: 'Workspace'
},
{
  label: 'Customers',
  path: '/customers',
  icon: ContactRoundIcon,
  section: 'Workspace'
},
{
  label: 'Activity Timeline',
  path: '/activity',
  icon: HistoryIcon,
  section: 'Workspace'
},
{ label: 'Products', path: '/products', icon: PackageIcon, section: 'Sales' },
{ label: 'Quotes', path: '/quotes', icon: FileTextIcon, section: 'Sales' },
{
  label: 'Invoices',
  path: '/invoices',
  icon: ReceiptTextIcon,
  section: 'Sales'
},
{
  label: 'Payments',
  path: '/payments',
  icon: CreditCardIcon,
  section: 'Sales'
},
{ label: 'Tasks', path: '/tasks', icon: ClipboardListIcon, section: 'Sales' },
{
  label: 'Calendar',
  path: '/calendar',
  icon: CalendarDaysIcon,
  section: 'Sales'
},
{
  label: 'Reports',
  path: '/reports',
  icon: ChartNoAxesCombinedIcon,
  section: 'Intelligence'
},
{
  label: 'AI Assistant',
  path: '/assistant',
  icon: BotIcon,
  section: 'Intelligence'
},
{
  label: 'Automation',
  path: '/automation',
  icon: WorkflowIcon,
  section: 'Intelligence'
},
{
  label: 'Lead Scoring',
  path: '/lead-scoring',
  icon: GaugeIcon,
  section: 'Manage'
},
{
  label: 'User Management',
  path: '/users',
  icon: UsersRoundIcon,
  section: 'Manage'
},
{
  label: 'Role Management',
  path: '/roles',
  icon: ShieldCheckIcon,
  section: 'Manage'
},
{
  label: 'Documents',
  path: '/documents',
  icon: ScrollTextIcon,
  section: 'Manage'
},
{
  label: 'Audit Logs',
  path: '/audit-logs',
  icon: HistoryIcon,
  section: 'Manage'
},
{
  label: 'Settings',
  path: '/settings',
  icon: Settings2Icon,
  section: 'Manage'
}];


export const sections: NavItem['section'][] = [
'Workspace',
'Sales',
'Intelligence',
'Manage'];
