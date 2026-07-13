import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Avatar,
  Badge,
  Box,
  Button,
  Checkbox,
  Collapse,
  Flex,
  FormControl,
  FormLabel,
  Grid,
  HStack,
  Icon,
  IconButton,
  Input,
  InputGroup,
  InputLeftElement,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Popover,
  PopoverArrow,
  PopoverBody,
  PopoverContent,
  PopoverTrigger,
  Select,
  Spinner,
  Stack,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Tag,
  Text,
  Textarea,
  useDisclosure,
  useToast } from
'@chakra-ui/react';
import {
  AlertTriangleIcon,
  ArchiveIcon,
  CalendarClockIcon,
  CalendarIcon,
  CheckCircleIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ClockIcon,
  CopyIcon,
  DownloadIcon,
  FlameIcon,
  LayoutGridIcon,
  ListIcon,
  ListChecksIcon,
  MailIcon,
  MessageSquareIcon,
  MoreHorizontalIcon,
  PhoneIcon,
  PlusIcon,
  RepeatIcon,
  SearchIcon,
  Trash2Icon,
  ZapIcon } from
'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { FormModal } from '../components/ui/FormModal';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { exportToCsv } from '../lib/crud';

type Subtask = { id: string; parent_id: string; title: string; done: boolean; status: string; due_date: string | null; created_at: string };
type Comment = { id: string; task_id: string; body: string; created_at: string; parent_comment_id: string | null };
type Task = {
  id: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  done: boolean;
  due_date: string | null;
  start_date: string | null;
  task_type: string;
  estimated_hours: number;
  actual_hours: number;
  owner_id: string;
  owner_name: string;
  checklist_total: number;
  checklist_done: number;
  recurring: string;
  reminder: boolean;
  archived: boolean;
  lead_id: string | null;
  deal_id: string | null;
  customer_id: string | null;
  quote_id: string | null;
  invoice_id: string | null;
  created_at: string;
};

const OWNERS = [
  { id: 'o1', name: 'Renee Walker', color: '#ffdccb' },
  { id: 'o2', name: 'Marcus Chen', color: '#d8e7ff' },
  { id: 'o3', name: 'Priya Nair', color: '#eadbff' },
  { id: 'o4', name: 'Diego Alvarez', color: '#c9f0e3' }
];
const PRIORITY_OPTIONS = ['Critical', 'High', 'Medium', 'Low'];
const TASK_TYPES = ['To-Do', 'Meeting', 'Call', 'Email', 'Follow-up'];
const RECURRING_OPTIONS = ['None', 'Daily', 'Weekly', 'Monthly'];
const DEFAULT_STATUSES = ['Pending', 'In Progress', 'Done'];
const STATUS_COLORS: Record<string, string> = { Pending: '#b5760f', 'In Progress': '#3355c9', Done: '#1c8a5c' };
const STATUS_BG: Record<string, string> = { Pending: '#fef3e0', 'In Progress': '#e8f0ff', Done: '#e8f5ee' };

const priorityColor: Record<string, string> = { Critical: '#c23c3c', High: '#e9683f', Medium: '#b5760f', Low: '#6b7488' };
const priorityBg: Record<string, string> = { Critical: '#fde8e8', High: '#fff2ec', Medium: '#fef3e0', Low: '#f0f2f5' };
const priorityIcon: Record<string, React.ElementType> = { Critical: AlertTriangleIcon, High: FlameIcon, Medium: ZapIcon, Low: ClockIcon };
const priorityWeight: Record<string, number> = { Critical: 4, High: 3, Medium: 2, Low: 1 };
const typeIcon: Record<string, React.ElementType> = { 'To-Do': ListChecksIcon, Meeting: CalendarIcon, Call: PhoneIcon, Email: MailIcon, 'Follow-up': RepeatIcon };

const CRM_ENTITY_LABELS: Record<string, string> = { lead_id: 'Lead', deal_id: 'Deal', customer_id: 'Customer', quote_id: 'Quote', invoice_id: 'Invoice' };

function formatRelative(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = Math.round((d.getTime() - now.getTime()) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  if (diff < 0) return `${Math.abs(diff)}d overdue`;
  if (diff <= 7) return `In ${diff}d`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function Tasks() {
  const toast = useToast();
  const { session } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [customStatuses, setCustomStatuses] = useState<{ id: string; name: string; color: string; position: number }[]>([]);
  const [leads, setLeads] = useState<{ id: string; person_id: string | null }[]>([]);
  const [people, setPeople] = useState<{ id: string; name: string; company: string }[]>([]);
  const [deals, setDeals] = useState<{ id: string; title: string }[]>([]);
  const [customers, setCustomers] = useState<{ id: string }[]>([]);
  const [quotes, setQuotes] = useState<{ id: string; number: string }[]>([]);
  const [invoices, setInvoices] = useState<{ id: string; number: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'list' | 'kanban'>('list');
  const [search, setSearch] = useState('');
  const [filterPriority, setFilterPriority] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterOwner, setFilterOwner] = useState('All');
  const [filterType, setFilterType] = useState('All');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [newSubtaskParent, setNewSubtaskParent] = useState<string | null>(null);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [newCommentText, setNewCommentText] = useState('');
  const [dragTaskId, setDragTaskId] = useState<string | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'priority' | 'due_date' | 'created_at'>('priority');

  const formModal = useDisclosure();
  const detailModal = useDisclosure();
  const confirmDel = useDisclosure();
  const confirmBulk = useDisclosure();
  const confirmBulkStatus = useDisclosure();
  const statusModal = useDisclosure();
  const [editing, setEditing] = useState<Task | null>(null);
  const [detailTask, setDetailTask] = useState<Task | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [bulkStatusValue, setBulkStatusValue] = useState('Pending');
  const [saving, setSaving] = useState(false);
  const [newStatusName, setNewStatusName] = useState('');
  const [newStatusColor, setNewStatusColor] = useState('#6b7488');
  const [form, setForm] = useState({
    title: '', description: '', priority: 'Medium', status: 'Pending', due_date: '', start_date: '',
    task_type: 'To-Do', owner_id: 'o1', estimated_hours: 0, recurring: 'None', reminder: true,
    lead_id: '', deal_id: '', customer_id: '', quote_id: '', invoice_id: ''
  });

  const allStatuses = useMemo(() => {
    const customs = customStatuses.map((s) => s.name);
    const merged = [...DEFAULT_STATUSES];
    for (const c of customs) if (!merged.includes(c)) merged.push(c);
    return merged;
  }, [customStatuses]);

  const load = useCallback(async () => {
    if (!session?.user) return;
    setLoading(true);
    const [tRes, sRes, cRes, csRes, lRes, pRes, dRes, custRes, qRes, invRes] = await Promise.all([
      supabase.from('tasks').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false }),
      supabase.from('subtasks').select('*').eq('user_id', session.user.id).order('created_at', { ascending: true }),
      supabase.from('task_comments').select('*').eq('user_id', session.user.id).order('created_at', { ascending: true }),
      supabase.from('task_statuses').select('*').eq('user_id', session.user.id).order('position', { ascending: true }),
      supabase.from('leads').select('id, person_id').eq('user_id', session.user.id),
      supabase.from('people').select('id, name, company').eq('user_id', session.user.id),
      supabase.from('deals').select('id, title').eq('user_id', session.user.id),
      supabase.from('customers').select('id').eq('user_id', session.user.id),
      supabase.from('quotes').select('id, number').eq('user_id', session.user.id),
      supabase.from('invoices').select('id, number').eq('user_id', session.user.id)
    ]);
    setTasks((tRes.data ?? []) as Task[]);
    setSubtasks((sRes.data ?? []) as Subtask[]);
    setComments((cRes.data ?? []) as Comment[]);
    setCustomStatuses((csRes.data ?? []) as { id: string; name: string; color: string; position: number }[]);
    setLeads((lRes.data ?? []) as { id: string; person_id: string | null }[]);
    setPeople((pRes.data ?? []) as { id: string; name: string; company: string }[]);
    setDeals((dRes.data ?? []) as { id: string; title: string }[]);
    setCustomers((custRes.data ?? []) as { id: string }[]);
    setQuotes((qRes.data ?? []) as { id: string; number: string }[]);
    setInvoices((invRes.data ?? []) as { id: string; number: string }[]);
    setLoading(false);
  }, [session]);

  useEffect(() => { load(); }, [load]);

  const subtasksFor = (parentId: string) => subtasks.filter((s) => s.parent_id === parentId);
  const commentsFor = (taskId: string) => comments.filter((c) => c.task_id === taskId && !c.parent_comment_id);
  const personName = (personId: string | null) => people.find((p) => p.id === personId)?.name ?? 'Unknown';
  const leadName = (leadId: string | null) => { const l = leads.find((ld) => ld.id === leadId); return l ? personName(l.person_id) : ''; };
  const dealTitle = (dealId: string | null) => deals.find((d) => d.id === dealId)?.title ?? '';
  const quoteNumber = (quoteId: string | null) => quotes.find((q) => q.id === quoteId)?.number ?? '';
  const invoiceNumber = (invId: string | null) => invoices.find((i) => i.id === invId)?.number ?? '';

  const crmLinks = (task: Task) => {
    const links: { label: string; value: string }[] = [];
    if (task.lead_id) links.push({ label: 'Lead', value: leadName(task.lead_id) });
    if (task.deal_id) links.push({ label: 'Deal', value: dealTitle(task.deal_id) });
    if (task.customer_id) links.push({ label: 'Customer', value: 'Linked' });
    if (task.quote_id) links.push({ label: 'Quote', value: quoteNumber(task.quote_id) });
    if (task.invoice_id) links.push({ label: 'Invoice', value: invoiceNumber(task.invoice_id) });
    return links;
  };

  // Filtering + sorting
  const filtered = useMemo(() => {
    let result = tasks.filter((t) => !t.archived);
    if (filterPriority !== 'All') result = result.filter((t) => t.priority === filterPriority);
    if (filterStatus !== 'All') result = result.filter((t) => t.status === filterStatus);
    if (filterOwner !== 'All') result = result.filter((t) => t.owner_id === filterOwner);
    if (filterType !== 'All') result = result.filter((t) => t.task_type === filterType);
    if (search.trim()) result = result.filter((t) => t.title.toLowerCase().includes(search.toLowerCase()) || t.description.toLowerCase().includes(search.toLowerCase()));
    // Sort
    result = [...result].sort((a, b) => {
      if (sortBy === 'priority') {
        const pd = priorityWeight[b.priority] - priorityWeight[a.priority];
        if (pd !== 0) return pd;
        return (a.due_date ?? '9999').localeCompare(b.due_date ?? '9999');
      }
      if (sortBy === 'due_date') return (a.due_date ?? '9999').localeCompare(b.due_date ?? '9999');
      return (b.created_at ?? '').localeCompare(a.created_at ?? '');
    });
    return result;
  }, [tasks, filterPriority, filterStatus, filterOwner, filterType, search, sortBy]);

  // Analytics
  const stats = useMemo(() => {
    const active = tasks.filter((t) => !t.archived);
    const done = active.filter((t) => t.done);
    const pending = active.filter((t) => !t.done && t.status === 'Pending');
    const inProgress = active.filter((t) => t.status === 'In Progress');
    const overdue = active.filter((t) => !t.done && t.due_date && new Date(t.due_date) < new Date(new Date().toDateString()));
    const dueSoon = active.filter((t) => !t.done && t.due_date && new Date(t.due_date) <= new Date(Date.now() + 86400000) && new Date(t.due_date) >= new Date(new Date().toDateString()));
    const completionRate = active.length > 0 ? Math.round((done.length / active.length) * 100) : 0;
    const byOwner = OWNERS.map((o) => ({ ...o, count: active.filter((t) => t.owner_id === o.id).length }));
    return { total: active.length, done: done.length, pending: pending.length, inProgress: inProgress.length, overdue: overdue.length, dueSoon: dueSoon.length, completionRate, byOwner };
  }, [tasks]);

  const toggleExpand = (id: string) => setExpandedIds((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const toggleSelect = (id: string) => setSelectedIds((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const toggleSelectAll = () => setSelectedIds((prev) => prev.size === filtered.length ? new Set() : new Set(filtered.map((t) => t.id)));

  const updateTaskState = (id: string, patch: Partial<Task>) => setTasks((prev) => prev.map((t) => t.id === id ? { ...t, ...patch } : t));

  const toggleDone = async (id: string) => {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    const newDone = !task.done;
    updateTaskState(id, { done: newDone, status: newDone ? 'Done' : 'Pending' });
    await supabase.from('tasks').update({ done: newDone, status: newDone ? 'Done' : 'Pending' }).eq('id', id).eq('user_id', session!.user.id);
  };

  const changeStatus = async (id: string, status: string) => {
    updateTaskState(id, { status, done: status === 'Done' });
    await supabase.from('tasks').update({ status, done: status === 'Done' }).eq('id', id).eq('user_id', session!.user.id);
  };

  const toggleSubtaskDone = async (subId: string) => {
    const st = subtasks.find((s) => s.id === subId);
    if (!st) return;
    const newDone = !st.done;
    setSubtasks((prev) => prev.map((s) => s.id === subId ? { ...s, done: newDone, status: newDone ? 'Done' : 'Pending' } : s));
    await supabase.from('subtasks').update({ done: newDone, status: newDone ? 'Done' : 'Pending' }).eq('id', subId).eq('user_id', session!.user.id);
    // Update parent checklist
    const parent = tasks.find((t) => t.id === st.parent_id);
    if (parent) {
      const siblings = subtasks.filter((s) => s.parent_id === st.parent_id);
      const doneCount = siblings.filter((s) => s.done).length + (newDone ? 1 : -1) - (st.done ? 1 : 0);
      const clamped = Math.max(0, doneCount);
      updateTaskState(parent.id, { checklist_done: clamped });
      await supabase.from('tasks').update({ checklist_done: clamped }).eq('id', parent.id).eq('user_id', session!.user.id);
    }
  };

  const addSubtask = async () => {
    if (!newSubtaskTitle.trim() || !newSubtaskParent) return;
    const { data } = await supabase.from('subtasks').insert({
      user_id: session!.user.id, parent_id: newSubtaskParent, title: newSubtaskTitle.trim(), status: 'Pending'
    }).select().maybeSingle();
    if (data) {
      setSubtasks((prev) => [...prev, data as Subtask]);
      const parent = tasks.find((t) => t.id === newSubtaskParent);
      if (parent) {
        const newTotal = parent.checklist_total + 1;
        updateTaskState(parent.id, { checklist_total: newTotal });
        await supabase.from('tasks').update({ checklist_total: newTotal }).eq('id', parent.id).eq('user_id', session!.user.id);
      }
    }
    setNewSubtaskTitle('');
  };

  const deleteSubtask = async (subId: string) => {
    const st = subtasks.find((s) => s.id === subId);
    setSubtasks((prev) => prev.filter((s) => s.id !== subId));
    await supabase.from('subtasks').delete().eq('id', subId).eq('user_id', session!.user.id);
    if (st) {
      const parent = tasks.find((t) => t.id === st.parent_id);
      if (parent && parent.checklist_total > 0) {
        const newTotal = parent.checklist_total - 1;
        const newDone = Math.min(parent.checklist_done, newTotal);
        updateTaskState(parent.id, { checklist_total: newTotal, checklist_done: newDone });
        await supabase.from('tasks').update({ checklist_total: newTotal, checklist_done: newDone }).eq('id', parent.id).eq('user_id', session!.user.id);
      }
    }
  };

  const addComment = async (taskId: string) => {
    if (!newCommentText.trim()) return;
    const { data } = await supabase.from('task_comments').insert({
      user_id: session!.user.id, task_id: taskId, body: newCommentText.trim()
    }).select().maybeSingle();
    if (data) setComments((prev) => [...prev, data as Comment]);
    setNewCommentText('');
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ title: '', description: '', priority: 'Medium', status: 'Pending', due_date: '', start_date: '', task_type: 'To-Do', owner_id: 'o1', estimated_hours: 0, recurring: 'None', reminder: true, lead_id: '', deal_id: '', customer_id: '', quote_id: '', invoice_id: '' });
    formModal.onOpen();
  };

  const openEdit = (task: Task) => {
    setEditing(task);
    setForm({
      title: task.title, description: task.description, priority: task.priority, status: task.status,
      due_date: task.due_date ?? '', start_date: task.start_date ?? '', task_type: task.task_type,
      owner_id: task.owner_id, estimated_hours: task.estimated_hours, recurring: task.recurring, reminder: task.reminder,
      lead_id: task.lead_id ?? '', deal_id: task.deal_id ?? '', customer_id: task.customer_id ?? '', quote_id: task.quote_id ?? '', invoice_id: task.invoice_id ?? ''
    });
    formModal.onOpen();
  };

  const openDetail = (task: Task) => { setDetailTask(task); detailModal.onOpen(); };

  const handleSubmit = async () => {
    if (!form.title.trim()) { toast({ title: 'Title is required', status: 'error', duration: 2000, position: 'top-right' }); return; }
    const owner = OWNERS.find((o) => o.id === form.owner_id) ?? OWNERS[0];
    const crmLinks = { lead_id: form.lead_id || null, deal_id: form.deal_id || null, customer_id: form.customer_id || null, quote_id: form.quote_id || null, invoice_id: form.invoice_id || null };
    setSaving(true);
    if (editing) {
      const { error } = await supabase.from('tasks').update({
        title: form.title, description: form.description, priority: form.priority, status: form.status,
        due_date: form.due_date || null, start_date: form.start_date || null, task_type: form.task_type,
        owner_id: form.owner_id, owner_name: owner.name, estimated_hours: Number(form.estimated_hours),
        recurring: form.recurring, reminder: form.reminder, ...crmLinks
      }).eq('id', editing.id).eq('user_id', session!.user.id);
      if (!error) toast({ title: 'Task updated', status: 'success', duration: 2000, position: 'top-right' });
    } else {
      const { error } = await supabase.from('tasks').insert({
        user_id: session!.user.id, title: form.title, description: form.description, priority: form.priority,
        status: 'Pending', done: false, due_date: form.due_date || null, start_date: form.start_date || null,
        task_type: form.task_type, owner_id: form.owner_id, owner_name: owner.name,
        estimated_hours: Number(form.estimated_hours), checklist_total: 0, checklist_done: 0,
        recurring: form.recurring, reminder: form.reminder, ...crmLinks
      });
      if (!error) toast({ title: 'Task created', status: 'success', duration: 2000, position: 'top-right' });
    }
    setSaving(false);
    formModal.onClose();
    load();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await supabase.from('tasks').delete().eq('id', deleteId).eq('user_id', session!.user.id);
    toast({ title: 'Task deleted', status: 'success', duration: 1800, position: 'top-right' });
    confirmDel.onClose(); setDeleteId(null); detailModal.onClose(); load();
  };

  const handleBulkDelete = async () => {
    await supabase.from('tasks').delete().in('id', Array.from(selectedIds)).eq('user_id', session!.user.id);
    toast({ title: `${selectedIds.size} tasks deleted`, status: 'success', duration: 2000, position: 'top-right' });
    setSelectedIds(new Set()); confirmBulk.onClose(); load();
  };

  const handleBulkStatus = async () => {
    await supabase.from('tasks').update({ status: bulkStatusValue, done: bulkStatusValue === 'Done' }).in('id', Array.from(selectedIds)).eq('user_id', session!.user.id);
    toast({ title: `${selectedIds.size} tasks updated to ${bulkStatusValue}`, status: 'success', duration: 2000, position: 'top-right' });
    setSelectedIds(new Set()); confirmBulkStatus.onClose(); load();
  };

  const duplicateTask = async (task: Task) => {
    const owner = OWNERS.find((o) => o.id === task.owner_id) ?? OWNERS[0];
    await supabase.from('tasks').insert({
      user_id: session!.user.id, title: `${task.title} (copy)`, description: task.description, priority: task.priority,
      status: 'Pending', done: false, due_date: task.due_date, task_type: task.task_type,
      owner_id: task.owner_id, owner_name: owner.name, recurring: task.recurring, reminder: task.reminder,
      lead_id: task.lead_id, deal_id: task.deal_id, customer_id: task.customer_id, quote_id: task.quote_id, invoice_id: task.invoice_id
    });
    toast({ title: 'Task duplicated', status: 'success', duration: 1800, position: 'top-right' });
    load();
  };

  const archiveTask = async (task: Task) => {
    updateTaskState(task.id, { archived: true });
    await supabase.from('tasks').update({ archived: true }).eq('id', task.id).eq('user_id', session!.user.id);
    toast({ title: 'Task archived', status: 'success', duration: 1800, position: 'top-right' });
  };

  const snoozeTask = async (task: Task) => {
    const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
    const newDate = tomorrow.toISOString().split('T')[0];
    updateTaskState(task.id, { due_date: newDate });
    await supabase.from('tasks').update({ due_date: newDate }).eq('id', task.id).eq('user_id', session!.user.id);
    toast({ title: `Snoozed to ${newDate}`, status: 'success', duration: 1800, position: 'top-right' });
  };

  const convertToCalendar = async (task: Task) => {
    await supabase.from('events').insert({
      user_id: session!.user.id, title: task.title, type: 'Meeting', event_date: task.due_date ?? new Date().toISOString().split('T')[0],
      time: '09:00', description: task.description
    });
    toast({ title: 'Converted to calendar event', status: 'success', duration: 2000, position: 'top-right' });
  };

  const handleExport = () => {
    const rows = filtered.map((t) => ({
      title: t.title, priority: t.priority, status: t.status, type: t.task_type, owner: t.owner_name,
      due_date: t.due_date ?? '', estimated_hours: t.estimated_hours, recurring: t.recurring, created: t.created_at
    }));
    exportToCsv('tasks.csv', rows);
    toast({ title: 'Exported to CSV', status: 'success', duration: 1800, position: 'top-right' });
  };

  const addCustomStatus = async () => {
    if (!newStatusName.trim()) return;
    await supabase.from('task_statuses').insert({
      user_id: session!.user.id, name: newStatusName.trim(), color: newStatusColor, position: customStatuses.length
    });
    setNewStatusName(''); statusModal.onClose(); load();
    toast({ title: 'Custom status added', status: 'success', duration: 1800, position: 'top-right' });
  };

  const onDragStart = (id: string) => setDragTaskId(id);
  const onDragOverStatus = (status: string) => { if (dragTaskId) { setDragOverStatus(status); } };
  const onDropStatus = async (status: string) => {
    if (!dragTaskId) return;
    await changeStatus(dragTaskId, status);
    setDragTaskId(null); setDragOverStatus(null);
  };

  // Kanban columns
  const kanbanColumns = allStatuses.map((status) => ({
    status, items: filtered.filter((t) => t.status === status)
  }));

  const TaskRow = ({ task }: { task: Task }) => {
    const owner = OWNERS.find((o) => o.id === task.owner_id) ?? OWNERS[0];
    const isOverdue = !task.done && task.due_date && new Date(task.due_date) < new Date(new Date().toDateString());
    const isDueSoon = !task.done && task.due_date && new Date(task.due_date) <= new Date(Date.now() + 86400000) && !isOverdue;
    const isExpanded = expandedIds.has(task.id);
    const taskSubs = subtasksFor(task.id);
    const links = crmLinks(task);
    const TIcon = typeIcon[task.task_type] ?? ListChecksIcon;
    return (
      <Box>
        <Flex align="center" gap="10px" py="12px" borderBottom="1px solid" borderColor="app.border" opacity={task.done ? 0.5 : 1} _hover={{ bg: 'app.surfaceAlt' }} borderRadius="8px" px="6px" transition="background .12s ease">
          <Checkbox isChecked={selectedIds.has(task.id)} onChange={() => toggleSelect(task.id)} colorScheme="orange" onClick={(e) => e.stopPropagation()} />
          <Checkbox isChecked={task.done} onChange={() => toggleDone(task.id)} colorScheme="orange" />
          {taskSubs.length > 0 && <IconButton aria-label="Toggle subtasks" icon={isExpanded ? <ChevronDownIcon size={15} /> : <ChevronRightIcon size={15} />} size="xs" variant="ghost" onClick={() => toggleExpand(task.id)} color="app.subtle" />}
          <Box w="4px" h="28px" borderRadius="full" bg={priorityColor[task.priority]} flexShrink={0} cursor="pointer" onClick={() => openDetail(task)} />
          <Box flex="1" minW="0" cursor="pointer" onClick={() => openDetail(task)}>
            <Flex align="center" gap="6px">
              <Icon as={TIcon} boxSize="11px" color="app.faint" />
              <Text fontSize="13px" fontWeight="600" textDecoration={task.done ? 'line-through' : 'none'} noOfLines={1}>{task.title}</Text>
              {isOverdue && <Badge fontSize="8px" borderRadius="full" px="5px" py="1px" bg="#fde8e8" color="#c23c3c" fontWeight="700">OVERDUE</Badge>}
              {isDueSoon && <Badge fontSize="8px" borderRadius="full" px="5px" py="1px" bg="#fef3e0" color="#b5760f" fontWeight="700">DUE SOON</Badge>}
            </Flex>
            <Flex mt="4px" align="center" gap="10px" flexWrap="wrap">
              {task.due_date && <Flex align="center" gap="4px" color={isOverdue ? '#c23c3c' : 'app.subtle'}><Icon as={CalendarIcon} boxSize="11px" /><Text fontSize="10px" fontWeight={isOverdue ? '700' : '400'}>{formatRelative(task.due_date)}</Text></Flex>}
              {task.recurring !== 'None' && <Flex align="center" gap="4px" color="app.subtle"><Icon as={RepeatIcon} boxSize="11px" /><Text fontSize="10px">{task.recurring}</Text></Flex>}
              {taskSubs.length > 0 && <Flex align="center" gap="4px" color="app.subtle"><Icon as={ListChecksIcon} boxSize="11px" /><Text fontSize="10px">{taskSubs.filter((s) => s.done).length}/{taskSubs.length}</Text></Flex>}
              {task.estimated_hours > 0 && <Flex align="center" gap="4px" color="app.subtle"><Icon as={ClockIcon} boxSize="11px" /><Text fontSize="10px">{task.estimated_hours}h</Text></Flex>}
              {links.map((l) => <Tag key={l.label} size="sm" fontSize="9px" borderRadius="full" px="6px" py="1px" bg="app.surfaceAlt" color="app.subtle">{l.label}: {l.value}</Tag>)}
            </Flex>
          </Box>
          <Badge fontSize="8px" borderRadius="full" px="6px" py="2px" bg={priorityBg[task.priority]} color={priorityColor[task.priority]} textTransform="capitalize">{task.priority}</Badge>
          <Select size="xs" variant="unstyled" maxW="100px" value={task.status} onChange={(e) => { e.stopPropagation(); changeStatus(task.id, e.target.value); }} onClick={(e) => e.stopPropagation()} fontSize="10px" fontWeight="600" color={STATUS_COLORS[task.status] ?? '#6b7488'}>
            {allStatuses.map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>
          <Avatar size="2xs" name={owner.name} bg={owner.color} color="#46506a" fontSize="7px" />
          <Menu placement="bottom-end">
            <MenuButton as={IconButton} aria-label="Task actions" icon={<MoreHorizontalIcon size={14} />} variant="ghost" size="xs" onClick={(e) => e.stopPropagation()} />
            <MenuList bg="app.surface" borderColor="app.border" fontSize="12px">
              <MenuItem bg="app.surface" icon={<CheckCircleIcon size={13} />} onClick={() => toggleDone(task.id)}>{task.done ? 'Mark as Pending' : 'Mark as Done'}</MenuItem>
              <MenuItem bg="app.surface" icon={<ClockIcon size={13} />} onClick={() => snoozeTask(task)}>Snooze 1 day</MenuItem>
              <MenuItem bg="app.surface" icon={<CopyIcon size={13} />} onClick={() => duplicateTask(task)}>Duplicate</MenuItem>
              <MenuItem bg="app.surface" icon={<CalendarIcon size={13} />} onClick={() => convertToCalendar(task)}>Convert to Meeting</MenuItem>
              <MenuItem bg="app.surface" icon={<ArchiveIcon size={13} />} onClick={() => archiveTask(task)}>Archive</MenuItem>
              <MenuItem bg="app.surface" color="#c23c3c" icon={<Trash2Icon size={13} />} onClick={() => { setDeleteId(task.id); confirmDel.onOpen(); }}>Delete</MenuItem>
            </MenuList>
          </Menu>
        </Flex>
        <Collapse in={isExpanded} animateOpacity>
          <Box ml="52px" mt="4px" mb="8px" pl="14px" borderLeft="2px solid" borderColor="app.border">
            {taskSubs.map((st) => (
              <Flex key={st.id} align="center" gap="8px" py="6px" _hover={{ bg: 'app.surfaceAlt' }} borderRadius="6px" px="6px">
                <Checkbox isChecked={st.done} onChange={() => toggleSubtaskDone(st.id)} colorScheme="orange" size="sm" />
                <Text fontSize="12px" flex="1" textDecoration={st.done ? 'line-through' : 'none'} color={st.done ? 'app.faint' : 'app.subtle'}>{st.title}</Text>
                {st.due_date && <Text fontSize="10px" color="app.faint">{formatRelative(st.due_date)}</Text>}
                <IconButton aria-label="Delete subtask" icon={<Trash2Icon size={11} />} size="xs" variant="ghost" color="#c23c3c" onClick={() => deleteSubtask(st.id)} />
              </Flex>
            ))}
            <Flex align="center" gap="8px" py="6px" px="6px">
              <PlusIcon size={14} color="#8a93a6" />
              <Input size="xs" placeholder="Add subtask..." value={newSubtaskParent === task.id ? newSubtaskTitle : ''} onChange={(e) => { setNewSubtaskParent(task.id); setNewSubtaskTitle(e.target.value); }} onKeyDown={(e) => { if (e.key === 'Enter') addSubtask(); }} borderRadius="6px" borderColor="app.border" fontSize="11px" maxW="300px" />
              {newSubtaskParent === task.id && newSubtaskTitle.trim() && <Button size="xs" variant="ghost" color="#1c8a5c" onClick={addSubtask}>Add</Button>}
            </Flex>
          </Box>
        </Collapse>
      </Box>
    );
  };

  const KanbanCard = ({ task }: { task: Task }) => {
    const owner = OWNERS.find((o) => o.id === task.owner_id) ?? OWNERS[0];
    const isOverdue = !task.done && task.due_date && new Date(task.due_date) < new Date(new Date().toDateString());
    const taskSubs = subtasksFor(task.id);
    const PIcon = priorityIcon[task.priority] ?? ClockIcon;
    return (
      <Box
        draggable
        onDragStart={() => onDragStart(task.id)}
        onClick={() => openDetail(task)}
        bg="app.surface"
        borderRadius="10px"
        border="1px solid"
        borderColor={isOverdue ? '#fde8e8' : 'app.border'}
        borderLeftWidth="3px"
        borderLeftColor={priorityColor[task.priority]}
        p="12px"
        cursor="grab"
        _active={{ cursor: 'grabbing' }}
        _hover={{ boxShadow: '0 4px 12px rgba(0,0,0,0.06)', transform: 'translateY(-1px)' }}
        transition="all .15s ease">
        <Flex justify="space-between" align="start" gap="6px">
          <Text fontSize="12px" fontWeight="600" flex="1" noOfLines={2}>{task.title}</Text>
          <Icon as={PIcon} boxSize="13px" color={priorityColor[task.priority]} flexShrink={0} />
        </Flex>
        {task.description && <Text fontSize="10px" color="app.subtle" mt="4px" noOfLines={1}>{task.description}</Text>}
        <Flex mt="8px" align="center" gap="6px" flexWrap="wrap">
          {task.due_date && <Flex align="center" gap="3px" color={isOverdue ? '#c23c3c' : 'app.subtle'}><CalendarIcon size={10} /><Text fontSize="9px" fontWeight={isOverdue ? '700' : '400'}>{formatRelative(task.due_date)}</Text></Flex>}
          {taskSubs.length > 0 && <Flex align="center" gap="3px" color="app.subtle"><ListChecksIcon size={10} /><Text fontSize="9px">{taskSubs.filter((s) => s.done).length}/{taskSubs.length}</Text></Flex>}
          {task.estimated_hours > 0 && <Flex align="center" gap="3px" color="app.subtle"><ClockIcon size={10} /><Text fontSize="9px">{task.estimated_hours}h</Text></Flex>}
        </Flex>
        <Flex mt="8px" justify="space-between" align="center">
          <Avatar size="2xs" name={owner.name} bg={owner.color} color="#46506a" fontSize="7px" />
          <Badge fontSize="8px" borderRadius="full" px="5px" py="1px" bg={priorityBg[task.priority]} color={priorityColor[task.priority]}>{task.priority}</Badge>
        </Flex>
      </Box>
    );
  };

  return (
    <>
      <PageHeader
        title="Tasks"
        subtitle="Enterprise task management with sub-tasks, CRM linking, and analytics."
        actions={
          <HStack spacing="6px">
            <Button size="sm" variant="outline" borderColor="app.border" borderRadius="9px" fontSize="12px" leftIcon={<DownloadIcon size={14} />} onClick={handleExport}>Export</Button>
            <Button size="sm" variant="outline" borderColor="app.border" borderRadius="9px" fontSize="12px" leftIcon={<PlusIcon size={14} />} onClick={statusModal.onOpen}>Status</Button>
            <Button size="sm" borderRadius="9px" bg="navy.600" color="white" _hover={{ bg: 'navy.500' }} leftIcon={<PlusIcon size={15} />} fontSize="12px" onClick={openCreate}>New task</Button>
          </HStack>
        } />

      {/* Analytics Dashboard */}
      <Grid templateColumns={{ base: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)', lg: 'repeat(6, 1fr)' }} gap="10px" mb="14px">
        {[
          { label: 'Completion Rate', value: `${stats.completionRate}%`, icon: CheckCircleIcon, color: '#1c8a5c', bg: '#e8f5ee' },
          { label: 'Pending', value: stats.pending, icon: ClockIcon, color: '#b5760f', bg: '#fef3e0' },
          { label: 'In Progress', value: stats.inProgress, icon: ZapIcon, color: '#3355c9', bg: '#e8f0ff' },
          { label: 'Done', value: stats.done, icon: CheckCircleIcon, color: '#1c8a5c', bg: '#e8f5ee' },
          { label: 'Overdue', value: stats.overdue, icon: AlertTriangleIcon, color: '#c23c3c', bg: '#fde8e8' },
          { label: 'Due Soon', value: stats.dueSoon, icon: CalendarClockIcon, color: '#e9683f', bg: '#fff2ec' }
        ].map((stat) => {
          const SIcon = stat.icon;
          return (
            <Card key={stat.label} p="12px">
              <Flex align="center" gap="8px">
                <Flex w="32px" h="32px" align="center" justify="center" borderRadius="8px" bg={stat.bg} flexShrink={0}><SIcon size={15} color={stat.color} /></Flex>
                <Box><Text fontSize="16px" fontWeight="800">{stat.value}</Text><Text fontSize="9px" color="app.subtle">{stat.label}</Text></Box>
              </Flex>
            </Card>
          );
        })}
      </Grid>

      {/* Workload Distribution */}
      <Card p="14px" mb="14px">
        <Text fontSize="11px" fontWeight="800" letterSpacing="0.05em" textTransform="uppercase" color="app.subtle" mb="10px">Workload Distribution</Text>
        <Flex gap="16px" flexWrap="wrap">
          {stats.byOwner.map((o) => {
            const pct = stats.total > 0 ? (o.count / stats.total) * 100 : 0;
            return (
              <Box key={o.id} flex="1" minW="120px">
                <Flex align="center" gap="6px" mb="4px"><Avatar size="2xs" name={o.name} bg={o.color} color="#46506a" /><Text fontSize="11px" fontWeight="600">{o.name}</Text><Text fontSize="10px" color="app.faint" ml="auto">{o.count}</Text></Flex>
                <Box w="full" h="6px" bg="app.surfaceAlt" borderRadius="full" overflow="hidden"><Box h="full" bg="brand.500" borderRadius="full" style={{ width: `${pct}%` }} /></Box>
              </Box>
            );
          })}
        </Flex>
      </Card>

      {/* View Toggle + Filters */}
      <Card>
        <Flex px="16px" py="10px" gap="10px" align="center" flexWrap="wrap" borderBottom="1px solid" borderColor="app.border">
          <HStack spacing="2px" bg="app.surfaceAlt" borderRadius="9px" p="2px">
            <Button size="xs" borderRadius="7px" fontSize="11px" fontWeight="600" bg={view === 'list' ? 'navy.600' : 'transparent'} color={view === 'list' ? 'white' : 'app.subtle'} _hover={{ bg: view === 'list' ? 'navy.500' : 'app.surface' }} leftIcon={<ListIcon size={13} />} onClick={() => setView('list')}>List</Button>
            <Button size="xs" borderRadius="7px" fontSize="11px" fontWeight="600" bg={view === 'kanban' ? 'navy.600' : 'transparent'} color={view === 'kanban' ? 'white' : 'app.subtle'} _hover={{ bg: view === 'kanban' ? 'navy.500' : 'app.surface' }} leftIcon={<LayoutGridIcon size={13} />} onClick={() => setView('kanban')}>Kanban</Button>
          </HStack>
          <InputGroup maxW="220px" size="sm">
            <InputLeftElement pointerEvents="none"><SearchIcon size={14} color="#8a93a6" /></InputLeftElement>
            <Input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} borderRadius="9px" bg="app.surfaceAlt" borderColor="app.border" fontSize="12px" />
          </InputGroup>
          <Select size="sm" maxW="120px" value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)} borderRadius="9px" borderColor="app.border" fontSize="11px">
            <option value="All">All Priority</option>{PRIORITY_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
          </Select>
          <Select size="sm" maxW="120px" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} borderRadius="9px" borderColor="app.border" fontSize="11px">
            <option value="All">All Status</option>{allStatuses.map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>
          <Select size="sm" maxW="120px" value={filterOwner} onChange={(e) => setFilterOwner(e.target.value)} borderRadius="9px" borderColor="app.border" fontSize="11px">
            <option value="All">All Owner</option>{OWNERS.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
          </Select>
          <Select size="sm" maxW="120px" value={filterType} onChange={(e) => setFilterType(e.target.value)} borderRadius="9px" borderColor="app.border" fontSize="11px">
            <option value="All">All Type</option>{TASK_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </Select>
          <Select size="sm" maxW="120px" value={sortBy} onChange={(e) => setSortBy(e.target.value as 'priority' | 'due_date' | 'created_at')} borderRadius="9px" borderColor="app.border" fontSize="11px">
            <option value="priority">Sort: Priority</option><option value="due_date">Sort: Due Date</option><option value="created_at">Sort: Created</option>
          </Select>
          {selectedIds.size > 0 && (
            <HStack spacing="6px" ml="auto">
              <Button size="xs" variant="outline" borderColor="app.border" borderRadius="7px" fontSize="11px" onClick={() => { setBulkStatusValue('Pending'); confirmBulkStatus.onOpen(); }}>Bulk Status</Button>
              <Button size="xs" variant="outline" borderColor="#c23c3c" color="#c23c3c" borderRadius="7px" fontSize="11px" leftIcon={<Trash2Icon size={12} />} onClick={confirmBulk.onOpen}>Delete ({selectedIds.size})</Button>
            </HStack>
          )}
          <Text ml={selectedIds.size === 0 ? 'auto' : '0'} fontSize="11px" color="app.subtle">{filtered.length} tasks</Text>
        </Flex>

        {loading ? (
          <Flex py="60px" justify="center"><Spinner color="brand.500" /></Flex>
        ) : filtered.length === 0 ? (
          <EmptyState icon={CheckCircleIcon} title="No tasks found" description="Create a new task or adjust your filters." action={<Button size="sm" bg="navy.600" color="white" borderRadius="9px" fontSize="12px" leftIcon={<PlusIcon size={15} />} onClick={openCreate}>New task</Button>} />
        ) : view === 'list' ? (
          <Box px="16px" py="12px">
            <Flex pb="8px" borderBottom="1px solid" borderColor="app.border">
              <Checkbox isChecked={selectedIds.size === filtered.length && filtered.length > 0} onChange={toggleSelectAll} colorScheme="orange" mr="10px" />
            </Flex>
            <Stack spacing="0">{filtered.map((task) => <TaskRow key={task.id} task={task} />)}</Stack>
          </Box>
        ) : (
          <Box p="14px" overflowX="auto">
            <Flex gap="12px" minW="max-content">
              {kanbanColumns.map((col) => (
                <Box key={col.status} w="240px" flexShrink={0}
                  onDragOver={(e) => { e.preventDefault(); onDragOverStatus(col.status); }}
                  onDrop={() => onDropStatus(col.status)}
                  bg={dragOverStatus === col.status ? 'rgba(233,104,63,0.05)' : 'app.surfaceAlt'}
                  borderRadius="12px" p="10px" border="2px dashed" borderColor={dragOverStatus === col.status ? '#e9683f' : 'transparent'} transition="all .15s ease">
                  <Flex align="center" gap="6px" mb="10px">
                    <Box w="6px" h="6px" borderRadius="full" bg={STATUS_COLORS[col.status] ?? '#6b7488'} />
                    <Text fontSize="11px" fontWeight="800" textTransform="uppercase" letterSpacing="0.05em" color="app.subtle">{col.status}</Text>
                    <Badge fontSize="9px" borderRadius="full" px="6px" py="1px" bg="app.surface" color="app.subtle" ml="auto">{col.items.length}</Badge>
                  </Flex>
                  <Stack spacing="8px">
                    {col.items.map((task) => <KanbanCard key={task.id} task={task} />)}
                    {col.items.length === 0 && <Text fontSize="10px" color="app.faint" textAlign="center" py="16px">Drop tasks here</Text>}
                  </Stack>
                </Box>
              ))}
            </Flex>
          </Box>
        )}
      </Card>

      {/* Detail Modal */}
      <Modal isOpen={detailModal.isOpen} onClose={detailModal.onClose} size="lg" isCentered>
        <ModalOverlay backdropFilter="blur(4px)" />
        <ModalContent bg="app.surface" borderRadius="18px" overflow="hidden" maxH="90vh">
          <ModalHeader borderBottom="1px solid" borderColor="app.border" pb="14px">
            {detailTask && (
              <Flex align="center" gap="10px">
                <Box w="4px" h="24px" borderRadius="full" bg={priorityColor[detailTask.priority]} />
                <Box>
                  <Text fontFamily="'Plus Jakarta Sans', sans-serif" fontWeight="800" fontSize="16px" textDecoration={detailTask.done ? 'line-through' : 'none'}>{detailTask.title}</Text>
                  <Text fontSize="10px" color="app.faint">TASK-{detailTask.id.slice(0, 6).toUpperCase()}</Text>
                </Box>
              </Flex>
            )}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody py="18px" overflowY="auto">
            {detailTask && (() => {
              const owner = OWNERS.find((o) => o.id === detailTask.owner_id) ?? OWNERS[0];
              const isOverdue = !detailTask.done && detailTask.due_date && new Date(detailTask.due_date) < new Date(new Date().toDateString());
              const taskSubs = subtasksFor(detailTask.id);
              const taskComments = commentsFor(detailTask.id);
              const links = crmLinks(detailTask);
              const TIcon = typeIcon[detailTask.task_type] ?? ListChecksIcon;
              return (
                <Tabs>
                  <TabList borderBottom="1px solid" borderColor="app.border" mb="14px">
                    <Tab fontSize="12px" fontWeight="600">Details</Tab>
                    <Tab fontSize="12px" fontWeight="600">Sub-tasks ({taskSubs.length})</Tab>
                    <Tab fontSize="12px" fontWeight="600">Comments ({taskComments.length})</Tab>
                  </TabList>
                  <TabPanels>
                    {/* Details tab */}
                    <TabPanel px="0">
                      <Stack spacing="14px">
                        <Flex gap="8px" flexWrap="wrap">
                          <Badge fontSize="9px" borderRadius="full" px="8px" py="2px" bg={priorityBg[detailTask.priority]} color={priorityColor[detailTask.priority]} textTransform="capitalize">{detailTask.priority}</Badge>
                          <Badge fontSize="9px" borderRadius="full" px="8px" py="2px" bg={STATUS_BG[detailTask.status] ?? 'app.surfaceAlt'} color={STATUS_COLORS[detailTask.status] ?? '#6b7488'} textTransform="capitalize">{detailTask.status}</Badge>
                          <Badge fontSize="9px" borderRadius="full" px="8px" py="2px" bg="app.surfaceAlt" color="app.subtle"><Icon as={TIcon} boxSize="10px" mr="3px" />{detailTask.task_type}</Badge>
                          {detailTask.recurring !== 'None' && <Badge fontSize="9px" borderRadius="full" px="8px" py="2px" bg="#f0e8ff" color="#7c3aed" textTransform="capitalize">{detailTask.recurring}</Badge>}
                        </Flex>

                        {detailTask.description && <Text fontSize="12px" color="app.subtle" lineHeight="1.5">{detailTask.description}</Text>}

                        <Grid templateColumns="1fr 1fr" gap="10px">
                          <Box p="12px" bg="app.surfaceAlt" borderRadius="10px">
                            <Flex align="center" gap="6px"><Icon as={CalendarIcon} boxSize="11px" color="app.faint" /><Text fontSize="10px" color="app.faint">Due date</Text></Flex>
                            <Text mt="4px" fontSize="13px" fontWeight="700" color={isOverdue ? '#c23c3c' : 'app.text'}>{detailTask.due_date ? formatRelative(detailTask.due_date) : 'No due date'}</Text>
                            {isOverdue && <Text fontSize="9px" color="#c23c3c" fontWeight="700">OVERDUE</Text>}
                          </Box>
                          <Box p="12px" bg="app.surfaceAlt" borderRadius="10px">
                            <Flex align="center" gap="6px"><Icon as={ClockIcon} boxSize="11px" color="app.faint" /><Text fontSize="10px" color="app.faint">Estimated</Text></Flex>
                            <Text mt="4px" fontSize="13px" fontWeight="700">{detailTask.estimated_hours}h</Text>
                          </Box>
                        </Grid>

                        {links.length > 0 && (
                          <Box p="12px" bg="app.surfaceAlt" borderRadius="10px">
                            <Text fontSize="10px" color="app.faint" mb="6px">CRM LINKS</Text>
                            <Flex gap="6px" flexWrap="wrap">
                              {links.map((l) => <Tag key={l.label} size="sm" fontSize="10px" borderRadius="full" px="8px" py="2px" bg="app.surface" color="app.subtle">{l.label}: {l.value}</Tag>)}
                            </Flex>
                          </Box>
                        )}

                        <Box p="12px" bg="app.surfaceAlt" borderRadius="10px">
                          <Text fontSize="10px" color="app.faint" mb="6px">ASSIGNED TO</Text>
                          <Flex align="center" gap="10px">
                            <Avatar size="sm" name={owner.name} bg={owner.color} color="#46506a" />
                            <Box><Text fontSize="12px" fontWeight="700">{owner.name}</Text><Text fontSize="10px" color="app.subtle">{detailTask.reminder ? 'Reminder enabled' : 'No reminder'}</Text></Box>
                          </Flex>
                        </Box>

                        <Flex gap="8px" pt="4px">
                          {!detailTask.done && <Button size="sm" flex="1" bg="#1c8a5c" color="white" _hover={{ bg: '#167a4e' }} borderRadius="9px" fontSize="12px" leftIcon={<CheckCircleIcon size={13} />} onClick={() => { toggleDone(detailTask.id); }}>Mark done</Button>}
                          <Button size="sm" flex="1" bg="navy.600" color="white" _hover={{ bg: 'navy.500' }} borderRadius="9px" fontSize="12px" onClick={() => { detailModal.onClose(); openEdit(detailTask); }}>Edit</Button>
                          <Button size="sm" flex="1" variant="outline" borderColor="#c23c3c" color="#c23c3c" borderRadius="9px" fontSize="12px" leftIcon={<Trash2Icon size={13} />} onClick={() => { setDeleteId(detailTask.id); confirmDel.onOpen(); }}>Delete</Button>
                        </Flex>
                      </Stack>
                    </TabPanel>

                    {/* Sub-tasks tab */}
                    <TabPanel px="0">
                      <Stack spacing="4px">
                        {taskSubs.length === 0 ? <Text fontSize="12px" color="app.faint" py="20px" textAlign="center">No sub-tasks yet</Text> : taskSubs.map((st) => (
                          <Flex key={st.id} align="center" gap="8px" py="6px" px="6px" _hover={{ bg: 'app.surfaceAlt' }} borderRadius="6px">
                            <Checkbox isChecked={st.done} onChange={() => toggleSubtaskDone(st.id)} colorScheme="orange" size="sm" />
                            <Text fontSize="12px" flex="1" textDecoration={st.done ? 'line-through' : 'none'} color={st.done ? 'app.faint' : 'app.subtle'}>{st.title}</Text>
                            {st.due_date && <Text fontSize="10px" color="app.faint">{formatRelative(st.due_date)}</Text>}
                            <IconButton aria-label="Delete" icon={<Trash2Icon size={11} />} size="xs" variant="ghost" color="#c23c3c" onClick={() => deleteSubtask(st.id)} />
                          </Flex>
                        ))}
                        <Flex align="center" gap="8px" py="6px" px="6px">
                          <PlusIcon size={14} color="#8a93a6" />
                          <Input size="xs" placeholder="Add subtask..." value={newSubtaskParent === detailTask.id ? newSubtaskTitle : ''} onChange={(e) => { setNewSubtaskParent(detailTask.id); setNewSubtaskTitle(e.target.value); }} onKeyDown={(e) => { if (e.key === 'Enter') addSubtask(); }} borderRadius="6px" borderColor="app.border" fontSize="11px" />
                          {newSubtaskParent === detailTask.id && newSubtaskTitle.trim() && <Button size="xs" variant="ghost" color="#1c8a5c" onClick={addSubtask}>Add</Button>}
                        </Flex>
                      </Stack>
                    </TabPanel>

                    {/* Comments tab */}
                    <TabPanel px="0">
                      <Stack spacing="10px">
                        {taskComments.length === 0 ? <Text fontSize="12px" color="app.faint" py="10px">No comments yet</Text> : taskComments.map((c) => (
                          <Box key={c.id} p="10px" bg="app.surfaceAlt" borderRadius="8px">
                            <Text fontSize="11px" color="app.subtle">{new Date(c.created_at).toLocaleString()}</Text>
                            <Text fontSize="12px" mt="4px">{c.body}</Text>
                          </Box>
                        ))}
                        <Flex gap="8px">
                          <Input size="sm" placeholder="Write a comment..." value={newCommentText} onChange={(e) => setNewCommentText(e.target.value)} borderRadius="9px" borderColor="app.border" fontSize="12px" />
                          <Button size="sm" bg="navy.600" color="white" borderRadius="9px" fontSize="12px" onClick={() => addComment(detailTask.id)} leftIcon={<MessageSquareIcon size={13} />}>Post</Button>
                        </Flex>
                      </Stack>
                    </TabPanel>
                  </TabPanels>
                </Tabs>
              );
            })()}
          </ModalBody>
        </ModalContent>
      </Modal>

      {/* Create/Edit Form Modal */}
      <FormModal isOpen={formModal.isOpen} onClose={formModal.onClose} title={editing ? 'Edit task' : 'New task'} subtitle={editing ? 'Update task details' : 'Create a new task'} loading={saving} onSubmit={handleSubmit} submitLabel={editing ? 'Update' : 'Create'} size="lg">
        <FormControl>
          <FormLabel fontSize="12px">Title</FormLabel>
          <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Follow up with Maya Patel" size="sm" borderRadius="9px" borderColor="app.border" fontSize="13px" />
        </FormControl>
        <FormControl>
          <FormLabel fontSize="12px">Description</FormLabel>
          <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Task details..." size="sm" borderRadius="9px" borderColor="app.border" fontSize="13px" rows={3} />
        </FormControl>
        <Grid templateColumns="1fr 1fr" gap="10px">
          <FormControl>
            <FormLabel fontSize="12px">Priority</FormLabel>
            <Select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} size="sm" borderRadius="9px" borderColor="app.border" fontSize="13px">
              {PRIORITY_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
            </Select>
          </FormControl>
          <FormControl>
            <FormLabel fontSize="12px">Task Type</FormLabel>
            <Select value={form.task_type} onChange={(e) => setForm({ ...form, task_type: e.target.value })} size="sm" borderRadius="9px" borderColor="app.border" fontSize="13px">
              {TASK_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </Select>
          </FormControl>
        </Grid>
        <Grid templateColumns="1fr 1fr" gap="10px">
          <FormControl>
            <FormLabel fontSize="12px">Due date</FormLabel>
            <Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} size="sm" borderRadius="9px" borderColor="app.border" fontSize="13px" />
          </FormControl>
          <FormControl>
            <FormLabel fontSize="12px">Start date</FormLabel>
            <Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} size="sm" borderRadius="9px" borderColor="app.border" fontSize="13px" />
          </FormControl>
        </Grid>
        <Grid templateColumns="1fr 1fr" gap="10px">
          <FormControl>
            <FormLabel fontSize="12px">Assign to</FormLabel>
            <Select value={form.owner_id} onChange={(e) => setForm({ ...form, owner_id: e.target.value })} size="sm" borderRadius="9px" borderColor="app.border" fontSize="13px">
              {OWNERS.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
            </Select>
          </FormControl>
          <FormControl>
            <FormLabel fontSize="12px">Estimated hours</FormLabel>
            <Input type="number" value={form.estimated_hours} onChange={(e) => setForm({ ...form, estimated_hours: Number(e.target.value) })} size="sm" borderRadius="9px" borderColor="app.border" fontSize="13px" />
          </FormControl>
        </Grid>
        <Grid templateColumns="1fr 1fr" gap="10px">
          <FormControl>
            <FormLabel fontSize="12px">Recurring</FormLabel>
            <Select value={form.recurring} onChange={(e) => setForm({ ...form, recurring: e.target.value })} size="sm" borderRadius="9px" borderColor="app.border" fontSize="13px">
              {RECURRING_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
            </Select>
          </FormControl>
          <FormControl>
            <Flex align="center" gap="10px" pt="28px">
              <Checkbox isChecked={form.reminder} onChange={(e) => setForm({ ...form, reminder: e.target.checked })} colorScheme="orange" />
              <Text fontSize="12px">Send reminder</Text>
            </Flex>
          </FormControl>
        </Grid>
        {/* CRM Linking */}
        <Box p="12px" bg="app.surfaceAlt" borderRadius="10px">
          <Text fontSize="11px" fontWeight="700" color="app.subtle" mb="8px">CRM CONTEXT LINKING</Text>
          <Grid templateColumns="1fr 1fr" gap="8px">
            <FormControl>
              <FormLabel fontSize="11px" color="app.faint">Lead</FormLabel>
              <Select value={form.lead_id} onChange={(e) => setForm({ ...form, lead_id: e.target.value })} size="sm" borderRadius="7px" borderColor="app.border" fontSize="12px" bg="app.surface">
                <option value="">None</option>{leads.map((l) => <option key={l.id} value={l.id}>{personName(l.person_id)}</option>)}
              </Select>
            </FormControl>
            <FormControl>
              <FormLabel fontSize="11px" color="app.faint">Deal</FormLabel>
              <Select value={form.deal_id} onChange={(e) => setForm({ ...form, deal_id: e.target.value })} size="sm" borderRadius="7px" borderColor="app.border" fontSize="12px" bg="app.surface">
                <option value="">None</option>{deals.map((d) => <option key={d.id} value={d.id}>{d.title}</option>)}
              </Select>
            </FormControl>
            <FormControl>
              <FormLabel fontSize="11px" color="app.faint">Customer</FormLabel>
              <Select value={form.customer_id} onChange={(e) => setForm({ ...form, customer_id: e.target.value })} size="sm" borderRadius="7px" borderColor="app.border" fontSize="12px" bg="app.surface">
                <option value="">None</option>{customers.map((c) => <option key={c.id} value={c.id}>{personName(leads.find((l) => l.id === c.id)?.person_id ?? null)}</option>)}
              </Select>
            </FormControl>
            <FormControl>
              <FormLabel fontSize="11px" color="app.faint">Quote</FormLabel>
              <Select value={form.quote_id} onChange={(e) => setForm({ ...form, quote_id: e.target.value })} size="sm" borderRadius="7px" borderColor="app.border" fontSize="12px" bg="app.surface">
                <option value="">None</option>{quotes.map((q) => <option key={q.id} value={q.id}>{q.number}</option>)}
              </Select>
            </FormControl>
            <FormControl>
              <FormLabel fontSize="11px" color="app.faint">Invoice</FormLabel>
              <Select value={form.invoice_id} onChange={(e) => setForm({ ...form, invoice_id: e.target.value })} size="sm" borderRadius="7px" borderColor="app.border" fontSize="12px" bg="app.surface">
                <option value="">None</option>{invoices.map((i) => <option key={i.id} value={i.id}>{i.number}</option>)}
              </Select>
            </FormControl>
          </Grid>
        </Box>
      </FormModal>

      {/* Custom Status Modal */}
      <FormModal isOpen={statusModal.isOpen} onClose={statusModal.onClose} title="Task Statuses" subtitle="Manage custom statuses" loading={false} onSubmit={addCustomStatus} submitLabel="Add Status">
        <Flex gap="8px">
          <Input value={newStatusName} onChange={(e) => setNewStatusName(e.target.value)} placeholder="Status name (e.g. On Hold)" size="sm" borderRadius="9px" borderColor="app.border" fontSize="13px" />
          <Input type="color" value={newStatusColor} onChange={(e) => setNewStatusColor(e.target.value)} w="44px" h="32px" p="2px" borderRadius="9px" borderColor="app.border" />
        </Flex>
        <Box>
          <Text fontSize="11px" fontWeight="700" color="app.subtle" mb="6px">CURRENT STATUSES</Text>
          <Flex gap="6px" flexWrap="wrap">
            {DEFAULT_STATUSES.map((s) => <Tag key={s} size="sm" fontSize="10px" borderRadius="full" px="8px" py="2px" bg={STATUS_BG[s]} color={STATUS_COLORS[s]}>{s}</Tag>)}
            {customStatuses.map((s) => <Tag key={s.id} size="sm" fontSize="10px" borderRadius="full" px="8px" py="2px" bg={`${s.color}1a`} color={s.color}>{s.name}</Tag>)}
          </Flex>
        </Box>
      </FormModal>

      <ConfirmDialog isOpen={confirmDel.isOpen} onClose={confirmDel.onClose} title="Delete task" message="Delete this task and its sub-tasks?" confirmLabel="Delete" danger onConfirm={handleDelete} />
      <ConfirmDialog isOpen={confirmBulk.isOpen} onClose={confirmBulk.onClose} title="Delete selected tasks" message={`Delete ${selectedIds.size} tasks?`} confirmLabel="Delete all" danger onConfirm={handleBulkDelete} />
      <ConfirmDialog isOpen={confirmBulkStatus.isOpen} onClose={confirmBulkStatus.onClose} title="Bulk update status" message={`Change ${selectedIds.size} tasks to "${bulkStatusValue}"?`} confirmLabel="Update" onConfirm={handleBulkStatus} />
    </>
  );
}
