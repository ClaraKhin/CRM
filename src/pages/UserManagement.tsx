import React, { useCallback, useEffect, useState } from 'react';
import {
  Avatar,
  Badge,
  Box,
  Button,
  Flex,
  FormControl,
  FormLabel,
  Grid,
  HStack,
  Icon,
  IconButton,
  Input,
  Select,
  Spinner,
  Stack,
  Table,
  TableContainer,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  useDisclosure,
  useToast } from '@chakra-ui/react';
import { MailIcon, MoreHorizontalIcon, PlusIcon, Trash2Icon, UserCogIcon, UsersIcon } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Card, CardHeader } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { FormModal } from '../components/ui/FormModal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { supabase, ROLE_LABELS, type UserRole } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

const ROLE_OPTIONS = Object.entries(ROLE_LABELS).map(([value, label]) => ({ value, label }));
const AVATAR_COLORS = ['#ffdccb', '#d8e7ff', '#eadbff', '#c9f0e3', '#ffe0ee', '#f9dfbe', '#e0dcff', '#d5e3ff'];

type Profile = {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  avatar_color: string;
  created_at: string;
};

export function UserManagement() {
  const toast = useToast();
  const { session } = useAuth();
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const userModal = useDisclosure();
  const confirmDel = useDisclosure();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ email: '', full_name: '', role: 'sales_executive' as UserRole, avatar_color: '#ffdccb' });

  const load = useCallback(async () => {
    if (!session?.user) return;
    setLoading(true);
    const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    setUsers((data ?? []) as Profile[]);
    setLoading(false);
  }, [session]);

  useEffect(() => { load(); }, [load]);

  const filtered = users
    .filter((u) => roleFilter === 'All' || u.role === roleFilter)
    .filter((u) => !search || u.full_name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()));

  const openCreate = () => {
    setEditingId(null);
    setForm({ email: '', full_name: '', role: 'sales_executive', avatar_color: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)] });
    userModal.onOpen();
  };

  const openEdit = (u: Profile) => {
    setEditingId(u.id);
    setForm({ email: u.email, full_name: u.full_name, role: u.role, avatar_color: u.avatar_color ?? '#ffdccb' });
    userModal.onOpen();
  };

  const handleSubmit = async () => {
    if (!form.email.trim() || !form.full_name.trim()) { toast({ title: 'Email and name are required', status: 'error', duration: 2000, position: 'top-right' }); return; }
    setSaving(true);
    if (editingId) {
      const { error } = await supabase.from('profiles').update({ full_name: form.full_name, role: form.role, avatar_color: form.avatar_color }).eq('id', editingId);
      if (error) toast({ title: 'Update failed', description: error.message, status: 'error', duration: 3000, position: 'top-right' });
      else toast({ title: 'User updated', status: 'success', duration: 2000, position: 'top-right' });
    } else {
      const { error } = await supabase.from('profiles').insert({ email: form.email, full_name: form.full_name, role: form.role, avatar_color: form.avatar_color });
      if (error) toast({ title: 'Create failed', description: error.message, status: 'error', duration: 3000, position: 'top-right' });
      else toast({ title: 'User created', status: 'success', duration: 2000, position: 'top-right' });
    }
    setSaving(false);
    userModal.onClose();
    load();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await supabase.from('profiles').delete().eq('id', deleteId);
    toast({ title: 'User deleted', status: 'success', duration: 1800, position: 'top-right' });
    confirmDel.onClose();
    setDeleteId(null);
    load();
  };

  const roleStats = ROLE_OPTIONS.map((r) => ({ ...r, count: users.filter((u) => u.role === r.value).length }));

  return (
    <>
      <PageHeader
        title="User Management"
        subtitle="Manage team members, roles, and access."
        actions={<Button size="sm" borderRadius="9px" bg="navy.600" color="white" _hover={{ bg: 'navy.500' }} leftIcon={<PlusIcon size={15} />} fontSize="12px" onClick={openCreate}>Add user</Button>} />

      <Grid templateColumns={{ base: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)', xl: 'repeat(6, 1fr)' }} gap="12px" mb="18px">
        {roleStats.map((r) => (
          <Card key={r.value} p="15px">
            <Text fontSize="10px" color="app.subtle">{r.label}</Text>
            <Text mt="4px" fontSize="22px" fontWeight="800">{r.count}</Text>
          </Card>
        ))}
      </Grid>

      <Card>
        <Flex px={{ base: '14px', md: '20px' }} py="14px" gap="10px" align="center" flexWrap="wrap" borderBottom="1px solid" borderColor="app.border">
          <Input maxW="240px" size="sm" placeholder="Search users..." value={search} onChange={(e) => setSearch(e.target.value)} borderRadius="9px" bg="app.surfaceAlt" borderColor="app.border" fontSize="12px" />
          <Select size="sm" maxW="160px" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} borderRadius="9px" borderColor="app.border" fontSize="12px">
            <option value="All">All roles</option>
            {ROLE_OPTIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </Select>
          <Text ml="auto" fontSize="12px" color="app.subtle">{filtered.length} users</Text>
        </Flex>

        {loading ? (
          <Flex py="60px" justify="center"><Spinner color="brand.500" /></Flex>
        ) : filtered.length === 0 ? (
          <EmptyState icon={UsersIcon} title="No users found" description="Add a new user to get started." action={<Button size="sm" bg="navy.600" color="white" borderRadius="9px" fontSize="12px" leftIcon={<PlusIcon size={15} />} onClick={openCreate}>Add user</Button>} />
        ) : (
          <TableContainer>
            <Table size="sm">
              <Thead>
                <Tr>
                  <Th borderColor="app.border" fontSize="10px" color="app.faint">User</Th>
                  <Th borderColor="app.border" fontSize="10px" color="app.faint" display={{ base: 'none', md: 'table-cell' }}>Email</Th>
                  <Th borderColor="app.border" fontSize="10px" color="app.faint">Role</Th>
                  <Th borderColor="app.border" fontSize="10px" color="app.faint" display={{ base: 'none', lg: 'table-cell' }}>Joined</Th>
                  <Th borderColor="app.border" w="80px"></Th>
                </Tr>
              </Thead>
              <Tbody>
                {filtered.map((u) => (
                  <Tr key={u.id} _hover={{ bg: 'app.surfaceAlt' }} cursor="pointer" onClick={() => openEdit(u)}>
                    <Td borderColor="app.border">
                      <Flex align="center" gap="10px">
                        <Avatar size="sm" name={u.full_name} bg={u.avatar_color ?? '#ffdccb'} color="#46506a" fontSize="11px" />
                        <Text fontSize="12px" fontWeight="700">{u.full_name}</Text>
                      </Flex>
                    </Td>
                    <Td borderColor="app.border" display={{ base: 'none', md: 'table-cell' }} fontSize="12px" color="app.subtle">{u.email}</Td>
                    <Td borderColor="app.border">
                      <Badge fontSize="10px" borderRadius="full" px="8px" py="2px" bg="brand.50" color="brand.600" textTransform="none">{ROLE_LABELS[u.role] ?? u.role}</Badge>
                    </Td>
                    <Td borderColor="app.border" display={{ base: 'none', lg: 'table-cell' }} fontSize="12px" color="app.subtle">{u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}</Td>
                    <Td borderColor="app.border" onClick={(e) => e.stopPropagation()}>
                      <Button size="xs" variant="ghost" color="#c23c3c" onClick={() => { setDeleteId(u.id); confirmDel.onOpen(); }}><Trash2Icon size={13} /></Button>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </TableContainer>
        )}
      </Card>

      <FormModal isOpen={userModal.isOpen} onClose={userModal.onClose} title={editingId ? 'Edit user' : 'Add user'} subtitle={editingId ? 'Update user details' : 'Create a new team member'} loading={saving} onSubmit={handleSubmit} submitLabel={editingId ? 'Update' : 'Create'}>
        <FormControl>
          <FormLabel fontSize="12px">Full name</FormLabel>
          <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} placeholder="Renee Walker" size="sm" borderRadius="9px" borderColor="app.border" fontSize="13px" />
        </FormControl>
        <FormControl>
          <FormLabel fontSize="12px">Email</FormLabel>
          <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@company.com" size="sm" borderRadius="9px" borderColor="app.border" fontSize="13px" isDisabled={!!editingId} />
        </FormControl>
        <FormControl>
          <FormLabel fontSize="12px">Role</FormLabel>
          <Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })} size="sm" borderRadius="9px" borderColor="app.border" fontSize="13px">
            {ROLE_OPTIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </Select>
        </FormControl>
        <FormControl>
          <FormLabel fontSize="12px">Avatar color</FormLabel>
          <Flex gap="8px" flexWrap="wrap">
            {AVATAR_COLORS.map((c) => (
              <Box key={c} w="28px" h="28px" borderRadius="full" bg={c} cursor="pointer" border={form.avatar_color === c ? '2px solid' : '1px solid'} borderColor={form.avatar_color === c ? 'brand.500' : 'app.border'} onClick={() => setForm({ ...form, avatar_color: c })} />
            ))}
          </Flex>
        </FormControl>
      </FormModal>

      <ConfirmDialog isOpen={confirmDel.isOpen} onClose={confirmDel.onClose} title="Delete user" message="Are you sure you want to delete this user?" confirmLabel="Delete" danger onConfirm={handleDelete} />
    </>
  );
}
