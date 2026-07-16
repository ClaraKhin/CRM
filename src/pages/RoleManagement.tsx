import React, { useCallback, useEffect, useState } from 'react';
import {
  Badge,
  Box,
  Button,
  Flex,
  FormControl,
  FormLabel,
  Grid,
  HStack,
  Icon,
  Input,
  Select,
  Spinner,
  Stack,
  Switch,
  Text,
  Textarea,
  useDisclosure,
  useToast } from '@chakra-ui/react';
import { CheckCircleIcon, PlusIcon, ShieldCheckIcon, Trash2Icon } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Card, CardHeader } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { FormModal } from '../components/ui/FormModal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

type Role = {
  id: string;
  name: string;
  description: string;
  permissions: Record<string, boolean>;
  is_default: boolean;
  created_at: string;
};

const PERMISSION_GROUPS: { group: string; perms: { key: string; label: string }[] }[] = [
  {
    group: 'Leads',
    perms: [
      { key: 'view_leads', label: 'View leads' },
      { key: 'edit_leads', label: 'Create & edit leads' },
      { key: 'delete_leads', label: 'Delete leads' },
      { key: 'merge_leads', label: 'Merge duplicates' },
    ],
  },
  {
    group: 'Deals & Pipeline',
    perms: [
      { key: 'view_deals', label: 'View pipeline' },
      { key: 'edit_deals', label: 'Create & edit deals' },
      { key: 'delete_deals', label: 'Delete deals' },
      { key: 'generate_quotes', label: 'Generate quotes' },
    ],
  },
  {
    group: 'Customers',
    perms: [
      { key: 'view_customers', label: 'View customers' },
      { key: 'edit_customers', label: 'Create & edit customers' },
      { key: 'delete_customers', label: 'Delete customers' },
    ],
  },
  {
    group: 'Invoices & Quotes',
    perms: [
      { key: 'view_invoices', label: 'View invoices' },
      { key: 'edit_invoices', label: 'Create & edit invoices' },
      { key: 'delete_invoices', label: 'Delete invoices' },
    ],
  },
  {
    group: 'Tasks & Calendar',
    perms: [
      { key: 'view_tasks', label: 'View tasks' },
      { key: 'edit_tasks', label: 'Create & edit tasks' },
      { key: 'delete_tasks', label: 'Delete tasks' },
    ],
  },
  {
    group: 'Administration',
    perms: [
      { key: 'manage_users', label: 'Manage users' },
      { key: 'manage_roles', label: 'Manage roles' },
      { key: 'export_data', label: 'Export data' },
      { key: 'view_audit_logs', label: 'View audit logs' },
      { key: 'manage_settings', label: 'Manage settings' },
    ],
  },
];

const ALL_PERM_KEYS = PERMISSION_GROUPS.flatMap((g) => g.perms.map((p) => p.key));

export function RoleManagement() {
  const toast = useToast();
  const { session } = useAuth();
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const roleModal = useDisclosure();
  const confirmDel = useDisclosure();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', description: '' });
  const [permDraft, setPermDraft] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    if (!session?.user) return;
    setLoading(true);
    const { data, error } = await supabase.from('roles').select('*').order('created_at', { ascending: false });
    if (error) {
      toast({ title: 'Failed to load roles', description: error.message, status: 'error', duration: 3000, position: 'top-right' });
      setLoading(false);
      return;
    }
    const roleList = (data ?? []) as Role[];
    setRoles(roleList);
    if (roleList.length > 0 && !selectedRoleId) setSelectedRoleId(roleList[0].id);
    setLoading(false);
  }, [session, selectedRoleId, toast]);

  useEffect(() => { load(); }, [load]);

  const selectedRole = roles.find((r) => r.id === selectedRoleId) ?? null;
  const permCount = selectedRole ? Object.values(selectedRole.permissions).filter(Boolean).length : 0;

  const togglePerm = async (key: string) => {
    if (!selectedRole || !session?.user) return;
    const newPerms = { ...selectedRole.permissions, [key]: !selectedRole.permissions[key] };
    setRoles((prev) => prev.map((r) => r.id === selectedRole.id ? { ...r, permissions: newPerms } : r));
    const { error } = await supabase.from('roles').update({ permissions: newPerms, updated_at: new Date().toISOString() }).eq('id', selectedRole.id);
    if (error) {
      toast({ title: 'Failed to update permission', description: error.message, status: 'error', duration: 3000, position: 'top-right' });
      setRoles((prev) => prev.map((r) => r.id === selectedRole.id ? { ...r, permissions: selectedRole.permissions } : r));
      load();
      return;
    }
    toast({ title: 'Permission updated', status: 'success', duration: 1200, position: 'top-right' });
  };

  const openCreate = () => {
    setEditingId(null);
    setForm({ name: '', description: '' });
    const initPerms: Record<string, boolean> = {};
    ALL_PERM_KEYS.forEach((k) => { initPerms[k] = false; });
    setPermDraft(initPerms);
    roleModal.onOpen();
  };

  const openEdit = (role: Role) => {
    setEditingId(role.id);
    setForm({ name: role.name, description: role.description });
    const initPerms: Record<string, boolean> = {};
    ALL_PERM_KEYS.forEach((k) => { initPerms[k] = !!role.permissions[k]; });
    setPermDraft(initPerms);
    roleModal.onOpen();
  };

  const toggleDraftPerm = (key: string) => {
    setPermDraft((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) { toast({ title: 'Role name is required', status: 'error', duration: 2000, position: 'top-right' }); return; }
    setSaving(true);
    if (editingId) {
      const { error } = await supabase.from('roles').update({ name: form.name, description: form.description, permissions: permDraft, updated_at: new Date().toISOString() }).eq('id', editingId);
      if (error) { toast({ title: 'Update failed', description: error.message, status: 'error', duration: 3000, position: 'top-right' }); setSaving(false); return; }
      toast({ title: 'Role updated', status: 'success', duration: 2000, position: 'top-right' });
    } else {
      const { error } = await supabase.from('roles').insert({ name: form.name, description: form.description, permissions: permDraft, is_default: false });
      if (error) { toast({ title: 'Create failed', description: error.message, status: 'error', duration: 3000, position: 'top-right' }); setSaving(false); return; }
      toast({ title: 'Role created', status: 'success', duration: 2000, position: 'top-right' });
    }
    setSaving(false);
    roleModal.onClose();
    load();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from('roles').delete().eq('id', deleteId);
    if (error) { toast({ title: 'Delete failed', description: error.message, status: 'error', duration: 3000, position: 'top-right' }); confirmDel.onClose(); return; }
    toast({ title: 'Role deleted', status: 'success', duration: 1800, position: 'top-right' });
    if (selectedRoleId === deleteId) setSelectedRoleId(null);
    confirmDel.onClose();
    setDeleteId(null);
    load();
  };

  return (
    <>
      <PageHeader
        title="Role Management"
        subtitle="Define roles and assign granular permissions."
        actions={<Button size="sm" borderRadius="9px" bg="navy.600" color="white" _hover={{ bg: 'navy.500' }} leftIcon={<PlusIcon size={15} />} fontSize="12px" onClick={openCreate}>New role</Button>} />

      <Grid templateColumns={{ base: '1fr', lg: '280px 1fr' }} gap="18px">
        {/* Role list */}
        <Stack spacing="10px">
          {loading ? (
            <Flex py="40px" justify="center"><Spinner color="brand.500" /></Flex>
          ) : roles.length === 0 ? (
            <Card><EmptyState icon={ShieldCheckIcon} title="No roles yet" description="Create a role to manage permissions." action={<Button size="sm" bg="navy.600" color="white" borderRadius="9px" fontSize="12px" leftIcon={<PlusIcon size={15} />} onClick={openCreate}>New role</Button>} /></Card>
          ) : roles.map((role) => {
            const count = Object.values(role.permissions).filter(Boolean).length;
            const isActive = role.id === selectedRoleId;
            return (
              <Card key={role.id} p="14px" cursor="pointer" borderColor={isActive ? 'brand.500' : 'app.border'} borderWidth={isActive ? '2px' : '1px'} _hover={{ borderColor: 'app.subtle' }} onClick={() => setSelectedRoleId(role.id)}>
                <Flex align="center" gap="10px">
                  <Flex w="32px" h="32px" borderRadius="9px" bg={isActive ? 'brand.50' : 'app.surfaceAlt'} align="center" justify="center">
                    <Icon as={ShieldCheckIcon} boxSize="16px" color={isActive ? 'brand.600' : 'app.faint'} />
                  </Flex>
                  <Box flex="1" minW="0">
                    <Text fontSize="13px" fontWeight="700" noOfLines={1}>{role.name}</Text>
                    <Text fontSize="10px" color="app.faint">{count} permissions</Text>
                  </Box>
                  {role.is_default && <Badge fontSize="9px" bg="brand.50" color="brand.600" borderRadius="full" px="6px">Default</Badge>}
                </Flex>
              </Card>
            );
          })}
        </Stack>

        {/* Permission editor */}
        {selectedRole ? (
          <Card>
            <CardHeader
              title={selectedRole.name}
              subtitle={selectedRole.description || 'No description'}
              right={
                <HStack spacing="6px">
                  <Badge fontSize="10px" bg="brand.50" color="brand.600" borderRadius="full" px="8px">{permCount} active</Badge>
                  <Button size="xs" variant="outline" borderColor="app.border" fontSize="11px" onClick={() => openEdit(selectedRole)}>Edit</Button>
                  <Button size="xs" variant="ghost" color="#c23c3c" onClick={() => { setDeleteId(selectedRole.id); confirmDel.onOpen(); }}><Trash2Icon size={13} /></Button>
                </HStack>
              }
            />
            <Box px="20px" py="16px">
              <Stack spacing="20px">
                {PERMISSION_GROUPS.map((group) => (
                  <Box key={group.group}>
                    <Text fontSize="11px" fontWeight="700" color="app.faint" letterSpacing="0.08em" mb="10px">{group.group.toUpperCase()}</Text>
                    <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }} gap="8px">
                      {group.perms.map((perm) => {
                        const enabled = !!selectedRole.permissions[perm.key];
                        return (
                          <Flex key={perm.key} align="center" justify="space-between" p="10px" bg="app.surfaceAlt" borderRadius="9px" cursor="pointer" onClick={() => togglePerm(perm.key)} _hover={{ bg: 'app.border' }} transition="background .12s ease">
                            <Flex align="center" gap="8px">
                              <Icon as={enabled ? CheckCircleIcon : ShieldCheckIcon} boxSize="14px" color={enabled ? '#1c8a5c' : 'app.faint'} />
                              <Text fontSize="12px" fontWeight={enabled ? '600' : '500'} color={enabled ? 'app.text' : 'app.subtle'}>{perm.label}</Text>
                            </Flex>
                            <Switch isChecked={enabled} onChange={() => togglePerm(perm.key)} colorScheme="orange" size="sm" />
                          </Flex>
                        );
                      })}
                    </Grid>
                  </Box>
                ))}
              </Stack>
            </Box>
          </Card>
        ) : (
          <Card>
            <EmptyState icon={ShieldCheckIcon} title="Select a role" description="Choose a role from the left to view and edit its permissions." />
          </Card>
        )}
      </Grid>

      <FormModal isOpen={roleModal.isOpen} onClose={roleModal.onClose} title={editingId ? 'Edit role' : 'New role'} subtitle={editingId ? 'Update role and permissions' : 'Define a new role with custom permissions'} loading={saving} onSubmit={handleSubmit} submitLabel={editingId ? 'Update' : 'Create'} size="lg">
        <FormControl>
          <FormLabel fontSize="12px">Role name</FormLabel>
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Sales Manager" size="sm" borderRadius="9px" borderColor="app.border" fontSize="13px" />
        </FormControl>
        <FormControl>
          <FormLabel fontSize="12px">Description</FormLabel>
          <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Can manage leads and deals but not invoices..." size="sm" borderRadius="9px" borderColor="app.border" fontSize="13px" rows={2} />
        </FormControl>
        <Box>
          <Text fontSize="12px" fontWeight="700" mb="10px">Permissions</Text>
          <Stack spacing="14px" maxH="320px" overflowY="auto" pr="4px">
            {PERMISSION_GROUPS.map((group) => (
              <Box key={group.group}>
                <Text fontSize="10px" fontWeight="700" color="app.faint" letterSpacing="0.08em" mb="8px">{group.group.toUpperCase()}</Text>
                <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }} gap="7px">
                  {group.perms.map((perm) => (
                    <Flex key={perm.key} align="center" justify="space-between" p="8px" bg="app.surfaceAlt" borderRadius="8px" cursor="pointer" onClick={() => toggleDraftPerm(perm.key)}>
                      <Text fontSize="12px" color={permDraft[perm.key] ? 'app.text' : 'app.subtle'} fontWeight={permDraft[perm.key] ? '600' : '500'}>{perm.label}</Text>
                      <Switch isChecked={!!permDraft[perm.key]} onChange={() => toggleDraftPerm(perm.key)} colorScheme="orange" size="sm" />
                    </Flex>
                  ))}
                </Grid>
              </Box>
            ))}
          </Stack>
        </Box>
      </FormModal>

      <ConfirmDialog isOpen={confirmDel.isOpen} onClose={confirmDel.onClose} title="Delete role" message="Are you sure you want to delete this role? Users assigned to it will need a new role." confirmLabel="Delete" danger onConfirm={handleDelete} />
    </>
  );
}
