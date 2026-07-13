import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Avatar,
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
  { id: 'o1', name: 'Renee Walker', initials: 'RW', color: '#ffdccb', textColor: '#8c5535' },
  { id: 'o2', name: 'Marcus Chen', initials: 'MC', color: '#d8e7ff', textColor: '#2d4fa3' },
  { id: 'o3', name: 'Priya Nair', initials: 'PN', color: '#eadbff', textColor: '#6b35a8' },
  { id: 'o4', name: 'Diego Alvarez', initials: 'DA', color: '#c9f0e3', textColor: '#1a6b4a' }
];
const PRIORITY_OPTIONS = ['Critical', 'High', 'Medium', 'Low'];
const TASK_TYPES = ['To-Do', 'Meeting', 'Call', 'Email', 'Follow-up'];
const RECURRING_OPTIONS = ['None', 'Daily', 'Weekly', 'Monthly'];
const DEFAULT_STATUSES = ['Pending', 'In Progress', 'Done'];
const STATUS_COLORS: Record<string, string> = { Pending: '#b5760f', 'In Progress': '#3355c9', Done: '#1c8a5c' };
const STATUS_BG: Record<string, string> = { Pending: '#fef3e0', 'In Progress': '#e8f0ff', Done: '#e8f5ee' };
const STATUS_DOT: Record<string, string> = { Pending: '#f0a13c', 'In Progress': '#6c7aea', Done: '#2d9c79' };

const priorityColor: Record<string, string> = { Critical: '#c23c3c', High: '#e9683f', Medium: '#b5760f', Low: '#6b7488' };
const priorityBg: Record<string, string> = { Critical: '#fde8e8', High: '#fff2ec', Medium: '#fef3e0', Low: '#f0f2f5' };
const priorityIcon: Record<string, React.ElementType> = { Critical: AlertTriangleIcon, High: FlameIcon, Medium: ZapIcon, Low: ClockIcon };
const priorityWeight: Record<string, number> = { Critical: 4, High: 3, Medium: 2, Low: 1 };
const typeIcon: Record<string, React.ElementType> = { 'To-Do': ListChecksIcon, Meeting: CalendarIcon, Call: PhoneIcon, Email: MailIcon, 'Follow-up': RepeatIcon };

const inputStyle = {
  h: '36px',
  borderRadius: '10px',
  bg: '#f8f9fc',
  border: '1px solid #edf0f5',
  fontSize: '13px',
  color: '#1d273d',
  _placeholder: { color: '#b0b8cc' },
  _focus: { borderColor: '#c5ccdc', bg: 'white', boxShadow: '0 0 0 3px rgba(51,85,201,0.08)' }
} as const;

const selectStyle = {
  h: '36px',
  borderRadius: '10px',
  bg: '#f8f9fc',
  border: '1px solid #edf0f5',
  fontSize: '13px',
  color: '#46506a',
  _focus: { borderColor: '#c5ccdc', boxShadow: '0 0 0 3px rgba(51,85,201,0.08)' }
} as const;

const labelStyle = { fontSize: '12px', fontWeight: '600' as const, color: '#46506a' };

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

function StatusPill({ status }: { status: string }) {
  const color = STATUS_COLORS[status] ?? '#6b7488';
  const bg = STATUS_BG[status] ?? '#f0f2f5';
  const dot = STATUS_DOT[status] ?? '#6b7488';
  return (
    <Flex align="center" gap="5px" px="9px" py="4px" bg={bg} borderRadius="full" w="fit-content">
      <Box w="6px" h="6px" borderRadius="full" bg={dot} flexShrink={0} />
      <Text fontSize="11px" fontWeight="600" color={color}>{status}</Text>
    </Flex>
  );
}

function PriorityPill({ priority }: { priority: string }) {
  const color = priorityColor[priority] ?? '#6b7488';
  const bg = priorityBg[priority] ?? '#f0f2f5';
  const PIcon = priorityIcon[priority] ?? ClockIcon;
  return (
    <Flex align="center" gap="4px" px="8px" py="3px" bg={bg} borderRadius="full" w="fit-content">
      <PIcon size={11} color={color} />
      <Text fontSize="10px" fontWeight="700" color={color} textTransform="capitalize">{priority}</Text>
    </Flex>
  );
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

  const filtered = useMemo(() => {
    let result = tasks.filter((t) => !t.archived);
    if (filterPriority !== 'All') result = result.filter((t) => t.priority === filterPriority);
    if (filterStatus !== 'All') result = result.filter((t) => t.status === filterStatus);
    if (filterOwner !== 'All') result = result.filter((t) => t.owner_id === filterOwner);
    if (filterType !== 'All') result = result.filter((t) => t.task_type === filterType);
    if (search.trim()) result = result.filter((t) => t.title.toLowerCase().includes(search.toLowerCase()) || t.description.toLowerCase().includes(search.toLowerCase()));
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
    const { data } = await supabase.from('subtasks').insert({ user_id: session!.user.id, parent_id: newSubtaskParent, title: newSubtaskTitle.trim(), status: 'Pending' }).select().maybeSingle();
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
    const { data } = await supabase.from('task_comments').insert({ user_id: session!.user.id, task_id: taskId, body: newCommentText.trim() }).select().maybeSingle();
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
    setForm({ title: task.title, description: task.description, priority: task.priority, status: task.status, due_date: task.due_date ?? '', start_date: task.start_date ?? '', task_type: task.task_type, owner_id: task.owner_id, estimated_hours: task.estimated_hours, recurring: task.recurring, reminder: task.reminder, lead_id: task.lead_id ?? '', deal_id: task.deal_id ?? '', customer_id: task.customer_id ?? '', quote_id: task.quote_id ?? '', invoice_id: task.invoice_id ?? '' });
    formModal.onOpen();
  };

  const openDetail = (task: Task) => { setDetailTask(task); detailModal.onOpen(); };

  const handleSubmit = async () => {
    if (!form.title.trim()) { toast({ title: 'Title is required', status: 'error', duration: 2000, position: 'top-right' }); return; }
    const owner = OWNERS.find((o) => o.id === form.owner_id) ?? OWNERS[0];
    const crmLinksData = { lead_id: form.lead_id || null, deal_id: form.deal_id || null, customer_id: form.customer_id || null, quote_id: form.quote_id || null, invoice_id: form.invoice_id || null };
    setSaving(true);
    if (editing) {
      const { error } = await supabase.from('tasks').update({
        title: form.title, description: form.description, priority: form.priority, status: form.status,
        due_date: form.due_date || null, start_date: form.start_date || null, task_type: form.task_type,
        owner_id: form.owner_id, owner_name: owner.name, estimated_hours: Number(form.estimated_hours),
        recurring: form.recurring, reminder: form.reminder, ...crmLinksData
      }).eq('id', editing.id).eq('user_id', session!.user.id);
      if (!error) toast({ title: 'Task updated', status: 'success', duration: 2000, position: 'top-right' });
    } else {
      const { error } = await supabase.from('tasks').insert({
        user_id: session!.user.id, title: form.title, description: form.description, priority: form.priority,
        status: 'Pending', done: false, due_date: form.due_date || null, start_date: form.start_date || null,
        task_type: form.task_type, owner_id: form.owner_id, owner_name: owner.name,
        estimated_hours: Number(form.estimated_hours), checklist_total: 0, checklist_done: 0,
        recurring: form.recurring, reminder: form.reminder, ...crmLinksData
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
    await supabase.from('events').insert({ user_id: session!.user.id, title: task.title, type: 'Meeting', event_date: task.due_date ?? new Date().toISOString().split('T')[0], time: '09:00', description: task.description });
    toast({ title: 'Converted to calendar event', status: 'success', duration: 2000, position: 'top-right' });
  };

  const handleExport = () => {
    exportToCsv('tasks.csv', filtered.map((t) => ({ title: t.title, priority: t.priority, status: t.status, type: t.task_type, owner: t.owner_name, due_date: t.due_date ?? '', estimated_hours: t.estimated_hours, recurring: t.recurring, created: t.created_at })));
    toast({ title: 'Exported to CSV', status: 'success', duration: 1800, position: 'top-right' });
  };

  const addCustomStatus = async () => {
    if (!newStatusName.trim()) return;
    await supabase.from('task_statuses').insert({ user_id: session!.user.id, name: newStatusName.trim(), color: newStatusColor, position: customStatuses.length });
    setNewStatusName(''); statusModal.onClose(); load();
    toast({ title: 'Custom status added', status: 'success', duration: 1800, position: 'top-right' });
  };

  const onDragStart = (id: string) => setDragTaskId(id);
  const onDropStatus = async (status: string) => {
    if (!dragTaskId) return;
    await changeStatus(dragTaskId, status);
    setDragTaskId(null); setDragOverStatus(null);
  };

  const kanbanColumns = allStatuses.map((status) => ({ status, items: filtered.filter((t) => t.status === status) }));

  const checkboxStyle = { '& .chakra-checkbox__control': { borderRadius: '5px', borderColor: '#d5dae5', w: '16px', h: '16px', _checked: { bg: '#1a2035', borderColor: '#1a2035' } } } as const;

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
        <Flex align="center" gap="0" h="56px" borderBottom="1px solid #f5f6fa" _hover={{ bg: '#fafbfd' }} cursor="pointer" transition="background .12s ease" onClick={() => openDetail(task)}>
          {/* Checkbox + done */}
          <Box w="40px" flexShrink={0} display="flex" alignItems="center" justifyContent="center" onClick={(e) => e.stopPropagation()}>
            <Checkbox isChecked={selectedIds.has(task.id)} onChange={() => toggleSelect(task.id)} size="sm" sx={checkboxStyle} />
          </Box>
          <Box w="32px" flexShrink={0} display="flex" alignItems="center" justifyContent="center" onClick={(e) => e.stopPropagation()}>
            <Checkbox isChecked={task.done} onChange={() => toggleDone(task.id)} size="sm" sx={checkboxStyle} />
          </Box>
          {/* Expand chevron */}
          <Box w="28px" flexShrink={0} display="flex" alignItems="center" justifyContent="center">
            {taskSubs.length > 0 && <IconButton aria-label="Toggle subtasks" icon={isExpanded ? <ChevronDownIcon size={14} /> : <ChevronRightIcon size={14} />} size="xs" variant="ghost" onClick={(e) => { e.stopPropagation(); toggleExpand(task.id); }} color="#98a1b2" h="24px" w="24px" />}
          </Box>
          {/* Priority stripe */}
          <Box w="3px" h="32px" borderRadius="full" bg={priorityColor[task.priority]} flexShrink={0} mr="12px" />
          {/* Title + meta */}
          <Box flex="1" minW="0">
            <Flex align="center" gap="6px">
              <Icon as={TIcon} boxSize="11px" color="#b0b8cc" />
              <Text fontSize="13px" fontWeight="600" color="#1d273d" textDecoration={task.done ? 'line-through' : 'none'} noOfLines={1}>{task.title}</Text>
              {isOverdue && <Flex align="center" gap="3px" px="6px" py="1px" bg="#fde8e8" borderRadius="full"><AlertTriangleIcon size={9} color="#c23c3c" /><Text fontSize="9px" fontWeight="700" color="#c23c3c">OVERDUE</Text></Flex>}
              {isDueSoon && <Flex align="center" gap="3px" px="6px" py="1px" bg="#fef3e0" borderRadius="full"><ClockIcon size={9} color="#b5760f" /><Text fontSize="9px" fontWeight="700" color="#b5760f">DUE SOON</Text></Flex>}
            </Flex>
            <Flex mt="4px" align="center" gap="12px" flexWrap="wrap">
              {task.due_date && <Flex align="center" gap="4px" color={isOverdue ? '#c23c3c' : '#98a1b2'}><CalendarIcon size={11} /><Text fontSize="10px" fontWeight={isOverdue ? '700' : '400'}>{formatRelative(task.due_date)}</Text></Flex>}
              {task.recurring !== 'None' && <Flex align="center" gap="4px" color="#98a1b2"><RepeatIcon size={11} /><Text fontSize="10px">{task.recurring}</Text></Flex>}
              {taskSubs.length > 0 && <Flex align="center" gap="4px" color="#98a1b2"><ListChecksIcon size={11} /><Text fontSize="10px">{taskSubs.filter((s) => s.done).length}/{taskSubs.length}</Text></Flex>}
              {task.estimated_hours > 0 && <Flex align="center" gap="4px" color="#98a1b2"><ClockIcon size={11} /><Text fontSize="10px">{task.estimated_hours}h</Text></Flex>}
              {links.slice(0, 2).map((l) => <Tag key={l.label} size="sm" fontSize="9px" borderRadius="full" px="6px" py="1px" bg="#f8f9fc" color="#6b7488" border="1px solid #edf0f5">{l.label}: {l.value}</Tag>)}
            </Flex>
          </Box>
          {/* Priority pill */}
          <Box flexShrink={0} mr="10px"><PriorityPill priority={task.priority} /></Box>
          {/* Status dropdown */}
          <Box w="120px" flexShrink={0} mr="10px" onClick={(e) => e.stopPropagation()}>
            <Select size="xs" variant="unstyled" value={task.status} onChange={(e) => changeStatus(task.id, e.target.value)} fontSize="11px" fontWeight="600" color={STATUS_COLORS[task.status] ?? '#6b7488'} cursor="pointer">
              {allStatuses.map((s) => <option key={s} value={s}>{s}</option>)}
            </Select>
          </Box>
          {/* Owner avatar */}
          <Box w="28px" flexShrink={0} mr="8px"><Avatar size="2xs" name={owner.name} bg={owner.color} color={owner.textColor} fontSize="8px" fontWeight="800" w="26px" h="26px" /></Box>
          {/* Actions */}
          <Box w="36px" flexShrink={0} onClick={(e) => e.stopPropagation()}>
            <Menu placement="bottom-end">
              <MenuButton as={IconButton} aria-label="Task actions" icon={<MoreHorizontalIcon size={15} />} variant="ghost" size="sm" color="#b0b8cc" borderRadius="8px" _hover={{ bg: '#f0f2f6', color: '#1d273d' }} />
              <MenuList bg="white" border="1px solid #edf0f5" borderRadius="12px" boxShadow="0 8px 24px rgba(0,0,0,0.10)" py="6px" minW="160px">
                <MenuItem bg="white" fontSize="13px" color="#1d273d" icon={<CheckCircleIcon size={14} />} _hover={{ bg: '#f8f9fc' }} borderRadius="7px" mx="4px" w="calc(100% - 8px)" onClick={() => toggleDone(task.id)}>{task.done ? 'Mark as Pending' : 'Mark as Done'}</MenuItem>
                <MenuItem bg="white" fontSize="13px" color="#1d273d" icon={<ClockIcon size={14} />} _hover={{ bg: '#f8f9fc' }} borderRadius="7px" mx="4px" w="calc(100% - 8px)" onClick={() => snoozeTask(task)}>Snooze 1 day</MenuItem>
                <MenuItem bg="white" fontSize="13px" color="#1d273d" icon={<CopyIcon size={14} />} _hover={{ bg: '#f8f9fc' }} borderRadius="7px" mx="4px" w="calc(100% - 8px)" onClick={() => duplicateTask(task)}>Duplicate</MenuItem>
                <MenuItem bg="white" fontSize="13px" color="#1d273d" icon={<CalendarIcon size={14} />} _hover={{ bg: '#f8f9fc' }} borderRadius="7px" mx="4px" w="calc(100% - 8px)" onClick={() => convertToCalendar(task)}>Convert to Meeting</MenuItem>
                <MenuItem bg="white" fontSize="13px" color="#1d273d" icon={<ArchiveIcon size={14} />} _hover={{ bg: '#f8f9fc' }} borderRadius="7px" mx="4px" w="calc(100% - 8px)" onClick={() => archiveTask(task)}>Archive</MenuItem>
                <Box h="1px" bg="#f0f2f6" mx="10px" my="4px" />
                <MenuItem bg="white" fontSize="13px" color="#c23c3c" icon={<Trash2Icon size={14} />} _hover={{ bg: '#fde8e8' }} borderRadius="7px" mx="4px" w="calc(100% - 8px)" onClick={() => { setDeleteId(task.id); confirmDel.onOpen(); }}>Delete</MenuItem>
              </MenuList>
            </Menu>
          </Box>
        </Flex>
        <Collapse in={isExpanded} animateOpacity>
          <Box ml="100px" mt="4px" mb="8px" pl="14px" borderLeft="2px solid #edf0f5">
            {taskSubs.map((st) => (
              <Flex key={st.id} align="center" gap="8px" py="6px" _hover={{ bg: '#fafbfd' }} borderRadius="6px" px="6px">
                <Checkbox isChecked={st.done} onChange={() => toggleSubtaskDone(st.id)} size="sm" sx={checkboxStyle} />
                <Text fontSize="12px" flex="1" textDecoration={st.done ? 'line-through' : 'none'} color={st.done ? '#b0b8cc' : '#46506a'}>{st.title}</Text>
                {st.due_date && <Text fontSize="10px" color="#b0b8cc">{formatRelative(st.due_date)}</Text>}
                <IconButton aria-label="Delete subtask" icon={<Trash2Icon size={11} />} size="xs" variant="ghost" color="#c23c3c" _hover={{ bg: '#fde8e8' }} onClick={() => deleteSubtask(st.id)} />
              </Flex>
            ))}
            <Flex align="center" gap="8px" py="6px" px="6px">
              <PlusIcon size={14} color="#b0b8cc" />
              <Input size="xs" placeholder="Add subtask..." value={newSubtaskParent === task.id ? newSubtaskTitle : ''} onChange={(e) => { setNewSubtaskParent(task.id); setNewSubtaskTitle(e.target.value); }} onKeyDown={(e) => { if (e.key === 'Enter') addSubtask(); }} borderRadius="6px" borderColor="#edf0f5" fontSize="11px" maxW="300px" />
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
        bg="white"
        borderRadius="12px"
        border="1px solid #edf0f5"
        borderLeftWidth="3px"
        borderLeftColor={priorityColor[task.priority]}
        p="14px"
        cursor="grab"
        _active={{ cursor: 'grabbing' }}
        _hover={{ boxShadow: '0 4px 16px rgba(0,0,0,0.06)', transform: 'translateY(-2px)', borderColor: '#d5dae5' }}
        transition="all .18s ease">
        <Flex justify="space-between" align="start" gap="6px">
          <Text fontSize="12px" fontWeight="600" color="#1d273d" flex="1" noOfLines={2}>{task.title}</Text>
          <Icon as={PIcon} boxSize="14px" color={priorityColor[task.priority]} flexShrink={0} />
        </Flex>
        {task.description && <Text fontSize="10px" color="#98a1b2" mt="4px" noOfLines={1}>{task.description}</Text>}
        <Flex mt="10px" align="center" gap="8px" flexWrap="wrap">
          {task.due_date && <Flex align="center" gap="3px" bg={isOverdue ? '#fde8e8' : '#f8f9fc'} px="6px" py="3px" borderRadius="full"><CalendarIcon size={10} color={isOverdue ? '#c23c3c' : '#98a1b2'} /><Text fontSize="9px" fontWeight={isOverdue ? '700' : '500'} color={isOverdue ? '#c23c3c' : '#6b7488'}>{formatRelative(task.due_date)}</Text></Flex>}
          {taskSubs.length > 0 && <Flex align="center" gap="3px" bg="#f8f9fc" px="6px" py="3px" borderRadius="full"><ListChecksIcon size={10} color="#98a1b2" /><Text fontSize="9px" color="#6b7488">{taskSubs.filter((s) => s.done).length}/{taskSubs.length}</Text></Flex>}
          {task.estimated_hours > 0 && <Flex align="center" gap="3px" bg="#f8f9fc" px="6px" py="3px" borderRadius="full"><ClockIcon size={10} color="#98a1b2" /><Text fontSize="9px" color="#6b7488">{task.estimated_hours}h</Text></Flex>}
        </Flex>
        <Flex mt="10px" justify="space-between" align="center">
          <Avatar size="2xs" name={owner.name} bg={owner.color} color={owner.textColor} fontSize="8px" fontWeight="800" w="26px" h="26px" />
          <PriorityPill priority={task.priority} />
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
          <HStack spacing="8px">
            <Button size="sm" variant="ghost" color="#6b7488" borderRadius="10px" fontSize="13px" fontWeight="500" h="36px" px="14px" leftIcon={<DownloadIcon size={14} />} _hover={{ bg: '#f8f9fc' }} onClick={handleExport}>Export</Button>
            <Button size="sm" variant="ghost" color="#6b7488" borderRadius="10px" fontSize="13px" fontWeight="500" h="36px" px="14px" leftIcon={<PlusIcon size={14} />} _hover={{ bg: '#f8f9fc' }} onClick={statusModal.onOpen}>Status</Button>
            <Button size="sm" h="36px" px="16px" borderRadius="10px" bg="#1a2035" color="white" fontSize="13px" fontWeight="600" leftIcon={<PlusIcon size={15} />} _hover={{ bg: '#253050' }} boxShadow="0 1px 3px rgba(0,0,0,0.2)" onClick={openCreate}>New task</Button>
          </HStack>
        } />

      {/* Analytics Dashboard */}
      <Grid templateColumns={{ base: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)', lg: 'repeat(6, 1fr)' }} gap="10px" mb="14px">
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
            <Box key={stat.label} bg="white" borderRadius="14px" border="1px solid #edf0f5" p="14px" boxShadow="0 1px 3px rgba(0,0,0,0.03)">
              <Flex align="center" gap="10px">
                <Flex w="34px" h="34px" align="center" justify="center" borderRadius="10px" bg={stat.bg} flexShrink={0}><SIcon size={16} color={stat.color} /></Flex>
                <Box><Text fontSize="18px" fontWeight="800" color="#1d273d" lineHeight="1.1">{stat.value}</Text><Text fontSize="10px" color="#98a1b2" fontWeight="500">{stat.label}</Text></Box>
              </Flex>
            </Box>
          );
        })}
      </Grid>

      {/* Workload Distribution */}
      <Box bg="white" borderRadius="14px" border="1px solid #edf0f5" p="16px" mb="14px" boxShadow="0 1px 3px rgba(0,0,0,0.03)">
        <Text fontSize="11px" fontWeight="700" letterSpacing="0.06em" textTransform="uppercase" color="#98a1b2" mb="12px">Workload Distribution</Text>
        <Flex gap="20px" flexWrap="wrap">
          {stats.byOwner.map((o) => {
            const pct = stats.total > 0 ? (o.count / stats.total) * 100 : 0;
            return (
              <Box key={o.id} flex="1" minW="140px">
                <Flex align="center" gap="7px" mb="6px">
                  <Avatar size="2xs" name={o.name} bg={o.color} color={o.textColor} fontSize="8px" fontWeight="800" w="24px" h="24px" />
                  <Text fontSize="12px" fontWeight="600" color="#1d273d">{o.name}</Text>
                  <Text fontSize="11px" color="#98a1b2" ml="auto" fontWeight="600">{o.count}</Text>
                </Flex>
                <Box w="full" h="6px" bg="#f0f2f6" borderRadius="full" overflow="hidden"><Box h="full" borderRadius="full" bg={pct > 60 ? '#c23c3c' : pct > 30 ? '#e9683f' : '#3355c9'} style={{ width: `${pct}%` }} transition="width .3s ease" /></Box>
              </Box>
            );
          })}
        </Flex>
      </Box>

      {/* Main container */}
      <Box bg="white" borderRadius="16px" border="1px solid #edf0f5" overflow="hidden" boxShadow="0 1px 4px rgba(0,0,0,0.04)">
        {/* Toolbar */}
        <Flex px="20px" py="14px" gap="10px" align="center" flexWrap="wrap" borderBottom="1px solid #f0f2f6">
          {/* View toggle */}
          <HStack spacing="2px" bg="#f8f9fc" borderRadius="10px" p="3px">
            <Button size="xs" h="30px" borderRadius="8px" fontSize="12px" fontWeight="600" bg={view === 'list' ? '#1a2035' : 'transparent'} color={view === 'list' ? 'white' : '#98a1b2'} _hover={{ bg: view === 'list' ? '#253050' : '#f0f2f6' }} leftIcon={<ListIcon size={13} />} onClick={() => setView('list')}>List</Button>
            <Button size="xs" h="30px" borderRadius="8px" fontSize="12px" fontWeight="600" bg={view === 'kanban' ? '#1a2035' : 'transparent'} color={view === 'kanban' ? 'white' : '#98a1b2'} _hover={{ bg: view === 'kanban' ? '#253050' : '#f0f2f6' }} leftIcon={<LayoutGridIcon size={13} />} onClick={() => setView('kanban')}>Kanban</Button>
          </HStack>
          {/* Search */}
          <InputGroup maxW="220px" size="sm">
            <InputLeftElement pointerEvents="none" h="36px"><SearchIcon size={15} color="#b0b8cc" /></InputLeftElement>
            <Input h="36px" pl="36px" placeholder="Search tasks..." value={search} onChange={(e) => setSearch(e.target.value)} borderRadius="10px" bg="#f8f9fc" border="1px solid #edf0f5" fontSize="13px" color="#1d273d" _placeholder={{ color: '#b0b8cc' }} _focus={{ borderColor: '#c5ccdc', bg: 'white', boxShadow: '0 0 0 3px rgba(51,85,201,0.08)' }} />
          </InputGroup>
          {/* Filters */}
          <Select size="sm" maxW="130px" value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)} {...selectStyle}>
            <option value="All">All Priority</option>{PRIORITY_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
          </Select>
          <Select size="sm" maxW="130px" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} {...selectStyle}>
            <option value="All">All Status</option>{allStatuses.map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>
          <Select size="sm" maxW="130px" value={filterOwner} onChange={(e) => setFilterOwner(e.target.value)} {...selectStyle}>
            <option value="All">All Owner</option>{OWNERS.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
          </Select>
          <Select size="sm" maxW="130px" value={filterType} onChange={(e) => setFilterType(e.target.value)} {...selectStyle}>
            <option value="All">All Type</option>{TASK_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </Select>
          <Select size="sm" maxW="130px" value={sortBy} onChange={(e) => setSortBy(e.target.value as 'priority' | 'due_date' | 'created_at')} {...selectStyle}>
            <option value="priority">Sort: Priority</option><option value="due_date">Sort: Due Date</option><option value="created_at">Sort: Created</option>
          </Select>
          {selectedIds.size > 0 && (
            <HStack spacing="6px" ml="auto">
              <Button size="xs" h="32px" px="12px" borderRadius="8px" variant="outline" borderColor="#edf0f5" color="#46506a" fontSize="12px" fontWeight="500" _hover={{ bg: '#f8f9fc' }} onClick={() => { setBulkStatusValue('Pending'); confirmBulkStatus.onOpen(); }}>Bulk Status</Button>
              <Button size="xs" h="32px" px="12px" borderRadius="8px" bg="#fde8e8" color="#c23c3c" fontSize="12px" fontWeight="600" border="none" leftIcon={<Trash2Icon size={12} />} _hover={{ bg: '#fbd0d0' }} onClick={confirmBulk.onOpen}>Delete ({selectedIds.size})</Button>
            </HStack>
          )}
          <Text ml={selectedIds.size === 0 ? 'auto' : '0'} fontSize="13px" color="#98a1b2" fontWeight="500">{filtered.length} tasks</Text>
        </Flex>

        {loading ? (
          <Flex py="72px" justify="center"><Spinner size="md" color="#1a2035" thickness="2px" /></Flex>
        ) : filtered.length === 0 ? (
          <EmptyState icon={CheckCircleIcon} title="No tasks found" description="Create a new task or adjust your filters." action={<Button size="sm" bg="#1a2035" color="white" borderRadius="10px" fontSize="13px" leftIcon={<PlusIcon size={15} />} onClick={openCreate}>New task</Button>} />
        ) : view === 'list' ? (
          <Box px="20px" py="0">
            <Flex h="40px" align="center" borderBottom="1px solid #f0f2f6">
              <Box w="40px" flexShrink={0} display="flex" alignItems="center"><Checkbox isChecked={selectedIds.size === filtered.length && filtered.length > 0} onChange={toggleSelectAll} size="sm" sx={checkboxStyle} /></Box>
              <Box w="32px" /><Box w="28px" /><Box w="3px" mr="12px" />
              <Text fontSize="11px" fontWeight="700" color="#98a1b2" letterSpacing="0.06em">TASK</Text>
            </Flex>
            {filtered.map((task) => <TaskRow key={task.id} task={task} />)}
          </Box>
        ) : (
          <Box p="16px" overflowX="auto">
            <Flex gap="12px" minW="max-content">
              {kanbanColumns.map((col) => (
                <Box key={col.status} w="260px" flexShrink={0}
                  onDragOver={(e) => { e.preventDefault(); if (dragTaskId) setDragOverStatus(col.status); }}
                  onDrop={() => onDropStatus(col.status)}
                  bg={dragOverStatus === col.status ? 'rgba(26,32,53,0.04)' : '#f8f9fc'}
                  borderRadius="14px" p="10px" border="2px dashed" borderColor={dragOverStatus === col.status ? '#1a2035' : 'transparent'} transition="all .18s ease">
                  <Flex align="center" gap="7px" mb="12px" px="4px">
                    <Box w="7px" h="7px" borderRadius="full" bg={STATUS_DOT[col.status] ?? '#6b7488'} />
                    <Text fontSize="12px" fontWeight="700" textTransform="uppercase" letterSpacing="0.05em" color="#46506a">{col.status}</Text>
                    <Flex ml="auto" align="center" justify="center" minW="22px" h="22px" px="6px" bg="white" borderRadius="full" border="1px solid #edf0f5"><Text fontSize="10px" fontWeight="700" color="#98a1b2">{col.items.length}</Text></Flex>
                  </Flex>
                  <Stack spacing="8px">
                    {col.items.map((task) => <KanbanCard key={task.id} task={task} />)}
                    {col.items.length === 0 && <Text fontSize="11px" color="#b0b8cc" textAlign="center" py="20px">Drop tasks here</Text>}
                  </Stack>
                </Box>
              ))}
            </Flex>
          </Box>
        )}
      </Box>

      {/* Detail Modal */}
      <Modal isOpen={detailModal.isOpen} onClose={detailModal.onClose} size="lg" isCentered>
        <ModalOverlay backdropFilter="blur(6px)" bg="rgba(15,21,35,0.4)" />
        <ModalContent bg="white" borderRadius="20px" overflow="hidden" boxShadow="0 20px 60px rgba(0,0,0,0.15)" maxH="90vh">
          <ModalHeader p="0">
            {detailTask && (
              <Box px="24px" pt="24px" pb="20px" borderBottom="1px solid #f0f2f6">
                <Flex align="center" gap="12px">
                  <Box w="4px" h="28px" borderRadius="full" bg={priorityColor[detailTask.priority]} />
                  <Box flex="1">
                    <Text fontSize="17px" fontWeight="800" color="#1d273d" textDecoration={detailTask.done ? 'line-through' : 'none'}>{detailTask.title}</Text>
                    <Text fontSize="10px" color="#b0b8cc" mt="2px" fontWeight="500">TASK-{detailTask.id.slice(0, 6).toUpperCase()}</Text>
                  </Box>
                  <PriorityPill priority={detailTask.priority} />
                </Flex>
              </Box>
            )}
          </ModalHeader>
          <ModalCloseButton top="20px" right="20px" color="#98a1b2" _hover={{ bg: '#f0f2f6', color: '#1d273d' }} borderRadius="8px" />
          <ModalBody py="20px" overflowY="auto">
            {detailTask && (() => {
              const owner = OWNERS.find((o) => o.id === detailTask.owner_id) ?? OWNERS[0];
              const isOverdue = !detailTask.done && detailTask.due_date && new Date(detailTask.due_date) < new Date(new Date().toDateString());
              const taskSubs = subtasksFor(detailTask.id);
              const taskComments = commentsFor(detailTask.id);
              const links = crmLinks(detailTask);
              const TIcon = typeIcon[detailTask.task_type] ?? ListChecksIcon;
              return (
                <Tabs>
                  <TabList borderBottom="1px solid #f0f2f6" mb="16px">
                    <Tab fontSize="13px" fontWeight="600" color="#1d273d" _selected={{ color: '#1a2035', borderColor: '#1a2035' }}>Details</Tab>
                    <Tab fontSize="13px" fontWeight="600" color="#98a1b2" _selected={{ color: '#1a2035', borderColor: '#1a2035' }}>Sub-tasks ({taskSubs.length})</Tab>
                    <Tab fontSize="13px" fontWeight="600" color="#98a1b2" _selected={{ color: '#1a2035', borderColor: '#1a2035' }}>Comments ({taskComments.length})</Tab>
                  </TabList>
                  <TabPanels>
                    <TabPanel px="0">
                      <Stack spacing="16px">
                        <Flex gap="8px" flexWrap="wrap">
                          <StatusPill status={detailTask.status} />
                          <Flex align="center" gap="4px" px="8px" py="3px" bg="#f8f9fc" borderRadius="full" border="1px solid #edf0f5"><Icon as={TIcon} boxSize="11px" color="#98a1b2" /><Text fontSize="11px" fontWeight="500" color="#46506a">{detailTask.task_type}</Text></Flex>
                          {detailTask.recurring !== 'None' && <Flex align="center" gap="4px" px="8px" py="3px" bg="#f0e8ff" borderRadius="full"><RepeatIcon size={11} color="#7c3aed" /><Text fontSize="11px" fontWeight="500" color="#7c3aed">{detailTask.recurring}</Text></Flex>}
                        </Flex>

                        {detailTask.description && <Text fontSize="13px" color="#46506a" lineHeight="1.5">{detailTask.description}</Text>}

                        <Grid templateColumns="1fr 1fr" gap="12px">
                          <Box p="16px" bg="#fafbfd" borderRadius="14px" border="1px solid #f0f2f6">
                            <Flex align="center" gap="6px"><Icon as={CalendarIcon} boxSize="12px" color="#98a1b2" /><Text fontSize="10px" fontWeight="700" color="#98a1b2" letterSpacing="0.06em">DUE DATE</Text></Flex>
                            <Text mt="6px" fontSize="14px" fontWeight="700" color={isOverdue ? '#c23c3c' : '#1d273d'}>{detailTask.due_date ? formatRelative(detailTask.due_date) : 'No due date'}</Text>
                            {isOverdue && <Text fontSize="9px" color="#c23c3c" fontWeight="700">OVERDUE</Text>}
                          </Box>
                          <Box p="16px" bg="#fafbfd" borderRadius="14px" border="1px solid #f0f2f6">
                            <Flex align="center" gap="6px"><Icon as={ClockIcon} boxSize="12px" color="#98a1b2" /><Text fontSize="10px" fontWeight="700" color="#98a1b2" letterSpacing="0.06em">ESTIMATED</Text></Flex>
                            <Text mt="6px" fontSize="14px" fontWeight="700" color="#1d273d">{detailTask.estimated_hours}h</Text>
                          </Box>
                        </Grid>

                        {links.length > 0 && (
                          <Box p="16px" bg="#fafbfd" borderRadius="14px" border="1px solid #f0f2f6">
                            <Text fontSize="10px" fontWeight="700" color="#98a1b2" letterSpacing="0.06em" mb="8px">CRM LINKS</Text>
                            <Flex gap="6px" flexWrap="wrap">{links.map((l) => <Tag key={l.label} size="sm" fontSize="11px" borderRadius="full" px="10px" py="3px" bg="white" color="#46506a" border="1px solid #edf0f5">{l.label}: {l.value}</Tag>)}</Flex>
                          </Box>
                        )}

                        <Box p="16px" bg="#fafbfd" borderRadius="14px" border="1px solid #f0f2f6">
                          <Text fontSize="10px" fontWeight="700" color="#98a1b2" letterSpacing="0.06em" mb="8px">ASSIGNED TO</Text>
                          <Flex align="center" gap="10px">
                            <Avatar size="sm" name={owner.name} bg={owner.color} color={owner.textColor} fontWeight="800" w="36px" h="36px" />
                            <Box><Text fontSize="13px" fontWeight="700" color="#1d273d">{owner.name}</Text><Text fontSize="11px" color="#98a1b2">{detailTask.reminder ? 'Reminder enabled' : 'No reminder'}</Text></Box>
                          </Flex>
                        </Box>

                        <Flex gap="8px" pt="4px">
                          {!detailTask.done && <Button flex="1" h="38px" borderRadius="10px" bg="#1c8a5c" color="white" fontSize="13px" fontWeight="600" _hover={{ bg: '#167a4e' }} leftIcon={<CheckCircleIcon size={14} />} onClick={() => { toggleDone(detailTask.id); }}>Mark done</Button>}
                          <Button flex="1" h="38px" borderRadius="10px" bg="#1a2035" color="white" fontSize="13px" fontWeight="600" _hover={{ bg: '#253050' }} onClick={() => { detailModal.onClose(); openEdit(detailTask); }}>Edit</Button>
                          <Button flex="1" h="38px" borderRadius="10px" variant="outline" borderColor="#fde8e8" color="#c23c3c" fontSize="13px" fontWeight="600" _hover={{ bg: '#fde8e8' }} leftIcon={<Trash2Icon size={14} />} onClick={() => { setDeleteId(detailTask.id); confirmDel.onOpen(); }}>Delete</Button>
                        </Flex>
                      </Stack>
                    </TabPanel>

                    <TabPanel px="0">
                      <Stack spacing="4px">
                        {taskSubs.length === 0 ? <Text fontSize="13px" color="#b0b8cc" py="20px" textAlign="center">No sub-tasks yet</Text> : taskSubs.map((st) => (
                          <Flex key={st.id} align="center" gap="8px" py="8px" px="8px" _hover={{ bg: '#fafbfd' }} borderRadius="8px">
                            <Checkbox isChecked={st.done} onChange={() => toggleSubtaskDone(st.id)} size="sm" sx={checkboxStyle} />
                            <Text fontSize="13px" flex="1" textDecoration={st.done ? 'line-through' : 'none'} color={st.done ? '#b0b8cc' : '#46506a'}>{st.title}</Text>
                            {st.due_date && <Text fontSize="10px" color="#b0b8cc">{formatRelative(st.due_date)}</Text>}
                            <IconButton aria-label="Delete" icon={<Trash2Icon size={12} />} size="xs" variant="ghost" color="#c23c3c" _hover={{ bg: '#fde8e8' }} onClick={() => deleteSubtask(st.id)} />
                          </Flex>
                        ))}
                        <Flex align="center" gap="8px" py="8px" px="8px">
                          <PlusIcon size={14} color="#b0b8cc" />
                          <Input size="xs" placeholder="Add subtask..." value={newSubtaskParent === detailTask.id ? newSubtaskTitle : ''} onChange={(e) => { setNewSubtaskParent(detailTask.id); setNewSubtaskTitle(e.target.value); }} onKeyDown={(e) => { if (e.key === 'Enter') addSubtask(); }} borderRadius="6px" borderColor="#edf0f5" fontSize="12px" />
                          {newSubtaskParent === detailTask.id && newSubtaskTitle.trim() && <Button size="xs" variant="ghost" color="#1c8a5c" onClick={addSubtask}>Add</Button>}
                        </Flex>
                      </Stack>
                    </TabPanel>

                    <TabPanel px="0">
                      <Stack spacing="10px">
                        {taskComments.length === 0 ? <Text fontSize="13px" color="#b0b8cc" py="10px">No comments yet</Text> : taskComments.map((c) => (
                          <Box key={c.id} p="12px" bg="#fafbfd" borderRadius="10px" border="1px solid #f0f2f6">
                            <Text fontSize="10px" color="#98a1b2" fontWeight="500">{new Date(c.created_at).toLocaleString()}</Text>
                            <Text fontSize="13px" color="#1d273d" mt="4px">{c.body}</Text>
                          </Box>
                        ))}
                        <Flex gap="8px">
                          <Input size="sm" h="36px" placeholder="Write a comment..." value={newCommentText} onChange={(e) => setNewCommentText(e.target.value)} borderRadius="10px" borderColor="#edf0f5" fontSize="13px" _focus={{ borderColor: '#c5ccdc', boxShadow: '0 0 0 3px rgba(51,85,201,0.08)' }} />
                          <Button size="sm" h="36px" bg="#1a2035" color="white" borderRadius="10px" fontSize="13px" fontWeight="600" _hover={{ bg: '#253050' }} onClick={() => addComment(detailTask.id)} leftIcon={<MessageSquareIcon size={14} />}>Post</Button>
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
          <FormLabel {...labelStyle}>Title</FormLabel>
          <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Follow up with Maya Patel" size="sm" {...inputStyle} />
        </FormControl>
        <FormControl>
          <FormLabel {...labelStyle}>Description</FormLabel>
          <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Task details..." size="sm" borderRadius="10px" borderColor="#edf0f5" fontSize="13px" rows={3} _focus={{ borderColor: '#c5ccdc', boxShadow: '0 0 0 3px rgba(51,85,201,0.08)' }} />
        </FormControl>
        <Grid templateColumns="1fr 1fr" gap="10px">
          <FormControl>
            <FormLabel {...labelStyle}>Priority</FormLabel>
            <Select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} size="sm" {...selectStyle}>{PRIORITY_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}</Select>
          </FormControl>
          <FormControl>
            <FormLabel {...labelStyle}>Task Type</FormLabel>
            <Select value={form.task_type} onChange={(e) => setForm({ ...form, task_type: e.target.value })} size="sm" {...selectStyle}>{TASK_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</Select>
          </FormControl>
        </Grid>
        <Grid templateColumns="1fr 1fr" gap="10px">
          <FormControl>
            <FormLabel {...labelStyle}>Due date</FormLabel>
            <Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} size="sm" {...inputStyle} />
          </FormControl>
          <FormControl>
            <FormLabel {...labelStyle}>Start date</FormLabel>
            <Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} size="sm" {...inputStyle} />
          </FormControl>
        </Grid>
        <Grid templateColumns="1fr 1fr" gap="10px">
          <FormControl>
            <FormLabel {...labelStyle}>Assign to</FormLabel>
            <Select value={form.owner_id} onChange={(e) => setForm({ ...form, owner_id: e.target.value })} size="sm" {...selectStyle}>{OWNERS.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}</Select>
          </FormControl>
          <FormControl>
            <FormLabel {...labelStyle}>Estimated hours</FormLabel>
            <Input type="number" value={form.estimated_hours} onChange={(e) => setForm({ ...form, estimated_hours: Number(e.target.value) })} size="sm" {...inputStyle} />
          </FormControl>
        </Grid>
        <Grid templateColumns="1fr 1fr" gap="10px">
          <FormControl>
            <FormLabel {...labelStyle}>Recurring</FormLabel>
            <Select value={form.recurring} onChange={(e) => setForm({ ...form, recurring: e.target.value })} size="sm" {...selectStyle}>{RECURRING_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}</Select>
          </FormControl>
          <FormControl>
            <Flex align="center" gap="10px" pt="28px">
              <Checkbox isChecked={form.reminder} onChange={(e) => setForm({ ...form, reminder: e.target.checked })} size="sm" sx={checkboxStyle} />
              <Text fontSize="13px" color="#46506a">Send reminder</Text>
            </Flex>
          </FormControl>
        </Grid>
        <Box p="14px" bg="#fafbfd" borderRadius="12px" border="1px solid #f0f2f6">
          <Text fontSize="11px" fontWeight="700" color="#98a1b2" letterSpacing="0.06em" mb="10px">CRM CONTEXT LINKING</Text>
          <Grid templateColumns="1fr 1fr" gap="8px">
            <FormControl>
              <FormLabel fontSize="11px" color="#98a1b2">Lead</FormLabel>
              <Select value={form.lead_id} onChange={(e) => setForm({ ...form, lead_id: e.target.value })} size="sm" borderRadius="8px" borderColor="#edf0f5" fontSize="12px" bg="white"><option value="">None</option>{leads.map((l) => <option key={l.id} value={l.id}>{personName(l.person_id)}</option>)}</Select>
            </FormControl>
            <FormControl>
              <FormLabel fontSize="11px" color="#98a1b2">Deal</FormLabel>
              <Select value={form.deal_id} onChange={(e) => setForm({ ...form, deal_id: e.target.value })} size="sm" borderRadius="8px" borderColor="#edf0f5" fontSize="12px" bg="white"><option value="">None</option>{deals.map((d) => <option key={d.id} value={d.id}>{d.title}</option>)}</Select>
            </FormControl>
            <FormControl>
              <FormLabel fontSize="11px" color="#98a1b2">Customer</FormLabel>
              <Select value={form.customer_id} onChange={(e) => setForm({ ...form, customer_id: e.target.value })} size="sm" borderRadius="8px" borderColor="#edf0f5" fontSize="12px" bg="white"><option value="">None</option>{customers.map((c) => <option key={c.id} value={c.id}>{personName(leads.find((l) => l.id === c.id)?.person_id ?? null)}</option>)}</Select>
            </FormControl>
            <FormControl>
              <FormLabel fontSize="11px" color="#98a1b2">Quote</FormLabel>
              <Select value={form.quote_id} onChange={(e) => setForm({ ...form, quote_id: e.target.value })} size="sm" borderRadius="8px" borderColor="#edf0f5" fontSize="12px" bg="white"><option value="">None</option>{quotes.map((q) => <option key={q.id} value={q.id}>{q.number}</option>)}</Select>
            </FormControl>
            <FormControl>
              <FormLabel fontSize="11px" color="#98a1b2">Invoice</FormLabel>
              <Select value={form.invoice_id} onChange={(e) => setForm({ ...form, invoice_id: e.target.value })} size="sm" borderRadius="8px" borderColor="#edf0f5" fontSize="12px" bg="white"><option value="">None</option>{invoices.map((i) => <option key={i.id} value={i.id}>{i.number}</option>)}</Select>
            </FormControl>
          </Grid>
        </Box>
      </FormModal>

      {/* Custom Status Modal */}
      <FormModal isOpen={statusModal.isOpen} onClose={statusModal.onClose} title="Task Statuses" subtitle="Manage custom statuses" loading={false} onSubmit={addCustomStatus} submitLabel="Add Status">
        <Flex gap="8px">
          <Input value={newStatusName} onChange={(e) => setNewStatusName(e.target.value)} placeholder="Status name (e.g. On Hold)" size="sm" {...inputStyle} />
          <Input type="color" value={newStatusColor} onChange={(e) => setNewStatusColor(e.target.value)} w="44px" h="36px" p="2px" borderRadius="10px" borderColor="#edf0f5" />
        </Flex>
        <Box>
          <Text fontSize="11px" fontWeight="700" color="#98a1b2" letterSpacing="0.06em" mb="8px">CURRENT STATUSES</Text>
          <Flex gap="6px" flexWrap="wrap">
            {DEFAULT_STATUSES.map((s) => <Tag key={s} size="sm" fontSize="11px" borderRadius="full" px="10px" py="3px" bg={STATUS_BG[s]} color={STATUS_COLORS[s]} fontWeight="600">{s}</Tag>)}
            {customStatuses.map((s) => <Tag key={s.id} size="sm" fontSize="11px" borderRadius="full" px="10px" py="3px" bg={`${s.color}1a`} color={s.color} fontWeight="600">{s.name}</Tag>)}
          </Flex>
        </Box>
      </FormModal>

      <ConfirmDialog isOpen={confirmDel.isOpen} onClose={confirmDel.onClose} title="Delete task" message="Delete this task and its sub-tasks?" confirmLabel="Delete" danger onConfirm={handleDelete} />
      <ConfirmDialog isOpen={confirmBulk.isOpen} onClose={confirmBulk.onClose} title="Delete selected tasks" message={`Delete ${selectedIds.size} tasks?`} confirmLabel="Delete all" danger onConfirm={handleBulkDelete} />
      <ConfirmDialog isOpen={confirmBulkStatus.isOpen} onClose={confirmBulkStatus.onClose} title="Bulk update status" message={`Change ${selectedIds.size} tasks to "${bulkStatusValue}"?`} confirmLabel="Update" onConfirm={handleBulkStatus} />
    </>
  );
}
