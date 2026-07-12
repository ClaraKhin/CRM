import React, { useCallback, useEffect, useState } from 'react';
import {
  Avatar,
  Badge,
  Box,
  Button,
  Checkbox,
  Flex,
  FormControl,
  FormLabel,
  Grid,
  HStack,
  Icon,
  Input,
  InputGroup,
  InputLeftElement,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Progress,
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
  created_at: string;
};

const OWNERS = [
  { id: 'o1', name: 'Renee Walker', color: '#ffdccb' },
  { id: 'o2', name: 'Marcus Chen', color: '#d8e7ff' },
  { id: 'o3', name: 'Priya Nair', color: '#eadbff' },
  { id: 'o4', name: 'Diego Alvarez', color: '#c9f0e3' }
];
const PRIORITY_OPTIONS = ['High', 'Medium', 'Low'];
const RECURRING_OPTIONS = ['None', 'Daily', 'Weekly', 'Monthly'];
const STATUS_FILTERS = ['All', 'Pending', 'In Progress', 'Done'];

const priorityColor: Record<string, string> = { High: '#c23c3c', Medium: '#b5760f', Low: '#6b7488' };
const priorityBg: Record<string, string> = { High: '#fde8e8', Medium: '#fef3e0', Low: '#f0f2f5' };

export function Tasks() {
  const toast = useToast();
  const { session } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterPriority, setFilterPriority] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
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
    const { data } = await supabase.from('tasks').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false });
    setTasks((data ?? []) as Task[]);
    setLoading(false);
  }, [session]);

  useEffect(() => { load(); }, [load]);

  const filtered = tasks
    .filter((t) => filterPriority === 'All' || t.priority === filterPriority)
    .filter((t) => filterStatus === 'All' || t.status === filterStatus)
    .filter((t) => !search || t.title.toLowerCase().includes(search.toLowerCase()));

  const pending = tasks.filter((t) => !t.done);
  const inProgress = tasks.filter((t) => t.status === 'In Progress');
  const done = tasks.filter((t) => t.done);
  const highPriority = pending.filter((t) => t.priority === 'High');
  const overdue = pending.filter((t) => t.due_date && new Date(t.due_date) < new Date(new Date().toDateString()));
  const completionRate = tasks.length > 0 ? Math.round((done.length / tasks.length) * 100) : 0;

  const toggleDone = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    const newDone = !task.done;
    setTasks((prev) => prev.map((t) => t.id === id ? { ...t, done: newDone, status: newDone ? 'Done' : 'Pending' } : t));
    await supabase.from('tasks').update({ done: newDone, status: newDone ? 'Done' : 'Pending' }).eq('id', id).eq('user_id', session!.user.id);
    if (newDone) toast({ title: 'Task completed', status: 'success', duration: 1400, position: 'top-right' });
  };

  const cycleStatus = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    const statuses = ['Pending', 'In Progress', 'Done'];
    const next = statuses[(statuses.indexOf(task.status) + 1) % statuses.length];
    setTasks((prev) => prev.map((t) => t.id === id ? { ...t, status: next, done: next === 'Done' } : t));
    await supabase.from('tasks').update({ status: next, done: next === 'Done' }).eq('id', id).eq('user_id', session!.user.id);
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

      {/* Stats cards */}
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

      {overdue.length > 0 && (
        <Flex align="center" gap="8px" mb="14px" p="10px" bg="#fde8e8" borderRadius="10px">
          <AlertCircleIcon size={15} color="#c23c3c" />
          <Text fontSize="12px" color="#c23c3c" fontWeight="600">{overdue.length} overdue task{overdue.length > 1 ? 's' : ''} — review and reschedule</Text>
        </Flex>
      )}

      <Card>
        <CardHeader title="All tasks" subtitle={`${filtered.length} tasks`} />
        <Flex px="16px" py="10px" gap="10px" align="center" flexWrap="wrap" borderBottom="1px solid" borderColor="app.border">
          <InputGroup size="sm" maxW="220px">
            <InputLeftElement pointerEvents="none"><SearchIcon size={13} color="#8a93a6" /></InputLeftElement>
            <Input pl="32px" placeholder="Search tasks..." value={search} onChange={(e) => setSearch(e.target.value)} borderRadius="9px" bg="app.surfaceAlt" borderColor="app.border" fontSize="12px" />
          </InputGroup>
          <HStack spacing="4px">
            {STATUS_FILTERS.map((s) => (
              <Button key={s} size="xs" borderRadius="full" variant={filterStatus === s ? 'solid' : 'outline'} bg={filterStatus === s ? 'navy.600' : 'transparent'} color={filterStatus === s ? 'white' : 'app.subtle'} borderColor="app.border" _hover={{ bg: filterStatus === s ? 'navy.500' : 'app.surfaceAlt' }} fontSize="11px" onClick={() => setFilterStatus(s)}>{s}</Button>
            ))}
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
          <Stack spacing="0">
            {filtered.map((task) => {
              const owner = OWNERS.find((o) => o.id === task.owner_id) ?? OWNERS[0];
              const isOverdue = !task.done && task.due_date && new Date(task.due_date) < new Date(new Date().toDateString());
              return (
                <Flex
                  key={task.id}
                  align="center"
                  gap="12px"
                  px="16px"
                  py="14px"
                  borderBottom="1px solid"
                  borderColor="app.border"
                  opacity={task.done ? 0.5 : 1}
                  cursor="pointer"
                  onClick={() => openDetail(task)}
                  _hover={{ bg: 'app.surfaceAlt' }}
                  transition="background .12s ease">
                  <Checkbox isChecked={task.done} onChange={(e) => toggleDone(task.id, e)} colorScheme="orange" onClick={(e) => e.stopPropagation()} />
                  <Box
                    w="4px"
                    h="32px"
                    borderRadius="full"
                    bg={priorityColor[task.priority]}
                    flexShrink={0}
                  />
                  <Box flex="1" minW="0">
                    <Text fontSize="13px" fontWeight="600" textDecoration={task.done ? 'line-through' : 'none'} noOfLines={1}>{task.title}</Text>
                    <Flex mt="5px" align="center" gap="10px" flexWrap="wrap">
                      <Flex align="center" gap="4px" color={isOverdue ? '#c23c3c' : 'app.subtle'}>
                        <Icon as={CalendarIcon} boxSize="11px" />
                        <Text fontSize="10px" fontWeight={isOverdue ? '700' : '400'}>{task.due_date ?? 'No due date'}</Text>
                        {isOverdue && <Text fontSize="9px" color="#c23c3c" fontWeight="700">OVERDUE</Text>}
                      </Flex>
                      {task.recurring !== 'None' && (
                        <Flex align="center" gap="4px" color="app.subtle">
                          <Icon as={RepeatIcon} boxSize="11px" />
                          <Text fontSize="10px">{task.recurring}</Text>
                        </Flex>
                      )}
                      {task.checklist_total > 0 && (
                        <Flex align="center" gap="6px" minW="80px">
                          <Progress value={task.checklist_done / task.checklist_total * 100} size="xs" colorScheme="orange" borderRadius="full" flex="1" bg="app.surfaceAlt" w="60px" />
                          <Text fontSize="9px" color="app.faint">{task.checklist_done}/{task.checklist_total}</Text>
                        </Flex>
                      )}
                    </Flex>
                  </Box>
                  <Badge fontSize="8px" borderRadius="full" px="6px" py="2px" bg={priorityBg[task.priority]} color={priorityColor[task.priority]} textTransform="capitalize">{task.priority}</Badge>
                  <Button
                    size="xs"
                    variant="ghost"
                    fontSize="10px"
                    onClick={(e) => cycleStatus(task.id, e)}
                    color={task.status === 'Done' ? '#1c8a5c' : task.status === 'In Progress' ? '#3355c9' : 'app.subtle'}
                    _hover={{ bg: 'app.surfaceAlt' }}>
                    {task.status}
                  </Button>
                  <Avatar size="2xs" name={owner.name} bg={owner.color} color="#46506a" fontSize="7px" />
                  <Button size="xs" variant="ghost" color="#c23c3c" onClick={(e) => { e.stopPropagation(); setDeleteId(task.id); confirmDel.onOpen(); }}><Trash2Icon size={13} /></Button>
                </Flex>
              );
            })}
          </Stack>
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
                      <Flex align="center" gap="6px"><Icon as={ListChecksIcon} boxSize="12px" color="app.faint" /><Text fontSize="10px" color="app.faint">Checklist</Text></Flex>
                      <Text mt="4px" fontSize="14px" fontWeight="700">{detailTask.checklist_done}/{detailTask.checklist_total}</Text>
                    </Box>
                  </Grid>

                  {detailTask.checklist_total > 0 && (
                    <Box>
                      <Flex justify="space-between" mb="6px">
                        <Text fontSize="11px" color="app.subtle">Progress</Text>
                        <Text fontSize="11px" fontWeight="700">{Math.round(detailTask.checklist_done / detailTask.checklist_total * 100)}%</Text>
                      </Flex>
                      <Box w="full" h="8px" bg="app.surfaceAlt" borderRadius="full" overflow="hidden">
                        <Box h="full" bg="#e9683f" borderRadius="full" style={{ width: `${detailTask.checklist_done / detailTask.checklist_total * 100}%` }} />
                      </Box>
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
                    {!detailTask.done && (
                      <Button size="sm" flex="1" bg="#1c8a5c" color="white" _hover={{ bg: '#167a4e' }} borderRadius="9px" fontSize="12px" leftIcon={<CheckCircleIcon size={13} />} onClick={(e) => { toggleDone(detailTask.id, e); detailModal.onClose(); }}>Mark done</Button>
                    )}
                    <Button size="sm" flex="1" bg="navy.600" color="white" _hover={{ bg: 'navy.500' }} borderRadius="9px" fontSize="12px" onClick={() => { detailModal.onClose(); openEdit(detailTask); }}>Edit task</Button>
                    <Button size="sm" flex="1" variant="outline" borderColor="#c23c3c" color="#c23c3c" borderRadius="9px" fontSize="12px" leftIcon={<Trash2Icon size={13} />} onClick={() => { setDeleteId(detailTask.id); confirmDel.onOpen(); }}>Delete</Button>
                  </Flex>
                </Stack>
              );
            })()}
          </ModalBody>
        </ModalContent>
      </Modal>

      <FormDrawer isOpen={formDrawer.isOpen} onClose={formDrawer.onClose} title={editing ? 'Edit task' : 'New task'} subtitle={editing ? 'Update task details' : 'Create a new task'} loading={saving} onSubmit={handleSubmit} submitLabel={editing ? 'Update' : 'Create'}>
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
      </FormDrawer>

      <ConfirmDialog isOpen={confirmDel.isOpen} onClose={confirmDel.onClose} title="Delete task" message="Are you sure you want to delete this task?" confirmLabel="Delete" danger onConfirm={handleDelete} />
    </>
  );
}
