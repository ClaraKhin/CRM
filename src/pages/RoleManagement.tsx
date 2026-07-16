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
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Select,
  Spinner,
  Stack,
  Switch,
  Text,
  Textarea,
  useDisclosure,
  useToast } from '@chakra-ui/react';
import {
  CheckIcon,
  EyeIcon,
  FileEditIcon,
  FilePlus2Icon,
  Trash2Icon,
  PlusIcon,
  ShieldCheckIcon } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Card, CardHeader } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
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

type CrudAction = 'view' | 'create' | 'edit' | 'delete';

type ResourceDef = {
  key: string;
  label: string;
  icon: typeof EyeIcon;
  color: string;
  actions: CrudAction[];
};

const RESOURCES: ResourceDef[] = [
  { key: 'leads', label: 'Leads', icon: EyeIcon, color: '#3355c9', actions: ['view', 'create', 'edit', 'delete'] },
  { key: 'deals', label: 'Deals & Pipeline', icon: EyeIcon, color: '#8374d9', actions: ['view', 'create', 'edit', 'delete'] },
  { key: 'customers', label: 'Customers', icon: EyeIcon, color: '#2d9c79', actions: ['view', 'create', 'edit', 'delete'] },
  { key: 'invoices', label: 'Invoices', icon: EyeIcon, color: '#b5760f', actions: ['view', 'create', 'edit', 'delete'] },
  { key: 'quotes', label: 'Quotes', icon: EyeIcon, color: '#e9683f', actions: ['view', 'create', 'edit', 'delete'] },
  { key: 'tasks', label: 'Tasks', icon: EyeIcon, color: '#d85a9a', actions: ['view', 'create', 'edit', 'delete'] },
  { key: 'documents', label: 'Documents', icon: EyeIcon, color: '#6b7488', actions: ['view', 'create', 'edit', 'delete'] },
];

const MISC_PERMS: { key: string; label: string; description: string }[] = [
  { key: 'merge_leads', label: 'Merge duplicates', description: 'Merge duplicate leads' },
  { key: 'generate_quotes', label: 'Generate quotes', description: 'Generate quotes from deals' },
  { key: 'manage_users', label: 'Manage users', description: 'Create, edit, and delete users' },
  { key: 'manage_roles', label: 'Manage roles', description: 'Create, edit, and delete roles' },
  { key: 'export_data', label: 'Export data', description: 'Export CRM data to CSV' },
  { key: 'view_audit_logs', label: 'View audit logs', description: 'View system audit logs' },
  { key: 'manage_settings', label: 'Manage settings', description: 'Manage system settings' },
];

const ACTION_META: Record<CrudAction, { label: string; icon: typeof EyeIcon; color: string }> = {
  view: { label: 'View', icon: EyeIcon, color: '#3355c9' },
  create: { label: 'Create', icon: FilePlus2Icon, color: '#1c8a5c' },
  edit: { label: 'Edit', icon: FileEditIcon, color: '#e9683f' },
  delete: { label: 'Delete', icon: Trash2Icon, color: '#c23c3c' },
};

const ALL_PERM_KEYS = [
  ...RESOURCES.flatMap((r) => r.actions.map((a) => `${a}_${r.key}`)),
  ...MISC_PERMS.map((p) => p.key),
];

function permKey(resource: string, action: CrudAction) { return `${action}_${resource}`; }

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

  const countPerms = (perms: Record<string, boolean>) => Object.entries(perms).filter(([, v]) => v).length;

  const togglePerm = async (key: string) => {
    if (!selectedRole || !session?.user) return;
    const newVal = !selectedRole.permissions[key];
    const newPerms = { ...selectedRole.permissions, [key]: newVal };
    setRoles((prev) => prev.map((r) => r.id === selectedRole.id ? { ...r, permissions: newPerms } : r));
    const { error } = await supabase.from('roles').update({ permissions: newPerms }).eq('id', selectedRole.id);
    if (error) {
      toast({ title: 'Failed to update permission', description: error.message, status: 'error', duration: 3000, position: 'top-right' });
      setRoles((prev) => prev.map((r) => r.id === selectedRole.id ? { ...r, permissions: selectedRole.permissions } : r));
      return;
    }
    toast({ title: newVal ? 'Permission granted' : 'Permission revoked', status: 'success', duration: 1200, position: 'top-right' });
  };

  const toggleResourceAll = async (resource: ResourceDef, enable: boolean) => {
    if (!selectedRole || !session?.user) return;
    const updates: Record<string, boolean> = {};
    resource.actions.forEach((a) => { updates[permKey(resource.key, a)] = enable; });
    const newPerms = { ...selectedRole.permissions, ...updates };
    setRoles((prev) => prev.map((r) => r.id === selectedRole.id ? { ...r, permissions: newPerms } : r));
    const { error } = await supabase.from('roles').update({ permissions: newPerms }).eq('id', selectedRole.id);
    if (error) {
      toast({ title: 'Failed to update permissions', description: error.message, status: 'error', duration: 3000, position: 'top-right' });
      setRoles((prev) => prev.map((r) => r.id === selectedRole.id ? { ...r, permissions: selectedRole.permissions } : r));
      return;
    }
    toast({ title: enable ? `${resource.label} — full access` : `${resource.label} — access revoked`, status: 'success', duration: 1200, position: 'top-right' });
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

  const toggleDraftResourceAll = (resource: ResourceDef, enable: boolean) => {
    setPermDraft((prev) => {
      const next = { ...prev };
      resource.actions.forEach((a) => { next[permKey(resource.key, a)] = enable; });
      return next;
    });
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) { toast({ title: 'Role name is required', status: 'error', duration: 2000, position: 'top-right' }); return; }
    setSaving(true);
    if (editingId) {
      const { error } = await supabase.from('roles').update({ name: form.name, description: form.description, permissions: permDraft }).eq('id', editingId);
      if (error) { toast({ title: 'Update failed', description: error.message, status: 'error', duration: 3000, position: 'top-right' }); setSaving(false); return; }
      toast({ title: 'Role updated', status: 'success', duration: 2000, position: 'top-right' });
    } else {
      const { error } = await supabase.from('roles').insert({ name: form.name, description: form.description, permissions: permDraft });
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

  const isResourceFullyEnabled = (resource: ResourceDef, perms: Record<string, boolean>) =>
    resource.actions.every((a) => perms[permKey(resource.key, a)]);

  return (
    <>
      <PageHeader
        title="Role Management"
        subtitle="Define roles and assign granular permissions per resource."
        actions={<Button size="sm" borderRadius="9px" bg="navy.600" color="white" _hover={{ bg: 'navy.500' }} leftIcon={<PlusIcon size={15} />} fontSize="12px" onClick={openCreate}>New role</Button>} />

      <Grid templateColumns={{ base: '1fr', lg: '280px 1fr' }} gap="18px">
        {/* Role list */}
        <Stack spacing="10px">
          {loading ? (
            <Flex py="40px" justify="center"><Spinner color="brand.500" /></Flex>
          ) : roles.length === 0 ? (
            <Card><EmptyState icon={ShieldCheckIcon} title="No roles yet" description="Create a role to manage permissions." action={<Button size="sm" bg="navy.600" color="white" borderRadius="9px" fontSize="12px" leftIcon={<PlusIcon size={15} />} onClick={openCreate}>New role</Button>} /></Card>
          ) : roles.map((role) => {
            const count = countPerms(role.permissions);
            const isActive = role.id === selectedRoleId;
            return (
              <Card key={role.id} p="14px" cursor="pointer" borderColor={isActive ? 'brand.500' : 'app.border'} borderWidth={isActive ? '2px' : '1px'} _hover={{ borderColor: 'app.subtle' }} onClick={() => setSelectedRoleId(role.id)} transition="border-color .15s ease">
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
                  <Badge fontSize="10px" bg="brand.50" color="brand.600" borderRadius="full" px="8px">{countPerms(selectedRole.permissions)} active</Badge>
                  <Button size="xs" variant="outline" borderColor="app.border" fontSize="11px" onClick={() => openEdit(selectedRole)}>Edit</Button>
                  <Button size="xs" variant="ghost" color="#c23c3c" onClick={() => { setDeleteId(selectedRole.id); confirmDel.onOpen(); }}><Trash2Icon size={13} /></Button>
                </HStack>
              }
            />
            <Box px="20px" py="16px">
              {/* CRUD permission matrix */}
              <Box mb="20px" overflowX="auto">
                <Box minW="480px">
                  {/* Header row */}
                  <Grid templateColumns="180px repeat(4, 1fr) 36px" gap="0" borderBottom="2px solid" borderColor="app.border" pb="8px" mb="4px">
                    <Text fontSize="10px" fontWeight="700" color="app.faint" letterSpacing="0.06em">RESOURCE</Text>
                    {(['view', 'create', 'edit', 'delete'] as CrudAction[]).map((a) => (
                      <Text key={a} fontSize="10px" fontWeight="700" color="app.faint" letterSpacing="0.06em" textAlign="center">{ACTION_META[a].label.toUpperCase()}</Text>
                    ))}
                    <Text fontSize="10px" fontWeight="700" color="app.faint" letterSpacing="0.06em" textAlign="center">ALL</Text>
                  </Grid>
                  {/* Resource rows */}
                  <Stack spacing="0">
                    {RESOURCES.map((resource, idx) => {
                      const allOn = isResourceFullyEnabled(resource, selectedRole.permissions);
                      return (
                        <Flex
                          key={resource.key}
                          align="center"
                          minH="48px"
                          py="10px"
                          borderBottom={idx < RESOURCES.length - 1 ? '1px solid' : 'none'}
                          borderColor="app.border"
                          _hover={{ bg: 'app.surfaceAlt' }}
                          transition="background .12s ease">
                          <Box w="180px" pr="10px" flexShrink={0}>
                            <Flex align="center" gap="8px">
                              <Box w="8px" h="8px" borderRadius="full" bg={resource.color} flexShrink={0} />
                              <Text fontSize="12px" fontWeight="600" color="app.text">{resource.label}</Text>
                            </Flex>
                          </Box>
                          {(['view', 'create', 'edit', 'delete'] as CrudAction[]).map((action) => {
                            const key = permKey(resource.key, action);
                            const enabled = !!selectedRole.permissions[key];
                            const meta = ACTION_META[action];
                            return (
                              <Flex key={action} justify="center" align="center">
                                <Box
                                  as="button"
                                  w="28px" h="28px" borderRadius="8px"
                                  bg={enabled ? `${meta.color}1a` : 'transparent'}
                                  border="1px solid"
                                  borderColor={enabled ? meta.color : 'app.border'}
                                  display="flex" alignItems="center" justifyContent="center"
                                  cursor="pointer"
                                  _hover={{ bg: enabled ? `${meta.color}2a` : 'app.surfaceAlt', transform: 'scale(1.08)' }}
                                  transition="all .15s ease"
                                  onClick={(e) => { e.stopPropagation(); togglePerm(key); }}>
                                  {enabled && <CheckIcon size={14} color={meta.color} strokeWidth={3} />}
                                </Box>
                              </Flex>
                            );
                          })}
                          {/* Toggle all */}
                          <Flex justify="center" align="center">
                            <Switch
                              size="sm"
                              colorScheme="brand"
                              isChecked={allOn}
                              onChange={() => toggleResourceAll(resource, !allOn)}
                            />
                          </Flex>
                        </Flex>
                      );
                    })}
                  </Stack>
                </Box>
              </Box>

              {/* Miscellaneous permissions */}
              <Box>
                <Text fontSize="11px" fontWeight="700" color="app.faint" letterSpacing="0.08em" mb="12px">ADDITIONAL PERMISSIONS</Text>
                <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }} gap="8px">
                  {MISC_PERMS.map((perm) => {
                    const enabled = !!selectedRole.permissions[perm.key];
                    return (
                      <Flex
                        key={perm.key}
                        align="center"
                        justify="space-between"
                        p="12px"
                        bg={enabled ? 'brand.50' : 'app.surfaceAlt'}
                        borderRadius="10px"
                        cursor="pointer"
                        onClick={() => togglePerm(perm.key)}
                        _hover={{ bg: enabled ? 'brand.100' : 'app.border' }}
                        transition="background .15s ease"
                        border="1px solid"
                        borderColor={enabled ? 'brand.200' : 'transparent'}>
                        <Box>
                          <Text fontSize="12px" fontWeight={enabled ? '700' : '600'} color={enabled ? 'brand.700' : 'app.text'}>{perm.label}</Text>
                          <Text fontSize="10px" color="app.faint">{perm.description}</Text>
                        </Box>
                        <Switch isChecked={enabled} onChange={() => togglePerm(perm.key)} colorScheme="brand" size="sm" onClick={(e) => e.stopPropagation()} />
                      </Flex>
                    );
                  })}
                </Grid>
              </Box>
            </Box>
          </Card>
        ) : (
          <Card>
            <EmptyState icon={ShieldCheckIcon} title="Select a role" description="Choose a role from the left to view and edit its permissions." />
          </Card>
        )}
      </Grid>

      {/* Create / Edit Role Modal */}
      <Modal isOpen={roleModal.isOpen} onClose={roleModal.onClose} size="xl" isCentered>
        <ModalOverlay backdropFilter="blur(4px)" />
        <ModalContent bg="app.surface" borderRadius="16px" maxH="90vh" overflow="hidden" display="flex" flexDir="column">
          <ModalHeader borderBottom="1px solid" borderColor="app.border" pb="14px">
            <Flex align="center" gap="10px">
              <Flex w="34px" h="34px" borderRadius="10px" bg="brand.50" align="center" justify="center">
                <ShieldCheckIcon size={16} color="brand.600" />
              </Flex>
              <Box>
                <Text fontSize="15px" fontWeight="800">{editingId ? 'Edit role' : 'New role'}</Text>
                <Text fontSize="11px" color="app.subtle">{editingId ? 'Update role details and permissions' : 'Define a new role with custom permissions'}</Text>
              </Box>
            </Flex>
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody py="18px" overflowY="auto">
            <Stack spacing="16px">
              <Grid templateColumns={{ base: '1fr', md: '1fr 1fr' }} gap="14px">
                <FormControl>
                  <FormLabel fontSize="11px" color="app.subtle" mb="6px">Role name</FormLabel>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Sales Manager" borderRadius="9px" borderColor="app.border" fontSize="13px" />
                </FormControl>
                <FormControl>
                  <FormLabel fontSize="11px" color="app.subtle" mb="6px">Description</FormLabel>
                  <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Brief description" borderRadius="9px" borderColor="app.border" fontSize="13px" />
                </FormControl>
              </Grid>

              {/* Permission matrix in modal */}
              <Box>
                <Text fontSize="12px" fontWeight="700" mb="10px">Permissions</Text>
                <Box overflowX="auto">
                  <Box minW="460px">
                    <Grid templateColumns="160px repeat(4, 1fr) 36px" gap="0" borderBottom="2px solid" borderColor="app.border" pb="8px" mb="4px">
                      <Text fontSize="10px" fontWeight="700" color="app.faint" letterSpacing="0.06em">RESOURCE</Text>
                      {(['view', 'create', 'edit', 'delete'] as CrudAction[]).map((a) => (
                        <Text key={a} fontSize="10px" fontWeight="700" color="app.faint" letterSpacing="0.06em" textAlign="center">{ACTION_META[a].label.toUpperCase()}</Text>
                      ))}
                      <Text fontSize="10px" fontWeight="700" color="app.faint" letterSpacing="0.06em" textAlign="center">ALL</Text>
                    </Grid>
                    <Stack spacing="0">
                      {RESOURCES.map((resource, idx) => {
                        const allOn = resource.actions.every((a) => permDraft[permKey(resource.key, a)]);
                        return (
                          <Flex key={resource.key} align="center" minH="44px" py="8px" borderBottom={idx < RESOURCES.length - 1 ? '1px solid' : 'none'} borderColor="app.border" _hover={{ bg: 'app.surfaceAlt' }} transition="background .12s ease">
                            <Box w="160px" pr="10px" flexShrink={0}>
                              <Flex align="center" gap="8px">
                                <Box w="8px" h="8px" borderRadius="full" bg={resource.color} flexShrink={0} />
                                <Text fontSize="12px" fontWeight="600" color="app.text">{resource.label}</Text>
                              </Flex>
                            </Box>
                            {(['view', 'create', 'edit', 'delete'] as CrudAction[]).map((action) => {
                              const key = permKey(resource.key, action);
                              const enabled = !!permDraft[key];
                              const meta = ACTION_META[action];
                              return (
                                <Flex key={action} justify="center" align="center">
                                  <Box
                                    as="button"
                                    w="26px" h="26px" borderRadius="7px"
                                    bg={enabled ? `${meta.color}1a` : 'transparent'}
                                    border="1px solid"
                                    borderColor={enabled ? meta.color : 'app.border'}
                                    display="flex" alignItems="center" justifyContent="center"
                                    cursor="pointer"
                                    _hover={{ bg: enabled ? `${meta.color}2a` : 'app.surfaceAlt', transform: 'scale(1.08)' }}
                                    transition="all .15s ease"
                                    onClick={() => toggleDraftPerm(key)}>
                                    {enabled && <CheckIcon size={13} color={meta.color} strokeWidth={3} />}
                                  </Box>
                                </Flex>
                              );
                            })}
                            <Flex justify="center" align="center">
                              <Switch size="sm" colorScheme="brand" isChecked={allOn} onChange={() => toggleDraftResourceAll(resource, !allOn)} />
                            </Flex>
                          </Flex>
                        );
                      })}
                    </Stack>
                  </Box>
                </Box>
              </Box>

              {/* Misc perms in modal */}
              <Box>
                <Text fontSize="11px" fontWeight="700" color="app.faint" letterSpacing="0.08em" mb="10px">ADDITIONAL PERMISSIONS</Text>
                <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }} gap="8px">
                  {MISC_PERMS.map((perm) => {
                    const enabled = !!permDraft[perm.key];
                    return (
                      <Flex key={perm.key} align="center" justify="space-between" p="10px" bg={enabled ? 'brand.50' : 'app.surfaceAlt'} borderRadius="9px" cursor="pointer" onClick={() => toggleDraftPerm(perm.key)} _hover={{ bg: enabled ? 'brand.100' : 'app.border' }} transition="background .15s ease" border="1px solid" borderColor={enabled ? 'brand.200' : 'transparent'}>
                        <Text fontSize="12px" fontWeight={enabled ? '700' : '600'} color={enabled ? 'brand.700' : 'app.text'}>{perm.label}</Text>
                        <Switch isChecked={enabled} onChange={() => toggleDraftPerm(perm.key)} colorScheme="brand" size="sm" onClick={(e) => e.stopPropagation()} />
                      </Flex>
                    );
                  })}
                </Grid>
              </Box>
            </Stack>
          </ModalBody>
          <ModalFooter borderTop="1px solid" borderColor="app.border" pt="14px">
            <Button mr="8px" variant="outline" borderColor="app.border" borderRadius="9px" fontSize="12px" onClick={roleModal.onClose}>Cancel</Button>
            <Button bg="navy.600" color="white" _hover={{ bg: 'navy.500' }} borderRadius="9px" fontSize="12px" fontWeight="600" onClick={handleSubmit} isLoading={saving}>{editingId ? 'Update role' : 'Create role'}</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <ConfirmDialog isOpen={confirmDel.isOpen} onClose={confirmDel.onClose} title="Delete role" message="Are you sure you want to delete this role? Users assigned to it will need a new role." confirmLabel="Delete" danger onConfirm={handleDelete} />
    </>
  );
}
