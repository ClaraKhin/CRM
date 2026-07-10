export type LeadStatus = 'New' | 'Contacted' | 'Qualified' | 'Unqualified';
export type LeadSource =
'Website' |
'Facebook' |
'Google Ads' |
'Referral' |
'Walk-in' |
'Event' |
'Manual';

export type CustomerStatus =
'Lead' |
'Prospect' |
'Customer' |
'VIP' |
'Inactive';
export type PipelineStage =
'New' |
'Contacted' |
'Qualified' |
'Meeting' |
'Proposal' |
'Negotiation' |
'Won' |
'Lost';

export type Person = {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  avatarColor: string;
};

export type Lead = {
  id: string;
  personId: string;
  source: LeadSource;
  score: number;
  status: LeadStatus;
  ownerId: string;
  createdAt: string;
  value: number;
};

export type Deal = {
  id: string;
  personId: string;
  title: string;
  value: number;
  stage: PipelineStage;
  probability: number;
  ownerId: string;
  closeDate: string;
};

export type Customer = {
  id: string;
  personId: string;
  status: CustomerStatus;
  industry: string;
  website: string;
  tags: string[];
  lifetimeValue: number;
  address: string;
};

export type Product = {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  variants: number;
  status: 'In stock' | 'Low stock' | 'Out of stock';
};

export type QuoteStatus = 'Draft' | 'Sent' | 'Approved' | 'Rejected';
export type Quote = {
  id: string;
  number: string;
  personId: string;
  amount: number;
  status: QuoteStatus;
  version: number;
  createdAt: string;
  items: number;
};

export type InvoiceStatus = 'Paid' | 'Pending' | 'Overdue' | 'Draft';
export type Invoice = {
  id: string;
  number: string;
  personId: string;
  amount: number;
  tax: number;
  discount: number;
  status: InvoiceStatus;
  dueDate: string;
};

export type TaskPriority = 'High' | 'Medium' | 'Low';
export type Task = {
  id: string;
  title: string;
  priority: TaskPriority;
  dueDate: string;
  ownerId: string;
  done: boolean;
  checklistTotal: number;
  checklistDone: number;
};

export type CalendarEventType = 'Meeting' | 'Call' | 'Event';
export type CalendarEvent = {
  id: string;
  title: string;
  day: number;
  type: CalendarEventType;
  time: string;
  sync: 'Google' | 'Outlook' | null;
};

export type Automation = {
  id: string;
  name: string;
  trigger: string;
  action: string;
  enabled: boolean;
  runs: number;
};

export type McpServer = {
  id: string;
  name: string;
  category: string;
  connected: boolean;
};