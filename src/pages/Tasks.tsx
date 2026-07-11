import React, { useCallback, useEffect, useState } from 'react';
import {
  Avatar,
  Box,
  Button,
  Checkbox,
  Flex,
  FormControl,
  FormLabel,
  HStack,
  Icon,
  Input,
  Progress,
  Select,
  Spinner,
  Text,
  useDisclosure,
  useToast } from
'@chakra-ui/react';
import { CalendarIcon, CheckCircleIcon, PlusIcon, RepeatIcon, SearchIcon, Trash2Icon } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { StatusBadge } from '../components/ui/StatusBadge';
import { EmptyState } from '../components/ui/EmptyState';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { FormDrawer } from '../components/ui/FormDrawer';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

type Task = {
  id: string;
  title: string;
  priority: string;
  status: string;
  done: boolean;
  due_date: string | null;
  owner_id: string;
  owner_name: string;
  checklist_total: number;
  checklist_done: number;
  recurring: string;
  reminder: boolean;
};

const OWNERS = [
  { id: 'o1', name: 'Renee Walker', color: '#ffdccb' },
  { id: 'o2', name: 'Marcus Chen', color: '#d8e7ff' },
  { id: 'o3', name: 'Priya Nair', color: '#eadbff' },
  { id: 'o4', name: 'Diego Alvarez', color: '#c9f0e3' }
];
const PRIORITY_OPTIONS = ['High', 'Medium', 'Low'];
const RECURRING_OPTIONS = ['None', 'Daily', 'Weekly', 'Monthly'];

export function Tasks() {
  const toast = useToast();
  const { session } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterPriority, setFilterPriority] = useState('All');
  const formDrawer = useDisclosure();
  const confirmDel = useDisclosure();
  const [editing, setEditing] = useState<Task | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    title: '', priority: 'Medium', due_date: '', owner_id: 'o1',
    checklist_total: 0, recurring: 'None', reminder: true
  });

  const load = useCallback(async () => {
    if (!session?.user) return;
    setLoading(true);
    const { data } = await supabase.from('tasks').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false });
    setTasks((data ?? []) as Task[]);
    setLoading(false);
  }, [session]);

  useEffect(() => { load(); }, [load]);

  const filtered = tasks
    .filter((t) => filterPriority === 'All' || t.priority === filterPriority)
    .filter((t) => !search || t.title.toLowerCase().includes(search.toLowerCase()));

  const toggleDone = async (id: string) => {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    const newDone = !task.done;
    setTasks((prev) => prev.map((t) => t.id === id ? { ...t, done: newDone, status: newDone ? 'Done' : 'Pending' } : t));
    await supabase.from('tasks').update({ done: newDone, status: newDone ? 'Done' : 'Pending' }).eq('id', id).eq('user_id', session!.user.id);
    if (newDone) toast({ title: 'Task completed', status: 'success', duration: 1400, position: 'top-right' });
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ title: '', priority: 'Medium', due_date: '', owner_id: 'o1', checklist_total: 0, recurring: 'None', reminder: true });
    formDrawer.onOpen();
  };

  const openEdit = (task: Task) => {
    setEditing(task);
    setForm({ title: task.title, priority: task.priority, due_date: task.due_date ?? '', owner_id: task.owner_id, checklist_total: task.checklist_total, recurring: task.recurring, reminder: task.reminder });
    formDrawer.onOpen();
  };

  const handleSubmit = async () => {
    if (!form.title.trim()) { toast({ title: 'Title is required', status: 'error', duration: 2000, position: 'top-right' }); return; }
    const owner = OWNERS.find((o) => o.id === form.owner_id) ?? OWNERS[0];
    setSaving(true);
    if (editing) {
      const { error } = await supabase.from('tasks').update({
        title: form.title, priority: form.priority, due_date: form.due_date || null,
        owner_id: form.owner_id, owner_name: owner.name, checklist_total: Number(form.checklist_total),
        recurring: form.recurring, reminder: form.reminder
      }).eq('id', editing.id).eq('user_id', session!.user.id);
      if (!error) toast({ title: 'Task updated', status: 'success', duration: 2000, position: 'top-right' });
    } else {
      const { error } = await supabase.from('tasks').insert({
        user_id: session!.user.id, title: form.title, priority: form.priority, status: 'Pending', done: false,
        due_date: form.due_date || null, owner_id: form.owner_id, owner_name: owner.name,
        checklist_total: Number(form.checklist_total), checklist_done: 0, recurring: form.recurring, reminder: form.reminder
      });
      if (!error) toast({ title: 'Task created', status: 'success', duration: 2000, position: 'top-right' });
    }
    setSaving(false);
    formDrawer.onClose();
    load();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from('tasks').delete().eq('id', deleteId).eq('user_id', session!.user.id);
    if (!error) { toast({ title: 'Task deleted', status: 'success', duration: 1800, position: 'top-right' }); load(); }
    confirmDel.onClose();
    setDeleteId(null);
  };

  return (
    <>
      <PageHeader
        title="Tasks"
        subtitle="Your team's follow-ups and to-dos."
        actions={<Button size="sm" borderRadius="9px" bg="navy.600" color="white" _hover={{ bg: 'navy.500' }} leftIcon={<PlusIcon size={15} />} fontSize="12px" onClick={openCreate}>New task</Button>} />

      <Card p={{ base: '8px', md: '10px' }}>
        <Flex px="12px" py="10px" gap="10px" align="center" flexWrap="wrap">
          <Input maxW="240px" size="sm" placeholder="Search tasks..." value={search} onChange={(e) => setSearch(e.target.value)} borderRadius="9px" bg="app.surfaceAlt" borderColor="app.border" fontSize="12px" />
          <Select size="sm" maxW="140px" value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)} borderRadius="9px" borderColor="app.border" fontSize="12px">
            <option value="All">All priorities</option>
            {PRIORITY_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
          </Select>
          <Text ml="auto" fontSize="12px" color="app.subtle">{filtered.length} tasks</Text>
        </Flex>

        {loading ? (
          <Flex py="60px" justify="center"><Spinner color="brand.500" /></Flex>
        ) : filtered.length === 0 ? (
          <EmptyState icon={CheckCircleIcon} title="No tasks found" description="Create a new task to get started." action={<Button size="sm" bg="navy.600" color="white" borderRadius="9px" fontSize="12px" leftIcon={<PlusIcon size={15} />} onClick={openCreate}>New task</Button>} />
        ) : filtered.map((task, index) => {
          const owner = OWNERS.find((o) => o.id === task.owner_id) ?? OWNERS[0];
          return (
            <Flex key={task.id} align="center" gap="12px" px="12px" py="13px" borderBottom={index === filtered.length - 1 ? '0' : '1px solid'} borderColor="app.border" opacity={task.done ? 0.55 : 1} cursor="pointer" onClick={() => openEdit(task)}>
              <Checkbox isChecked={task.done} onChange={(e) => { e.stopPropagation(); toggleDone(task.id); }} colorScheme="orange" />
              <Box flex="1" minW="0">
                <Text fontSize="13px" fontWeight="600" textDecoration={task.done ? 'line-through' : 'none'} noOfLines={1}>{task.title}</Text>
                <Flex mt="6px" align="center" gap="12px">
                  <Flex align="center" gap="4px" color="app.subtle">
                    <Icon as={CalendarIcon} boxSize="11px" />
                    <Text fontSize="10px">{task.due_date ?? 'No due date'}</Text>
                  </Flex>
                  {task.recurring !== 'None' && (
                    <Flex align="center" gap="4px" color="app.subtle">
                      <Icon as={RepeatIcon} boxSize="11px" />
                      <Text fontSize="10px">{task.recurring}</Text>
                    </Flex>
                  )}
                  {task.checklist_total > 0 && (
                    <Flex align="center" gap="6px" minW="90px">
                      <Progress value={task.checklist_done / task.checklist_total * 100} size="xs" colorScheme="orange" borderRadius="full" flex="1" bg="app.surfaceAlt" />
                      <Text fontSize="9px" color="app.faint">{task.checklist_done}/{task.checklist_total}</Text>
                    </Flex>
                  )}
                </Flex>
              </Box>
              <Box display={{ base: 'none', md: 'block' }}><StatusBadge status={task.priority} /></Box>
              <Avatar size="xs" name={owner.name} bg={owner.color} color="#46506a" fontSize="8px" />
              <Button size="xs" variant="ghost" color="#c23c3c" onClick={(e) => { e.stopPropagation(); setDeleteId(task.id); confirmDel.onOpen(); }}><Trash2Icon size={13} /></Button>
            </Flex>
          );
        })}
      </Card>

      <FormDrawer isOpen={formDrawer.isOpen} onClose={formDrawer.onClose} title={editing ? 'Edit task' : 'New task'} subtitle={editing ? 'Update task details' : 'Create a new task'} loading={saving} onSubmit={handleSubmit} submitLabel={editing ? 'Update' : 'Create'}>
        <FormControl>
          <FormLabel fontSize="12px">Title</FormLabel>
          <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Follow up with Maya Patel" size="sm" borderRadius="9px" borderColor="app.border" fontSize="13px" />
        </FormControl>
        <FormControl>
          <FormLabel fontSize="12px">Priority</FormLabel>
          <Select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} size="sm" borderRadius="9px" borderColor="app.border" fontSize="13px">
            {PRIORITY_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
          </Select>
        </FormControl>
        <FormControl>
          <FormLabel fontSize="12px">Due date</FormLabel>
          <Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} size="sm" borderRadius="9px" borderColor="app.border" fontSize="13px" />
        </FormControl>
        <FormControl>
          <FormLabel fontSize="12px">Assign to</FormLabel>
          <Select value={form.owner_id} onChange={(e) => setForm({ ...form, owner_id: e.target.value })} size="sm" borderRadius="9px" borderColor="app.border" fontSize="13px">
            {OWNERS.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
          </Select>
        </FormControl>
        <FormControl>
          <FormLabel fontSize="12px">Checklist items</FormLabel>
          <Input type="number" value={form.checklist_total} onChange={(e) => setForm({ ...form, checklist_total: Number(e.target.value) })} size="sm" borderRadius="9px" borderColor="app.border" fontSize="13px" />
        </FormControl>
        <FormControl>
          <FormLabel fontSize="12px">Recurring</FormLabel>
          <Select value={form.recurring} onChange={(e) => setForm({ ...form, recurring: e.target.value })} size="sm" borderRadius="9px" borderColor="app.border" fontSize="13px">
            {RECURRING_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
          </Select>
        </FormControl>
        <FormControl>
          <Flex align="center" gap="10px">
            <Checkbox isChecked={form.reminder} onChange={(e) => setForm({ ...form, reminder: e.target.checked })} colorScheme="orange" />
            <Text fontSize="12px">Send reminder notification</Text>
          </Flex>
        </FormControl>
      </FormDrawer>

      <ConfirmDialog isOpen={confirmDel.isOpen} onClose={confirmDel.onClose} title="Delete task" message="Are you sure you want to delete this task?" confirmLabel="Delete" danger onConfirm={handleDelete} />
    </>
  );
}
