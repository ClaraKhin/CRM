import React, { useCallback, useEffect, useState } from 'react';
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
  Text,
  useDisclosure,
  useToast } from
'@chakra-ui/react';
import {
  AlertCircleIcon,
  CalendarClockIcon,
  CalendarIcon,
  CheckCircleIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ClockIcon,
  FlameIcon,
  ListChecksIcon,
  PlusIcon,
  RepeatIcon,
  SearchIcon,
  Trash2Icon,
  ZapIcon } from
'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Card, CardHeader } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { FormModal } from '../components/ui/FormModal';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

type Subtask = { id: string; parent_id: string; title: string; done: boolean; created_at: string };
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
  created_at: string;
  subtasks?: Subtask[];
};

const OWNERS = [
  { id: 'o1', name: 'Renee Walker', color: '#ffdccb' },
  { id: 'o2', name: 'Marcus Chen', color: '#d8e7ff' },
  { id: 'o3', name: 'Priya Nair', color: '#eadbff' },
  { id: 'o4', name: 'Diego Alvarez', color: '#c9f0e3' }
];
const PRIORITY_OPTIONS = ['High', 'Medium', 'Low'];
const RECURRING_OPTIONS = ['None', 'Daily', 'Weekly', 'Monthly'];
const STATUS_GROUPS = ['Pending', 'In Progress', 'Done'] as const;

const priorityColor: Record<string, string> = { High: '#c23c3c', Medium: '#b5760f', Low: '#6b7488' };
const priorityBg: Record<string, string> = { High: '#fde8e8', Medium: '#fef3e0', Low: '#f0f2f5' };

export function Tasks() {
  const toast = useToast();
  const { session } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterPriority, setFilterPriority] = useState('All');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [newSubtaskParent, setNewSubtaskParent] = useState<string | null>(null);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const formDrawer = useDisclosure();
  const detailModal = useDisclosure();
  const confirmDel = useDisclosure();
  const [editing, setEditing] = useState<Task | null>(null);
  const [detailTask, setDetailTask] = useState<Task | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: '', priority: 'Medium', status: 'Pending', due_date: '', owner_id: 'o1',
    checklist_total: 0, recurring: 'None', reminder: true
  });

  const load = useCallback(async () => {
    if (!session?.user) return;
    setLoading(true);
    const [tRes, sRes] = await Promise.all([
      supabase.from('tasks').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false }),
      supabase.from('subtasks').select('*').eq('user_id', session.user.id).order('created_at', { ascending: true })
    ]);
    setTasks((tRes.data ?? []) as Task[]);
    setSubtasks((sRes.data ?? []) as Subtask[]);
    setLoading(false);
  }, [session]);

  useEffect(() => { load(); }, [load]);

  const subtasksFor = (parentId: string) => subtasks.filter((s) => s.parent_id === parentId);
  const filtered = tasks
    .filter((t) => filterPriority === 'All' || t.priority === filterPriority)
    .filter((t) => !search || t.title.toLowerCase().includes(search.toLowerCase()));

  const grouped = STATUS_GROUPS.map((status) => ({
    status,
    items: filtered.filter((t) => t.status === status)
  }));

  const pending = tasks.filter((t) => !t.done);
  const inProgress = tasks.filter((t) => t.status === 'In Progress');
  const done = tasks.filter((t) => t.done);
  const highPriority = pending.filter((t) => t.priority === 'High');
  const completionRate = tasks.length > 0 ? Math.round((done.length / tasks.length) * 100) : 0;

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleDone = async (id: string) => {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    const newDone = !task.done;
    setTasks((prev) => prev.map((t) => t.id === id ? { ...t, done: newDone, status: newDone ? 'Done' : 'Pending' } : t));
    await supabase.from('tasks').update({ done: newDone, status: newDone ? 'Done' : 'Pending' }).eq('id', id).eq('user_id', session!.user.id);
  };

  const cycleStatus = async (id: string) => {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    const statuses = ['Pending', 'In Progress', 'Done'];
    const next = statuses[(statuses.indexOf(task.status) + 1) % statuses.length];
    setTasks((prev) => prev.map((t) => t.id === id ? { ...t, status: next, done: next === 'Done' } : t));
    await supabase.from('tasks').update({ status: next, done: next === 'Done' }).eq('id', id).eq('user_id', session!.user.id);
  };

  const toggleSubtaskDone = async (subId: string) => {
    const st = subtasks.find((s) => s.id === subId);
    if (!st) return;
    const newDone = !st.done;
    setSubtasks((prev) => prev.map((s) => s.id === subId ? { ...s, done: newDone } : s));
    await supabase.from('subtasks').update({ done: newDone }).eq('id', subId).eq('user_id', session!.user.id);
    // Update parent checklist
    const parent = tasks.find((t) => t.id === st.parent_id);
    if (parent && parent.checklist_total > 0) {
      const siblings = subtasks.filter((s) => s.parent_id === st.parent_id);
      const doneCount = siblings.filter((s) => s.done).length + (newDone ? 1 : -1) - (st.done ? 1 : 0);
      const clamped = Math.max(0, Math.min(parent.checklist_total, doneCount));
      await supabase.from('tasks').update({ checklist_done: clamped }).eq('id', parent.id).eq('user_id', session!.user.id);
      setTasks((prev) => prev.map((t) => t.id === parent.id ? { ...t, checklist_done: clamped } : t));
    }
  };

  const addSubtask = async () => {
    if (!newSubtaskTitle.trim() || !newSubtaskParent) return;
    const { data } = await supabase.from('subtasks').insert({
      user_id: session!.user.id, parent_id: newSubtaskParent, title: newSubtaskTitle.trim()
    }).select().maybeSingle();
    if (data) {
      setSubtasks((prev) => [...prev, data as Subtask]);
      // Increment checklist_total on parent
      const parent = tasks.find((t) => t.id === newSubtaskParent);
      if (parent) {
        const newTotal = parent.checklist_total + 1;
        await supabase.from('tasks').update({ checklist_total: newTotal }).eq('id', parent.id).eq('user_id', session!.user.id);
        setTasks((prev) => prev.map((t) => t.id === parent.id ? { ...t, checklist_total: newTotal } : t));
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
        await supabase.from('tasks').update({ checklist_total: newTotal, checklist_done: newDone }).eq('id', parent.id).eq('user_id', session!.user.id);
        setTasks((prev) => prev.map((t) => t.id === parent.id ? { ...t, checklist_total: newTotal, checklist_done: newDone } : t));
      }
    }
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ title: '', priority: 'Medium', status: 'Pending', due_date: '', owner_id: 'o1', checklist_total: 0, recurring: 'None', reminder: true });
    formDrawer.onOpen();
  };

  const openEdit = (task: Task) => {
    setEditing(task);
    setForm({ title: task.title, priority: task.priority, status: task.status, due_date: task.due_date ?? '', owner_id: task.owner_id, checklist_total: task.checklist_total, recurring: task.recurring, reminder: task.reminder });
    formDrawer.onOpen();
  };

  const openDetail = (task: Task) => {
    setDetailTask(task);
    detailModal.onOpen();
  };

  const handleSubmit = async () => {
    if (!form.title.trim()) { toast({ title: 'Title is required', status: 'error', duration: 2000, position: 'top-right' }); return; }
    const owner = OWNERS.find((o) => o.id === form.owner_id) ?? OWNERS[0];
    setSaving(true);
    if (editing) {
      const { error } = await supabase.from('tasks').update({
        title: form.title, priority: form.priority, status: form.status, due_date: form.due_date || null,
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
    detailModal.onClose();
  };

  return (
    <>
      <PageHeader
        title="Tasks"
        subtitle="Your team's follow-ups and to-dos."
        actions={<Button size="sm" borderRadius="9px" bg="navy.600" color="white" _hover={{ bg: 'navy.500' }} leftIcon={<PlusIcon size={15} />} fontSize="12px" onClick={openCreate}>New task</Button>} />

      <Grid templateColumns={{ base: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }} gap="12px" mb="18px">
        {[
          { label: 'Pending', value: pending.length, icon: ClockIcon, color: '#b5760f', bg: '#fef3e0' },
          { label: 'In progress', value: inProgress.length, icon: ZapIcon, color: '#3355c9', bg: '#e8f0ff' },
          { label: 'High priority', value: highPriority.length, icon: FlameIcon, color: '#c23c3c', bg: '#fde8e8' },
          { label: 'Completion rate', value: `${completionRate}%`, icon: CheckCircleIcon, color: '#1c8a5c', bg: '#e8f5ee' }
        ].map((stat) => {
          const SIcon = stat.icon;
          return (
            <Card key={stat.label} p="15px">
              <Flex align="center" gap="10px">
                <Flex w="36px" h="36px" align="center" justify="center" borderRadius="10px" bg={stat.bg}>
                  <SIcon size={17} color={stat.color} />
                </Flex>
                <Box>
                  <Text fontSize="18px" fontWeight="800">{stat.value}</Text>
                  <Text fontSize="10px" color="app.subtle">{stat.label}</Text>
                </Box>
              </Flex>
            </Card>
          );
        })}
      </Grid>

      <Card>
        <Flex px="16px" py="10px" gap="10px" align="center" flexWrap="wrap" borderBottom="1px solid" borderColor="app.border">
          <HStack spacing="4px" flex="1" maxW="280px">
            <Input size="sm" placeholder="Search tasks..." value={search} onChange={(e) => setSearch(e.target.value)} borderRadius="9px" bg="app.surfaceAlt" borderColor="app.border" fontSize="12px" />
            <Icon as={SearchIcon} boxSize="14px" color="app.faint" ml="-30px" />
          </HStack>
          <Select size="sm" maxW="130px" value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)} borderRadius="9px" borderColor="app.border" fontSize="12px" ml="auto">
            <option value="All">All priorities</option>
            {PRIORITY_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
          </Select>
        </Flex>

        {loading ? (
          <Flex py="60px" justify="center"><Spinner color="brand.500" /></Flex>
        ) : filtered.length === 0 ? (
          <EmptyState icon={CheckCircleIcon} title="No tasks found" description="Create a new task to get started." action={<Button size="sm" bg="navy.600" color="white" borderRadius="9px" fontSize="12px" leftIcon={<PlusIcon size={15} />} onClick={openCreate}>New task</Button>} />
        ) : (
          <Box px="16px" py="12px">
            {grouped.map((group) => group.items.length > 0 && (
              <Box key={group.status} mb="20px">
                <Flex align="center" gap="8px" mb="10px">
                  <Box w="6px" h="6px" borderRadius="full" bg={group.status === 'Done' ? '#1c8a5c' : group.status === 'In Progress' ? '#3355c9' : '#b5760f'} />
                  <Text fontSize="11px" fontWeight="800" letterSpacing="0.06em" textTransform="uppercase" color="app.subtle">{group.status}</Text>
                  <Badge fontSize="9px" borderRadius="full" px="6px" py="1px" bg="app.surfaceAlt" color="app.subtle">{group.items.length}</Badge>
                </Flex>
                <Stack spacing="0">
                  {group.items.map((task) => {
                    const owner = OWNERS.find((o) => o.id === task.owner_id) ?? OWNERS[0];
                    const isOverdue = !task.done && task.due_date && new Date(task.due_date) < new Date(new Date().toDateString());
                    const isExpanded = expandedIds.has(task.id);
                    const taskSubs = subtasksFor(task.id);
                    return (
                      <Box key={task.id}>
                        <Flex
                          align="center"
                          gap="10px"
                          py="12px"
                          borderBottom="1px solid"
                          borderColor="app.border"
                          opacity={task.done ? 0.5 : 1}
                          _hover={{ bg: 'app.surfaceAlt' }}
                          borderRadius="8px"
                          px="6px"
                          transition="background .12s ease">
                          <Checkbox isChecked={task.done} onChange={() => toggleDone(task.id)} colorScheme="orange" />
                          {taskSubs.length > 0 && (
                            <IconButton
                              aria-label="Toggle subtasks"
                              icon={isExpanded ? <ChevronDownIcon size={15} /> : <ChevronRightIcon size={15} />}
                              size="xs"
                              variant="ghost"
                              onClick={() => toggleExpand(task.id)}
                              color="app.subtle"
                            />
                          )}
                          <Box w="4px" h="28px" borderRadius="full" bg={priorityColor[task.priority]} flexShrink={0} cursor="pointer" onClick={() => openDetail(task)} />
                          <Box flex="1" minW="0" cursor="pointer" onClick={() => openDetail(task)}>
                            <Text fontSize="13px" fontWeight="600" textDecoration={task.done ? 'line-through' : 'none'} noOfLines={1}>{task.title}</Text>
                            <Flex mt="4px" align="center" gap="10px" flexWrap="wrap">
                              {task.due_date && (
                                <Flex align="center" gap="4px" color={isOverdue ? '#c23c3c' : 'app.subtle'}>
                                  <Icon as={CalendarIcon} boxSize="11px" />
                                  <Text fontSize="10px" fontWeight={isOverdue ? '700' : '400'}>{task.due_date}</Text>
                                  {isOverdue && <Text fontSize="9px" color="#c23c3c" fontWeight="700">OVERDUE</Text>}
                                </Flex>
                              )}
                              {task.recurring !== 'None' && (
                                <Flex align="center" gap="4px" color="app.subtle"><Icon as={RepeatIcon} boxSize="11px" /><Text fontSize="10px">{task.recurring}</Text></Flex>
                              )}
                              {taskSubs.length > 0 && (
                                <Flex align="center" gap="4px" color="app.subtle">
                                  <Icon as={ListChecksIcon} boxSize="11px" />
                                  <Text fontSize="10px">{taskSubs.filter((s) => s.done).length}/{taskSubs.length}</Text>
                                </Flex>
                              )}
                            </Flex>
                          </Box>
                          <Badge fontSize="8px" borderRadius="full" px="6px" py="2px" bg={priorityBg[task.priority]} color={priorityColor[task.priority]} textTransform="capitalize">{task.priority}</Badge>
                          <Button size="xs" variant="ghost" fontSize="10px" onClick={() => cycleStatus(task.id)} color={task.status === 'Done' ? '#1c8a5c' : task.status === 'In Progress' ? '#3355c9' : 'app.subtle'} _hover={{ bg: 'app.surfaceAlt' }}>{task.status}</Button>
                          <Avatar size="2xs" name={owner.name} bg={owner.color} color="#46506a" fontSize="7px" />
                          <Button size="xs" variant="ghost" color="#c23c3c" onClick={() => { setDeleteId(task.id); confirmDel.onOpen(); }}><Trash2Icon size={13} /></Button>
                        </Flex>

                        {/* Subtasks (ClickUp-style expand) */}
                        <Collapse in={isExpanded} animateOpacity>
                          <Box ml="52px" mt="4px" mb="8px" pl="14px" borderLeft="2px solid" borderColor="app.border">
                            {taskSubs.map((st) => (
                              <Flex key={st.id} align="center" gap="8px" py="6px" _hover={{ bg: 'app.surfaceAlt' }} borderRadius="6px" px="6px">
                                <Checkbox isChecked={st.done} onChange={() => toggleSubtaskDone(st.id)} colorScheme="orange" size="sm" />
                                <Text fontSize="12px" flex="1" textDecoration={st.done ? 'line-through' : 'none'} color={st.done ? 'app.faint' : 'app.subtle'}>{st.title}</Text>
                                <IconButton aria-label="Delete subtask" icon={<Trash2Icon size={11} />} size="xs" variant="ghost" color="#c23c3c" onClick={() => deleteSubtask(st.id)} />
                              </Flex>
                            ))}
                            <Flex align="center" gap="8px" py="6px" px="6px">
                              <PlusIcon size={14} color="#8a93a6" />
                              <Input
                                size="xs"
                                placeholder="Add subtask..."
                                value={newSubtaskParent === task.id ? newSubtaskTitle : ''}
                                onChange={(e) => { setNewSubtaskParent(task.id); setNewSubtaskTitle(e.target.value); }}
                                onKeyDown={(e) => { if (e.key === 'Enter') addSubtask(); }}
                                borderRadius="6px"
                                borderColor="app.border"
                                fontSize="11px"
                                maxW="300px"
                              />
                              {newSubtaskParent === task.id && newSubtaskTitle.trim() && (
                                <Button size="xs" variant="ghost" color="#1c8a5c" onClick={addSubtask}>Add</Button>
                              )}
                            </Flex>
                          </Box>
                        </Collapse>
                      </Box>
                    );
                  })}
                </Stack>
              </Box>
            ))}
          </Box>
        )}
      </Card>

      {/* Floating detail modal */}
      <Modal isOpen={detailModal.isOpen} onClose={detailModal.onClose} size="md" isCentered>
        <ModalOverlay backdropFilter="blur(4px)" />
        <ModalContent bg="app.surface" borderRadius="18px" overflow="hidden">
          <ModalHeader borderBottom="1px solid" borderColor="app.border" pb="14px">
            {detailTask && (
              <Flex align="center" gap="10px">
                <Box w="4px" h="24px" borderRadius="full" bg={priorityColor[detailTask.priority]} />
                <Text fontFamily="'Plus Jakarta Sans', sans-serif" fontWeight="800" fontSize="16px" textDecoration={detailTask.done ? 'line-through' : 'none'}>{detailTask.title}</Text>
              </Flex>
            )}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody py="18px">
            {detailTask && (() => {
              const owner = OWNERS.find((o) => o.id === detailTask.owner_id) ?? OWNERS[0];
              const isOverdue = !detailTask.done && detailTask.due_date && new Date(detailTask.due_date) < new Date(new Date().toDateString());
              const taskSubs = subtasksFor(detailTask.id);
              return (
                <Stack spacing="14px">
                  <Flex gap="8px" flexWrap="wrap">
                    <Badge fontSize="9px" borderRadius="full" px="8px" py="2px" bg={priorityBg[detailTask.priority]} color={priorityColor[detailTask.priority]} textTransform="capitalize">{detailTask.priority} priority</Badge>
                    <Badge fontSize="9px" borderRadius="full" px="8px" py="2px" bg={detailTask.status === 'Done' ? '#e8f5ee' : detailTask.status === 'In Progress' ? '#e8f0ff' : '#fef3e0'} color={detailTask.status === 'Done' ? '#1c8a5c' : detailTask.status === 'In Progress' ? '#3355c9' : '#b5760f'} textTransform="capitalize">{detailTask.status}</Badge>
                    {detailTask.recurring !== 'None' && <Badge fontSize="9px" borderRadius="full" px="8px" py="2px" bg="#f0e8ff" color="#7c3aed" textTransform="capitalize">{detailTask.recurring}</Badge>}
                  </Flex>

                  <Grid templateColumns="1fr 1fr" gap="10px">
                    <Box p="14px" bg="app.surfaceAlt" borderRadius="12px">
                      <Flex align="center" gap="6px"><Icon as={CalendarIcon} boxSize="12px" color="app.faint" /><Text fontSize="10px" color="app.faint">Due date</Text></Flex>
                      <Text mt="4px" fontSize="14px" fontWeight="700" color={isOverdue ? '#c23c3c' : 'app.text'}>{detailTask.due_date ?? 'No due date'}</Text>
                      {isOverdue && <Text fontSize="10px" color="#c23c3c" fontWeight="700">OVERDUE</Text>}
                    </Box>
                    <Box p="14px" bg="app.surfaceAlt" borderRadius="12px">
                      <Flex align="center" gap="6px"><Icon as={ListChecksIcon} boxSize="12px" color="app.faint" /><Text fontSize="10px" color="app.faint">Subtasks</Text></Flex>
                      <Text mt="4px" fontSize="14px" fontWeight="700">{taskSubs.filter((s) => s.done).length}/{taskSubs.length || detailTask.checklist_total}</Text>
                    </Box>
                  </Grid>

                  {taskSubs.length > 0 && (
                    <Box p="14px" bg="app.surfaceAlt" borderRadius="12px">
                      <Text fontSize="10px" color="app.faint" mb="8px">SUBTASKS</Text>
                      <Stack spacing="4px">
                        {taskSubs.map((st) => (
                          <Flex key={st.id} align="center" gap="8px">
                            <Checkbox isChecked={st.done} onChange={() => toggleSubtaskDone(st.id)} colorScheme="orange" size="sm" />
                            <Text fontSize="12px" flex="1" textDecoration={st.done ? 'line-through' : 'none'} color={st.done ? 'app.faint' : 'app.subtle'}>{st.title}</Text>
                          </Flex>
                        ))}
                      </Stack>
                    </Box>
                  )}

                  <Box p="14px" bg="app.surfaceAlt" borderRadius="12px">
                    <Text fontSize="10px" color="app.faint" mb="8px">ASSIGNED TO</Text>
                    <Flex align="center" gap="10px">
                      <Avatar size="sm" name={owner.name} bg={owner.color} color="#46506a" />
                      <Box>
                        <Text fontSize="12px" fontWeight="700">{owner.name}</Text>
                        <Text fontSize="10px" color="app.subtle">{detailTask.reminder ? 'Reminder enabled' : 'No reminder'}</Text>
                      </Box>
                    </Flex>
                  </Box>

                  <Flex gap="8px" pt="4px">
                    {!detailTask.done && <Button size="sm" flex="1" bg="#1c8a5c" color="white" _hover={{ bg: '#167a4e' }} borderRadius="9px" fontSize="12px" leftIcon={<CheckCircleIcon size={13} />} onClick={() => { toggleDone(detailTask.id); detailModal.onClose(); }}>Mark done</Button>}
                    <Button size="sm" flex="1" bg="navy.600" color="white" _hover={{ bg: 'navy.500' }} borderRadius="9px" fontSize="12px" onClick={() => { detailModal.onClose(); openEdit(detailTask); }}>Edit task</Button>
                    <Button size="sm" flex="1" variant="outline" borderColor="#c23c3c" color="#c23c3c" borderRadius="9px" fontSize="12px" leftIcon={<Trash2Icon size={13} />} onClick={() => { setDeleteId(detailTask.id); confirmDel.onOpen(); }}>Delete</Button>
                  </Flex>
                </Stack>
              );
            })()}
          </ModalBody>
        </ModalContent>
      </Modal>

      <FormModal isOpen={formDrawer.isOpen} onClose={formDrawer.onClose} title={editing ? 'Edit task' : 'New task'} subtitle={editing ? 'Update task details' : 'Create a new task'} loading={saving} onSubmit={handleSubmit} submitLabel={editing ? 'Update' : 'Create'}>
        <FormControl>
          <FormLabel fontSize="12px">Title</FormLabel>
          <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Follow up with Maya Patel" size="sm" borderRadius="9px" borderColor="app.border" fontSize="13px" />
        </FormControl>
        <Grid templateColumns="1fr 1fr" gap="10px">
          <FormControl>
            <FormLabel fontSize="12px">Priority</FormLabel>
            <Select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} size="sm" borderRadius="9px" borderColor="app.border" fontSize="13px">
              {PRIORITY_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
            </Select>
          </FormControl>
          <FormControl>
            <FormLabel fontSize="12px">Status</FormLabel>
            <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} size="sm" borderRadius="9px" borderColor="app.border" fontSize="13px">
              <option>Pending</option><option>In Progress</option><option>Done</option>
            </Select>
          </FormControl>
        </Grid>
        <Grid templateColumns="1fr 1fr" gap="10px">
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
        </Grid>
        <Grid templateColumns="1fr 1fr" gap="10px">
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
        </Grid>
        <FormControl>
          <Flex align="center" gap="10px">
            <Checkbox isChecked={form.reminder} onChange={(e) => setForm({ ...form, reminder: e.target.checked })} colorScheme="orange" />
            <Text fontSize="12px">Send reminder notification</Text>
          </Flex>
        </FormControl>
      </FormModal>

      <ConfirmDialog isOpen={confirmDel.isOpen} onClose={confirmDel.onClose} title="Delete task" message="Are you sure you want to delete this task and its subtasks?" confirmLabel="Delete" danger onConfirm={handleDelete} />
    </>
  );
}
