import type {
  Automation,
  CalendarEvent,
  Customer,
  Deal,
  Invoice,
  Lead,
  McpServer,
  Product,
  Quote,
  Task } from
'./types';

export const leads: Lead[] = [
{
  id: 'l1',
  personId: 'p1',
  source: 'Website',
  score: 92,
  status: 'Qualified',
  ownerId: 'o1',
  createdAt: '2024-06-12',
  value: 18500
},
{
  id: 'l2',
  personId: 'p2',
  source: 'Referral',
  score: 84,
  status: 'Contacted',
  ownerId: 'o2',
  createdAt: '2024-06-13',
  value: 24200
},
{
  id: 'l3',
  personId: 'p3',
  source: 'Google Ads',
  score: 71,
  status: 'New',
  ownerId: 'o3',
  createdAt: '2024-06-14',
  value: 16800
},
{
  id: 'l4',
  personId: 'p4',
  source: 'Event',
  score: 88,
  status: 'Qualified',
  ownerId: 'o1',
  createdAt: '2024-06-11',
  value: 21600
},
{
  id: 'l5',
  personId: 'p5',
  source: 'Facebook',
  score: 65,
  status: 'Contacted',
  ownerId: 'o4',
  createdAt: '2024-06-10',
  value: 27100
},
{
  id: 'l6',
  personId: 'p6',
  source: 'Website',
  score: 47,
  status: 'Unqualified',
  ownerId: 'o2',
  createdAt: '2024-06-09',
  value: 9800
},
{
  id: 'l7',
  personId: 'p9',
  source: 'Walk-in',
  score: 79,
  status: 'New',
  ownerId: 'o3',
  createdAt: '2024-06-15',
  value: 14300
},
{
  id: 'l8',
  personId: 'p11',
  source: 'Manual',
  score: 90,
  status: 'Qualified',
  ownerId: 'o1',
  createdAt: '2024-06-08',
  value: 33400
}];


export const deals: Deal[] = [
{
  id: 'd1',
  personId: 'p9',
  title: 'Atlas Cloud platform',
  value: 14300,
  stage: 'New',
  probability: 20,
  ownerId: 'o3',
  closeDate: '2024-08-01'
},
{
  id: 'd2',
  personId: 'p6',
  title: 'Brightpath rollout',
  value: 9800,
  stage: 'Contacted',
  probability: 30,
  ownerId: 'o2',
  closeDate: '2024-07-28'
},
{
  id: 'd3',
  personId: 'p1',
  title: 'Lattice enterprise',
  value: 18500,
  stage: 'Qualified',
  probability: 55,
  ownerId: 'o1',
  closeDate: '2024-07-20'
},
{
  id: 'd4',
  personId: 'p2',
  title: 'Harbor expansion',
  value: 24200,
  stage: 'Qualified',
  probability: 50,
  ownerId: 'o2',
  closeDate: '2024-07-22'
},
{
  id: 'd5',
  personId: 'p11',
  title: 'Sakura integration',
  value: 33400,
  stage: 'Meeting',
  probability: 60,
  ownerId: 'o1',
  closeDate: '2024-07-18'
},
{
  id: 'd6',
  personId: 'p3',
  title: 'Vercelink annual',
  value: 16800,
  stage: 'Proposal',
  probability: 70,
  ownerId: 'o3',
  closeDate: '2024-07-15'
},
{
  id: 'd7',
  personId: 'p4',
  title: 'Horizon AI suite',
  value: 21600,
  stage: 'Proposal',
  probability: 68,
  ownerId: 'o1',
  closeDate: '2024-07-16'
},
{
  id: 'd8',
  personId: 'p5',
  title: 'Nimbus Health deal',
  value: 27100,
  stage: 'Negotiation',
  probability: 82,
  ownerId: 'o4',
  closeDate: '2024-07-12'
},
{
  id: 'd9',
  personId: 'p8',
  title: 'Meridian upgrade',
  value: 41200,
  stage: 'Won',
  probability: 100,
  ownerId: 'o2',
  closeDate: '2024-06-30'
},
{
  id: 'd10',
  personId: 'p10',
  title: 'Northwind renewal',
  value: 12500,
  stage: 'Lost',
  probability: 0,
  ownerId: 'o4',
  closeDate: '2024-06-25'
}];


export const customers: Customer[] = [
{
  id: 'c1',
  personId: 'p8',
  status: 'VIP',
  industry: 'Consulting',
  website: 'meridian.com',
  tags: ['Enterprise', 'Renewal'],
  lifetimeValue: 184000,
  address: 'Chicago, IL'
},
{
  id: 'c2',
  personId: 'p1',
  status: 'Customer',
  industry: 'Software',
  website: 'latticelabs.io',
  tags: ['SaaS'],
  lifetimeValue: 62000,
  address: 'San Francisco, CA'
},
{
  id: 'c3',
  personId: 'p2',
  status: 'Prospect',
  industry: 'Logistics',
  website: 'harborco.com',
  tags: ['Expansion'],
  lifetimeValue: 24200,
  address: 'New York, NY'
},
{
  id: 'c4',
  personId: 'p5',
  status: 'Customer',
  industry: 'Healthcare',
  website: 'nimbushealth.com',
  tags: ['Priority'],
  lifetimeValue: 91000,
  address: 'Boston, MA'
},
{
  id: 'c5',
  personId: 'p10',
  status: 'Inactive',
  industry: 'Retail',
  website: 'northwind.co',
  tags: ['Churned'],
  lifetimeValue: 12500,
  address: 'Dallas, TX'
},
{
  id: 'c6',
  personId: 'p11',
  status: 'Lead',
  industry: 'Manufacturing',
  website: 'sakura.jp',
  tags: ['International'],
  lifetimeValue: 33400,
  address: 'Tokyo, JP'
}];


export const products: Product[] = [
{
  id: 'pr1',
  name: 'Growth Suite',
  category: 'Platform',
  price: 4900,
  stock: 999,
  variants: 3,
  status: 'In stock'
},
{
  id: 'pr2',
  name: 'Sales Copilot AI',
  category: 'Add-on',
  price: 1200,
  stock: 999,
  variants: 2,
  status: 'In stock'
},
{
  id: 'pr3',
  name: 'Analytics Pro',
  category: 'Add-on',
  price: 890,
  stock: 14,
  variants: 1,
  status: 'Low stock'
},
{
  id: 'pr4',
  name: 'Onboarding Package',
  category: 'Service',
  price: 3500,
  stock: 0,
  variants: 1,
  status: 'Out of stock'
},
{
  id: 'pr5',
  name: 'Enterprise Seat',
  category: 'License',
  price: 320,
  stock: 240,
  variants: 4,
  status: 'In stock'
},
{
  id: 'pr6',
  name: 'API Gateway',
  category: 'Platform',
  price: 1600,
  stock: 42,
  variants: 2,
  status: 'In stock'
}];


export const quotes: Quote[] = [
{
  id: 'q1',
  number: 'QT-1042',
  personId: 'p1',
  amount: 18500,
  status: 'Sent',
  version: 2,
  createdAt: '2024-06-14',
  items: 4
},
{
  id: 'q2',
  number: 'QT-1041',
  personId: 'p4',
  amount: 21600,
  status: 'Approved',
  version: 1,
  createdAt: '2024-06-12',
  items: 3
},
{
  id: 'q3',
  number: 'QT-1040',
  personId: 'p3',
  amount: 16800,
  status: 'Draft',
  version: 1,
  createdAt: '2024-06-15',
  items: 2
},
{
  id: 'q4',
  number: 'QT-1039',
  personId: 'p5',
  amount: 27100,
  status: 'Sent',
  version: 3,
  createdAt: '2024-06-10',
  items: 5
},
{
  id: 'q5',
  number: 'QT-1038',
  personId: 'p2',
  amount: 24200,
  status: 'Rejected',
  version: 2,
  createdAt: '2024-06-08',
  items: 3
}];


export const invoices: Invoice[] = [
{
  id: 'i1',
  number: 'INV-2201',
  personId: 'p8',
  amount: 41200,
  tax: 3296,
  discount: 1000,
  status: 'Paid',
  dueDate: '2024-06-30'
},
{
  id: 'i2',
  number: 'INV-2202',
  personId: 'p1',
  amount: 18500,
  tax: 1480,
  discount: 0,
  status: 'Pending',
  dueDate: '2024-07-20'
},
{
  id: 'i3',
  number: 'INV-2203',
  personId: 'p5',
  amount: 27100,
  tax: 2168,
  discount: 500,
  status: 'Overdue',
  dueDate: '2024-06-18'
},
{
  id: 'i4',
  number: 'INV-2204',
  personId: 'p4',
  amount: 21600,
  tax: 1728,
  discount: 0,
  status: 'Draft',
  dueDate: '2024-07-25'
},
{
  id: 'i5',
  number: 'INV-2205',
  personId: 'p2',
  amount: 24200,
  tax: 1936,
  discount: 200,
  status: 'Pending',
  dueDate: '2024-07-15'
}];


export const tasks: Task[] = [
{
  id: 't1',
  title: 'Follow up with Maya Patel',
  priority: 'High',
  dueDate: 'Today',
  ownerId: 'o4',
  done: false,
  checklistTotal: 3,
  checklistDone: 1
},
{
  id: 't2',
  title: 'Send Horizon AI proposal v2',
  priority: 'High',
  dueDate: 'Today',
  ownerId: 'o1',
  done: false,
  checklistTotal: 4,
  checklistDone: 3
},
{
  id: 't3',
  title: 'Prep Sakura integration demo',
  priority: 'Medium',
  dueDate: 'Tomorrow',
  ownerId: 'o1',
  done: false,
  checklistTotal: 5,
  checklistDone: 2
},
{
  id: 't4',
  title: 'Review Northwind churn notes',
  priority: 'Low',
  dueDate: 'Jun 20',
  ownerId: 'o2',
  done: true,
  checklistTotal: 2,
  checklistDone: 2
},
{
  id: 't5',
  title: 'Confirm Lattice renewal terms',
  priority: 'Medium',
  dueDate: 'Jun 21',
  ownerId: 'o1',
  done: false,
  checklistTotal: 3,
  checklistDone: 0
},
{
  id: 't6',
  title: 'Update Meridian account plan',
  priority: 'Low',
  dueDate: 'Jun 24',
  ownerId: 'o2',
  done: false,
  checklistTotal: 4,
  checklistDone: 1
}];


export const calendarEvents: CalendarEvent[] = [
{
  id: 'e1',
  title: 'Sakura demo',
  day: 18,
  type: 'Meeting',
  time: '10:00',
  sync: 'Google'
},
{
  id: 'e2',
  title: 'Maya Patel call',
  day: 18,
  type: 'Call',
  time: '14:00',
  sync: 'Outlook'
},
{
  id: 'e3',
  title: 'Team standup',
  day: 19,
  type: 'Meeting',
  time: '09:00',
  sync: 'Google'
},
{
  id: 'e4',
  title: 'Horizon review',
  day: 20,
  type: 'Meeting',
  time: '11:30',
  sync: null
},
{
  id: 'e5',
  title: 'Product webinar',
  day: 24,
  type: 'Event',
  time: '16:00',
  sync: 'Google'
},
{
  id: 'e6',
  title: 'Harbor follow-up',
  day: 26,
  type: 'Call',
  time: '13:00',
  sync: 'Outlook'
}];


export const automations: Automation[] = [
{
  id: 'a1',
  name: 'Auto-assign new leads',
  trigger: 'New lead created',
  action: 'Assign to round-robin rep',
  enabled: true,
  runs: 342
},
{
  id: 'a2',
  name: 'Follow-up reminder',
  trigger: 'No activity for 48h',
  action: 'Create task + notify owner',
  enabled: true,
  runs: 128
},
{
  id: 'a3',
  name: 'Welcome email sequence',
  trigger: 'Lead qualified',
  action: 'Send 3-email sequence',
  enabled: false,
  runs: 61
},
{
  id: 'a4',
  name: 'Deal escalation',
  trigger: 'Deal > $30k in negotiation',
  action: 'Notify sales manager',
  enabled: true,
  runs: 24
},
{
  id: 'a5',
  name: 'Invoice overdue alert',
  trigger: 'Invoice past due date',
  action: 'Slack finance channel',
  enabled: true,
  runs: 17
}];


export const mcpServers: McpServer[] = [
{ id: 'm1', name: 'Gmail', category: 'Email', connected: true },
{ id: 'm2', name: 'Google Calendar', category: 'Calendar', connected: true },
{ id: 'm3', name: 'Slack', category: 'Messaging', connected: true },
{ id: 'm4', name: 'Stripe', category: 'Payments', connected: true },
{ id: 'm5', name: 'PostgreSQL', category: 'Database', connected: false },
{ id: 'm6', name: 'Microsoft Outlook', category: 'Email', connected: false },
{ id: 'm7', name: 'Google Drive', category: 'Storage', connected: true },
{ id: 'm8', name: 'HubSpot', category: 'CRM', connected: false }];


export const revenueSeries = [35, 52, 43, 68, 56, 74, 64, 93, 77, 88, 100, 84];
export const months = [
'Jan',
'Feb',
'Mar',
'Apr',
'May',
'Jun',
'Jul',
'Aug',
'Sep',
'Oct',
'Nov',
'Dec'];


export function currency(n: number): string {
  return '$' + n.toLocaleString('en-US');
}