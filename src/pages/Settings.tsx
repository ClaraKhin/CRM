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
  IconButton,
  Input,
  Select,
  Spinner,
  Stack,
  Switch,
  Tab,
  Table,
  TableContainer,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Tr,
  useDisclosure,
  useToast } from
'@chakra-ui/react';
import {
  CheckIcon,
  CopyIcon,
  DatabaseIcon,
  GlobeIcon,
  KeyIcon,
  LinkIcon,
  PlusIcon,
  RefreshCwIcon,
  ServerIcon,
  SettingsIcon,
  ShieldIcon,
  Trash2Icon,
  UsersIcon,
  ZapIcon } from
'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Card, CardHeader } from '../components/ui/Card';
import { StatusBadge } from '../components/ui/StatusBadge';
import { FormModal } from '../components/ui/FormModal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { supabase, ROLE_LABELS } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

const ROLE_OPTIONS = Object.entries(ROLE_LABELS).map(([value, label]) => ({ value, label }));
const ENTITY_TYPES = ['lead', 'customer', 'deal', 'product', 'quote', 'invoice', 'task'];
const FIELD_TYPES = ['text', 'number', 'date', 'select', 'textarea', 'checkbox'];
const SCORE_FIELDS = ['source', 'status', 'value'];
const SCORE_OPERATORS = ['equals', 'contains', 'greater_than', 'less_than'];
const CURRENCIES = ['USD', 'MMK', 'SGD', 'EUR', 'GBP', 'JPY', 'THB', 'CNY'];

type SyncConnection = { id: string; name: string; provider: string; endpoint_url: string; auth_type: string; status: string; last_synced_at: string | null; config: any; created_at: string };
type SyncLog = { id: string; connection_id: string; status: string; records_synced: number; error_message: string; created_at: string };
type CustomField = { id: string; entity_type: string; field_name: string; field_label: string; field_type: string; field_options: string | null; is_required: boolean; position: number };
type ScoreRule = { id: string; name: string; condition_field: string; condition_operator: string; condition_value: string; points: number; enabled: boolean };
type AppSetting = { id: string; key: string; value: string };
type RoleDef = { id: string; name: string; description: string; permissions: Record<string, boolean>; is_system: boolean };

const PROVIDERS = ['Google', 'Outlook', 'Slack', 'HubSpot', 'Salesforce', 'Zapier', 'Custom API', 'Webhook'];
const AUTH_TYPES = ['api_key', 'oauth2', 'bearer', 'basic', 'none'];

const PERMISSION_KEYS = ['view_leads', 'edit_leads', 'delete_leads', 'view_deals', 'edit_deals', 'delete_deals', 'view_invoices', 'edit_invoices', 'delete_invoices', 'export_data', 'manage_users'];

export function Settings() {
  const toast = useToast();
  const { session, profile, refreshProfile } = useAuth();
  const [mcpServers, setMcpServers] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ full_name: profile?.full_name ?? '', email: profile?.email ?? '' });
  const [syncConnections, setSyncConnections] = useState<SyncConnection[]>([]);
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);
  const [loadingSync, setLoadingSync] = useState(true);

  const syncDrawer = useDisclosure();
  const [syncForm, setSyncForm] = useState({ name: '', provider: 'Google', endpoint_url: '', auth_type: 'api_key', api_key: '' });
  const [savingSync, setSavingSync] = useState(false);
  const [editingSyncId, setEditingSyncId] = useState<string | null>(null);
  const confirmSyncDel = useDisclosure();
  const [deleteSyncId, setDeleteSyncId] = useState<string | null>(null);
  const [syncing, setSyncing] = useState<string | null>(null);

  // User Management
  const [users, setUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const userModal = useDisclosure();
  const [userForm, setUserForm] = useState({ email: '', full_name: '', role: 'sales_executive', avatar_color: '#ffdccb' });
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [savingUser, setSavingUser] = useState(false);
  const confirmUserDel = useDisclosure();
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);

  // Custom Fields
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [loadingFields, setLoadingFields] = useState(true);
  const fieldModal = useDisclosure();
  const [fieldForm, setFieldForm] = useState({ entity_type: 'lead', field_name: '', field_label: '', field_type: 'text', field_options: '', is_required: false });
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [savingField, setSavingField] = useState(false);
  const confirmFieldDel = useDisclosure();
  const [deleteFieldId, setDeleteFieldId] = useState<string | null>(null);

  // Lead Scoring Rules
  const [scoreRules, setScoreRules] = useState<ScoreRule[]>([]);
  const [loadingRules, setLoadingRules] = useState(true);
  const ruleModal = useDisclosure();
  const [ruleForm, setRuleForm] = useState({ name: '', condition_field: 'source', condition_operator: 'equals', condition_value: '', points: 10 });
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [savingRule, setSavingRule] = useState(false);
  const confirmRuleDel = useDisclosure();
  const [deleteRuleId, setDeleteRuleId] = useState<string | null>(null);

  // Localization & Tax
  const [settings, setSettings] = useState<AppSetting[]>([]);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [locForm, setLocForm] = useState({ currency: 'USD', tax_rate: '0', exchange_rate: '1' });

  // Roles
  const [roles, setRoles] = useState<RoleDef[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(true);
  const roleModal = useDisclosure();
  const [roleForm, setRoleForm] = useState({ name: '', description: '', permissions: {} as Record<string, boolean> });
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [savingRole, setSavingRole] = useState(false);
  const confirmRoleDel = useDisclosure();
  const [deleteRoleId, setDeleteRoleId] = useState<string | null>(null);

  useEffect(() => { setProfileForm({ full_name: profile?.full_name ?? '', email: profile?.email ?? '' }); }, [profile]);

  const loadMcp = useCallback(async () => {
    if (!session?.user) return;
    const { data } = await supabase.from('mcp_servers').select('*').eq('user_id', session.user.id);
    setMcpServers(data ?? []);
  }, [session]);

  const loadLogs = useCallback(async () => {
    if (!session?.user) return;
    setLoadingLogs(true);
    const { data } = await supabase.from('audit_logs').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false }).limit(30);
    setAuditLogs(data ?? []);
    setLoadingLogs(false);
  }, [session]);

  const loadSync = useCallback(async () => {
    if (!session?.user) return;
    setLoadingSync(true);
    const [cRes, lRes] = await Promise.all([
      supabase.from('api_sync_connections').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false }),
      supabase.from('api_sync_logs').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false }).limit(10)
    ]);
    setSyncConnections((cRes.data ?? []) as SyncConnection[]);
    setSyncLogs((lRes.data ?? []) as SyncLog[]);
    setLoadingSync(false);
  }, [session]);

  const loadUsers = useCallback(async () => {
    if (!session?.user) return;
    setLoadingUsers(true);
    const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    setUsers(data ?? []);
    setLoadingUsers(false);
  }, [session]);

  const loadCustomFields = useCallback(async () => {
    if (!session?.user) return;
    setLoadingFields(true);
    const { data } = await supabase.from('custom_fields').select('*').eq('user_id', session.user.id).order('position', { ascending: true });
    setCustomFields((data ?? []) as CustomField[]);
    setLoadingFields(false);
  }, [session]);

  const loadScoreRules = useCallback(async () => {
    if (!session?.user) return;
    setLoadingRules(true);
    const { data } = await supabase.from('lead_score_rules').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false });
    setScoreRules((data ?? []) as ScoreRule[]);
    setLoadingRules(false);
  }, [session]);

  const loadSettings = useCallback(async () => {
    if (!session?.user) return;
    setLoadingSettings(true);
    const { data } = await supabase.from('app_settings').select('*').eq('user_id', session.user.id);
    const settingRows = (data ?? []) as AppSetting[];
    setSettings(settingRows);
    const get = (key: string) => settingRows.find((s) => s.key === key)?.value ?? '';
    setLocForm({ currency: get('currency') || 'USD', tax_rate: get('tax_rate') || '0', exchange_rate: get('exchange_rate') || '1' });
    setLoadingSettings(false);
  }, [session]);

  const loadRoles = useCallback(async () => {
    if (!session?.user) return;
    setLoadingRoles(true);
    const { data } = await supabase.from('roles').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false });
    setRoles((data ?? []) as RoleDef[]);
    setLoadingRoles(false);
  }, [session]);

  useEffect(() => { loadMcp(); loadLogs(); loadSync(); loadUsers(); loadCustomFields(); loadScoreRules(); loadSettings(); loadRoles(); }, [loadMcp, loadLogs, loadSync, loadUsers, loadCustomFields, loadScoreRules, loadSettings, loadRoles]);

  const toggleServer = async (id: string) => {
    const server = mcpServers.find((s) => s.id === id);
    if (!server) return;
    setMcpServers((prev) => prev.map((s) => s.id === id ? { ...s, connected: !s.connected } : s));
    await supabase.from('mcp_servers').update({ connected: !server.connected }).eq('id', id).eq('user_id', session!.user.id);
    toast({ title: `${server.name} ${server.connected ? 'disconnected' : 'connected'}`, status: 'info', duration: 1600, position: 'top-right' });
  };

  const saveProfile = async () => {
    setSavingProfile(true);
    const { error } = await supabase.from('profiles').update({ full_name: profileForm.full_name }).eq('id', session!.user.id);
    if (error) { toast({ title: 'Save failed', description: error.message, status: 'error', duration: 3000, position: 'top-right' }); }
    else { await refreshProfile(); toast({ title: 'Profile saved', status: 'success', duration: 1800, position: 'top-right' }); }
    setSavingProfile(false);
  };

  // Sync CRUD
  const openCreateSync = () => { setEditingSyncId(null); setSyncForm({ name: '', provider: 'Google', endpoint_url: '', auth_type: 'api_key', api_key: '' }); syncDrawer.onOpen(); };
  const openEditSync = (conn: SyncConnection) => { setEditingSyncId(conn.id); setSyncForm({ name: conn.name, provider: conn.provider, endpoint_url: conn.endpoint_url, auth_type: conn.auth_type, api_key: conn.config?.api_key ?? '' }); syncDrawer.onOpen(); };
  const handleSaveSync = async () => {
    if (!syncForm.name.trim()) { toast({ title: 'Name is required', status: 'error', duration: 2000, position: 'top-right' }); return; }
    setSavingSync(true);
    const config = { api_key: syncForm.api_key, auth_type: syncForm.auth_type };
    if (editingSyncId) {
      await supabase.from('api_sync_connections').update({ name: syncForm.name, provider: syncForm.provider, endpoint_url: syncForm.endpoint_url, auth_type: syncForm.auth_type, config }).eq('id', editingSyncId).eq('user_id', session!.user.id);
      toast({ title: 'Sync connection updated', status: 'success', duration: 2000, position: 'top-right' });
    } else {
      await supabase.from('api_sync_connections').insert({ user_id: session!.user.id, name: syncForm.name, provider: syncForm.provider, endpoint_url: syncForm.endpoint_url, auth_type: syncForm.auth_type, status: 'inactive', config });
      toast({ title: 'Sync connection created', status: 'success', duration: 2000, position: 'top-right' });
    }
    setSavingSync(false); syncDrawer.onClose(); loadSync();
  };
  const handleDeleteSync = async () => { if (!deleteSyncId) return; await supabase.from('api_sync_connections').delete().eq('id', deleteSyncId).eq('user_id', session!.user.id); toast({ title: 'Connection deleted', status: 'success', duration: 1800, position: 'top-right' }); confirmSyncDel.onClose(); setDeleteSyncId(null); loadSync(); };
  const toggleSync = async (conn: SyncConnection) => { const ns = conn.status === 'active' ? 'inactive' : 'active'; await supabase.from('api_sync_connections').update({ status: ns }).eq('id', conn.id).eq('user_id', session!.user.id); toast({ title: `${conn.name} ${ns === 'active' ? 'activated' : 'deactivated'}`, status: 'info', duration: 1600, position: 'top-right' }); loadSync(); };
  const runSync = async (conn: SyncConnection) => {
    setSyncing(conn.id);
    await supabase.from('api_sync_connections').update({ status: 'syncing' }).eq('id', conn.id).eq('user_id', session!.user.id);
    setTimeout(async () => {
      const records = Math.floor(Math.random() * 50) + 5;
      await supabase.from('api_sync_connections').update({ status: 'active', last_synced_at: new Date().toISOString() }).eq('id', conn.id).eq('user_id', session!.user.id);
      await supabase.from('api_sync_logs').insert({ user_id: session!.user.id, connection_id: conn.id, status: 'success', records_synced: records });
      toast({ title: `${conn.name} synced ${records} records`, status: 'success', duration: 2000, position: 'top-right' });
      setSyncing(null); loadSync();
    }, 1500);
  };

  // User CRUD
  const openCreateUser = () => { setEditingUserId(null); setUserForm({ email: '', full_name: '', role: 'sales_executive', avatar_color: '#ffdccb' }); userModal.onOpen(); };
  const openEditUser = (u: any) => { setEditingUserId(u.id); setUserForm({ email: u.email, full_name: u.full_name, role: u.role, avatar_color: u.avatar_color ?? '#ffdccb' }); userModal.onOpen(); };
  const handleSaveUser = async () => {
    if (!userForm.email.trim() || !userForm.full_name.trim()) { toast({ title: 'Email and name are required', status: 'error', duration: 2000, position: 'top-right' }); return; }
    setSavingUser(true);
    if (editingUserId) {
      const { error } = await supabase.from('profiles').update({ full_name: userForm.full_name, role: userForm.role, avatar_color: userForm.avatar_color }).eq('id', editingUserId);
      if (error) toast({ title: 'Update failed', description: error.message, status: 'error', duration: 3000, position: 'top-right' });
      else toast({ title: 'User updated', status: 'success', duration: 2000, position: 'top-right' });
    } else {
      const { error } = await supabase.from('profiles').insert({ id: session!.user.id, email: userForm.email, full_name: userForm.full_name, role: userForm.role, avatar_color: userForm.avatar_color });
      if (error) toast({ title: 'Create failed', description: error.message, status: 'error', duration: 3000, position: 'top-right' });
      else toast({ title: 'User created', status: 'success', duration: 2000, position: 'top-right' });
    }
    setSavingUser(false); userModal.onClose(); loadUsers();
  };
  const handleDeleteUser = async () => { if (!deleteUserId) return; await supabase.from('profiles').delete().eq('id', deleteUserId); toast({ title: 'User deleted', status: 'success', duration: 1800, position: 'top-right' }); confirmUserDel.onClose(); setDeleteUserId(null); loadUsers(); };

  // Custom Field CRUD
  const openCreateField = () => { setEditingFieldId(null); setFieldForm({ entity_type: 'lead', field_name: '', field_label: '', field_type: 'text', field_options: '', is_required: false }); fieldModal.onOpen(); };
  const openEditField = (f: CustomField) => { setEditingFieldId(f.id); setFieldForm({ entity_type: f.entity_type, field_name: f.field_name, field_label: f.field_label, field_type: f.field_type, field_options: f.field_options ?? '', is_required: f.is_required }); fieldModal.onOpen(); };
  const handleSaveField = async () => {
    if (!fieldForm.field_name.trim() || !fieldForm.field_label.trim()) { toast({ title: 'Field name and label are required', status: 'error', duration: 2000, position: 'top-right' }); return; }
    setSavingField(true);
    const payload = { entity_type: fieldForm.entity_type, field_name: fieldForm.field_name.replace(/\s+/g, '_').toLowerCase(), field_label: fieldForm.field_label, field_type: fieldForm.field_type, field_options: fieldForm.field_type === 'select' ? fieldForm.field_options : null, is_required: fieldForm.is_required };
    if (editingFieldId) {
      await supabase.from('custom_fields').update(payload).eq('id', editingFieldId).eq('user_id', session!.user.id);
      toast({ title: 'Field updated', status: 'success', duration: 2000, position: 'top-right' });
    } else {
      await supabase.from('custom_fields').insert({ user_id: session!.user.id, ...payload, position: customFields.length });
      toast({ title: 'Field created', status: 'success', duration: 2000, position: 'top-right' });
    }
    setSavingField(false); fieldModal.onClose(); loadCustomFields();
  };
  const handleDeleteField = async () => { if (!deleteFieldId) return; await supabase.from('custom_fields').delete().eq('id', deleteFieldId).eq('user_id', session!.user.id); toast({ title: 'Field deleted', status: 'success', duration: 1800, position: 'top-right' }); confirmFieldDel.onClose(); setDeleteFieldId(null); loadCustomFields(); };

  // Score Rule CRUD
  const openCreateRule = () => { setEditingRuleId(null); setRuleForm({ name: '', condition_field: 'source', condition_operator: 'equals', condition_value: '', points: 10 }); ruleModal.onOpen(); };
  const openEditRule = (r: ScoreRule) => { setEditingRuleId(r.id); setRuleForm({ name: r.name, condition_field: r.condition_field, condition_operator: r.condition_operator, condition_value: r.condition_value, points: r.points }); ruleModal.onOpen(); };
  const handleSaveRule = async () => {
    if (!ruleForm.name.trim()) { toast({ title: 'Rule name is required', status: 'error', duration: 2000, position: 'top-right' }); return; }
    setSavingRule(true);
    if (editingRuleId) {
      await supabase.from('lead_score_rules').update(ruleForm).eq('id', editingRuleId).eq('user_id', session!.user.id);
      toast({ title: 'Rule updated', status: 'success', duration: 2000, position: 'top-right' });
    } else {
      await supabase.from('lead_score_rules').insert({ user_id: session!.user.id, ...ruleForm, enabled: true });
      toast({ title: 'Rule created', status: 'success', duration: 2000, position: 'top-right' });
    }
    setSavingRule(false); ruleModal.onClose(); loadScoreRules();
  };
  const handleDeleteRule = async () => { if (!deleteRuleId) return; await supabase.from('lead_score_rules').delete().eq('id', deleteRuleId).eq('user_id', session!.user.id); toast({ title: 'Rule deleted', status: 'success', duration: 1800, position: 'top-right' }); confirmRuleDel.onClose(); setDeleteRuleId(null); loadScoreRules(); };
  const toggleRule = async (r: ScoreRule) => { await supabase.from('lead_score_rules').update({ enabled: !r.enabled }).eq('id', r.id).eq('user_id', session!.user.id); loadScoreRules(); };

  // Localization save
  const handleSaveSettings = async () => {
    setSavingSettings(true);
    const upsert = async (key: string, value: string) => {
      const existing = settings.find((s) => s.key === key);
      if (existing) await supabase.from('app_settings').update({ value, updated_at: new Date().toISOString() }).eq('id', existing.id);
      else await supabase.from('app_settings').insert({ user_id: session!.user.id, key, value });
    };
    await Promise.all([upsert('currency', locForm.currency), upsert('tax_rate', locForm.tax_rate), upsert('exchange_rate', locForm.exchange_rate)]);
    toast({ title: 'Settings saved', status: 'success', duration: 2000, position: 'top-right' });
    setSavingSettings(false); loadSettings();
  };

  // Role CRUD
  const openCreateRole = () => { setEditingRoleId(null); setRoleForm({ name: '', description: '', permissions: {} }); roleModal.onOpen(); };
  const openEditRole = (r: RoleDef) => { setEditingRoleId(r.id); setRoleForm({ name: r.name, description: r.description ?? '', permissions: r.permissions ?? {} }); roleModal.onOpen(); };
  const handleSaveRole = async () => {
    if (!roleForm.name.trim()) { toast({ title: 'Role name is required', status: 'error', duration: 2000, position: 'top-right' }); return; }
    setSavingRole(true);
    if (editingRoleId) {
      await supabase.from('roles').update({ name: roleForm.name, description: roleForm.description, permissions: roleForm.permissions }).eq('id', editingRoleId).eq('user_id', session!.user.id);
      toast({ title: 'Role updated', status: 'success', duration: 2000, position: 'top-right' });
    } else {
      await supabase.from('roles').insert({ user_id: session!.user.id, name: roleForm.name, description: roleForm.description, permissions: roleForm.permissions, is_system: false });
      toast({ title: 'Role created', status: 'success', duration: 2000, position: 'top-right' });
    }
    setSavingRole(false); roleModal.onClose(); loadRoles();
  };
  const handleDeleteRole = async () => { if (!deleteRoleId) return; await supabase.from('roles').delete().eq('id', deleteRoleId).eq('user_id', session!.user.id); toast({ title: 'Role deleted', status: 'success', duration: 1800, position: 'top-right' }); confirmRoleDel.onClose(); setDeleteRoleId(null); loadRoles(); };
  const togglePerm = (key: string) => setRoleForm((prev) => ({ ...prev, permissions: { ...prev.permissions, [key]: !prev.permissions[key] } }));

  const TABS = ['Profile', 'Users', 'Roles', 'Custom Fields', 'Lead Scoring', 'Localization & Tax', 'Integrations', 'API Sync', 'Notifications', 'API Keys', 'Audit Logs'];

  return (
    <>
      <PageHeader title="Settings" subtitle="Manage your workspace, team, and integrations." />

      <Tabs colorScheme="orange" variant="soft-rounded">
        <TabList overflowX="auto" pb="4px" gap="4px">
          {TABS.map((t) => <Tab key={t} fontSize="12px" fontWeight="600" whiteSpace="nowrap" _selected={{ bg: 'brand.50', color: 'brand.600' }}>{t}</Tab>)}
        </TabList>

        <TabPanels mt="14px">
          {/* Profile */}
          <TabPanel px="0">
            <Grid templateColumns={{ base: '1fr', md: '1fr 320px' }} gap="18px">
              <Card p="22px">
                <Flex align="center" gap="14px" mb="20px">
                  <Avatar size="lg" name={profile?.full_name ?? 'CRM User'} bg={profile?.avatar_color ?? '#ffdccb'} color="#b6451e" />
                  <Box>
                    <Text fontWeight="700" fontSize="15px">{profile?.full_name ?? 'CRM User'}</Text>
                    <Text fontSize="12px" color="app.subtle">{profile ? ROLE_LABELS[profile.role] : 'Sales Executive'}</Text>
                    <Text fontSize="11px" color="app.faint" mt="2px">{profile?.email ?? ''}</Text>
                  </Box>
                </Flex>
                <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }} gap="14px">
                  <FormControl><FormLabel fontSize="12px">Full name</FormLabel><Input value={profileForm.full_name} onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })} size="sm" borderRadius="9px" borderColor="app.border" /></FormControl>
                  <FormControl><FormLabel fontSize="12px">Email</FormLabel><Input value={profileForm.email} isDisabled size="sm" borderRadius="9px" borderColor="app.border" /></FormControl>
                </Grid>
                <Button mt="18px" size="sm" bg="navy.600" color="white" _hover={{ bg: 'navy.500' }} borderRadius="9px" fontSize="12px" isLoading={savingProfile} onClick={saveProfile}>Save changes</Button>
              </Card>
              <Card p="20px">
                <Text fontWeight="700" fontSize="13px" mb="14px">Security</Text>
                <Flex direction="column" gap="12px">
                  <Flex align="center" gap="10px" p="12px" bg="app.surfaceAlt" borderRadius="10px"><Icon as={KeyIcon} boxSize="16px" color="brand.500" /><Box flex="1"><Text fontSize="12px" fontWeight="600">Two-factor auth</Text><Text fontSize="10px" color="app.faint">Protect your account with 2FA</Text></Box><StatusBadge status="Approved" /></Flex>
                  <Flex align="center" gap="10px" p="12px" bg="app.surfaceAlt" borderRadius="10px"><Icon as={ZapIcon} boxSize="16px" color="#2d9c79" /><Box flex="1"><Text fontSize="12px" fontWeight="600">Active sessions</Text><Text fontSize="10px" color="app.faint">1 device · this browser</Text></Box></Flex>
                </Flex>
              </Card>
            </Grid>
          </TabPanel>

          {/* Users */}
          <TabPanel px="0">
            <Card>
              <CardHeader title="User Management" subtitle="Create, edit, and manage user accounts" right={<Button size="sm" bg="navy.600" color="white" _hover={{ bg: 'navy.500' }} borderRadius="9px" fontSize="12px" leftIcon={<PlusIcon size={14} />} onClick={openCreateUser}>Add user</Button>} />
              {loadingUsers ? <Flex py="40px" justify="center"><Spinner color="brand.500" /></Flex> : users.length === 0 ? (
                <Box px="20px" py="40px" textAlign="center"><Icon as={UsersIcon} boxSize="28px" color="app.faint" /><Text mt="10px" fontSize="13px" color="app.subtle">No users found.</Text></Box>
              ) : (
                <TableContainer>
                  <Table size="sm">
                    <Thead><Tr><Th borderColor="app.border" fontSize="10px" color="app.faint">User</Th><Th borderColor="app.border" fontSize="10px" color="app.faint">Role</Th><Th borderColor="app.border" fontSize="10px" color="app.faint">Created</Th><Th borderColor="app.border" w="80px"></Th></Tr></Thead>
                    <Tbody>
                      {users.map((u) => (
                        <Tr key={u.id} _hover={{ bg: 'app.surfaceAlt' }} cursor="pointer" onClick={() => openEditUser(u)}>
                          <Td borderColor="app.border"><Flex align="center" gap="8px"><Avatar size="xs" name={u.full_name} bg={u.avatar_color ?? '#ffdccb'} color="#46506a" /><Box><Text fontSize="12px" fontWeight="700">{u.full_name}</Text><Text fontSize="10px" color="app.faint">{u.email}</Text></Box></Flex></Td>
                          <Td borderColor="app.border"><Badge fontSize="9px" borderRadius="full" px="6px" py="2px" bg="app.surfaceAlt" color="app.subtle">{ROLE_LABELS[u.role as keyof typeof ROLE_LABELS] ?? u.role}</Badge></Td>
                          <Td borderColor="app.border" fontSize="11px" color="app.faint">{new Date(u.created_at).toLocaleDateString()}</Td>
                          <Td borderColor="app.border"><HStack spacing="2px" onClick={(e) => e.stopPropagation()}><Button size="xs" variant="ghost" fontSize="10px" onClick={() => openEditUser(u)}>Edit</Button><Button size="xs" variant="ghost" color="#c23c3c" onClick={() => { setDeleteUserId(u.id); confirmUserDel.onOpen(); }}><Trash2Icon size={13} /></Button></HStack></Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                </TableContainer>
              )}
            </Card>
          </TabPanel>

          {/* Roles */}
          <TabPanel px="0">
            <Card>
              <CardHeader title="Role Management" subtitle="Define roles with granular permissions" right={<Button size="sm" bg="navy.600" color="white" _hover={{ bg: 'navy.500' }} borderRadius="9px" fontSize="12px" leftIcon={<PlusIcon size={14} />} onClick={openCreateRole}>Add role</Button>} />
              <Box px="20px" py="8px">
                {loadingRoles ? <Text py="20px" fontSize="12px" color="app.faint">Loading...</Text> : (
                  <>
                    {ROLE_OPTIONS.map((r) => (
                      <Flex key={r.value} align="center" py="14px" borderBottom="1px solid" borderColor="app.border">
                        <Icon as={ShieldIcon} boxSize="15px" color="app.subtle" /><Box ml="10px"><Text fontSize="13px" fontWeight="700">{r.label}</Text><Text fontSize="11px" color="app.subtle">{r.value === 'super_admin' || r.value === 'admin' ? 'Full access' : r.value === 'sales_manager' ? 'Manage team + deals' : r.value === 'sales_executive' ? 'Own leads + deals' : r.value === 'finance' ? 'Invoices + billing' : 'Leads + reports'}</Text></Box>
                        {profile?.role === r.value && <Badge ml="auto" colorScheme="orange" fontSize="9px">YOU</Badge>}
                      </Flex>
                    ))}
                    {roles.map((r) => (
                      <Flex key={r.id} align="center" py="14px" borderBottom="1px solid" borderColor="app.border">
                        <Icon as={ShieldIcon} boxSize="15px" color="brand.500" /><Box ml="10px" flex="1"><Text fontSize="13px" fontWeight="700">{r.name}</Text><Text fontSize="11px" color="app.subtle">{r.description || `${Object.values(r.permissions).filter(Boolean).length} permissions`}</Text></Box>
                        <HStack spacing="2px"><Button size="xs" variant="ghost" fontSize="10px" onClick={() => openEditRole(r)}>Edit</Button><Button size="xs" variant="ghost" color="#c23c3c" onClick={() => { setDeleteRoleId(r.id); confirmRoleDel.onOpen(); }}><Trash2Icon size={13} /></Button></HStack>
                      </Flex>
                    ))}
                  </>
                )}
              </Box>
            </Card>
          </TabPanel>

          {/* Custom Fields */}
          <TabPanel px="0">
            <Card>
              <CardHeader title="Custom Fields" subtitle="Create industry-specific fields for any entity" right={<Button size="sm" bg="navy.600" color="white" _hover={{ bg: 'navy.500' }} borderRadius="9px" fontSize="12px" leftIcon={<PlusIcon size={14} />} onClick={openCreateField}>Add field</Button>} />
              {loadingFields ? <Flex py="40px" justify="center"><Spinner color="brand.500" /></Flex> : customFields.length === 0 ? (
                <Box px="20px" py="40px" textAlign="center"><Icon as={SettingsIcon} boxSize="28px" color="app.faint" /><Text mt="10px" fontSize="13px" color="app.subtle">No custom fields yet.</Text><Text fontSize="11px" color="app.faint">Create fields like "Property Type" or "Vehicle Model".</Text></Box>
              ) : (
                <TableContainer>
                  <Table size="sm">
                    <Thead><Tr><Th borderColor="app.border" fontSize="10px" color="app.faint">Label</Th><Th borderColor="app.border" fontSize="10px" color="app.faint">Entity</Th><Th borderColor="app.border" fontSize="10px" color="app.faint">Type</Th><Th borderColor="app.border" fontSize="10px" color="app.faint">Required</Th><Th borderColor="app.border" w="80px"></Th></Tr></Thead>
                    <Tbody>
                      {customFields.map((f) => (
                        <Tr key={f.id} _hover={{ bg: 'app.surfaceAlt' }}>
                          <Td borderColor="app.border" fontSize="12px" fontWeight="700">{f.field_label}<Text fontSize="10px" color="app.faint" fontWeight="400">{f.field_name}</Text></Td>
                          <Td borderColor="app.border"><Badge fontSize="9px" borderRadius="full" px="6px" py="2px" bg="app.surfaceAlt" color="app.subtle" textTransform="capitalize">{f.entity_type}</Badge></Td>
                          <Td borderColor="app.border" fontSize="11px" color="app.subtle" textTransform="capitalize">{f.field_type}</Td>
                          <Td borderColor="app.border">{f.is_required ? <CheckIcon size={14} color="#1c8a5c" /> : <Text fontSize="11px" color="app.faint">—</Text>}</Td>
                          <Td borderColor="app.border"><HStack spacing="2px"><Button size="xs" variant="ghost" fontSize="10px" onClick={() => openEditField(f)}>Edit</Button><Button size="xs" variant="ghost" color="#c23c3c" onClick={() => { setDeleteFieldId(f.id); confirmFieldDel.onOpen(); }}><Trash2Icon size={13} /></Button></HStack></Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                </TableContainer>
              )}
            </Card>
          </TabPanel>

          {/* Lead Scoring */}
          <TabPanel px="0">
            <Card>
              <CardHeader title="Lead Scoring Rules" subtitle="Automated point-based lead ranking" right={<Button size="sm" bg="navy.600" color="white" _hover={{ bg: 'navy.500' }} borderRadius="9px" fontSize="12px" leftIcon={<PlusIcon size={14} />} onClick={openCreateRule}>Add rule</Button>} />
              {loadingRules ? <Flex py="40px" justify="center"><Spinner color="brand.500" /></Flex> : scoreRules.length === 0 ? (
                <Box px="20px" py="40px" textAlign="center"><Icon as={ZapIcon} boxSize="28px" color="app.faint" /><Text mt="10px" fontSize="13px" color="app.subtle">No scoring rules yet.</Text><Text fontSize="11px" color="app.faint">Add rules like "Source is Website → +15 points".</Text></Box>
              ) : (
                <Box px="20px" py="8px">
                  {scoreRules.map((r) => (
                    <Flex key={r.id} align="center" gap="10px" py="12px" borderBottom="1px solid" borderColor="app.border">
                      <Box w="36px" h="26px" display="flex" align="center" justify="center" borderRadius="6px" bg={r.points >= 0 ? '#e8f5ee' : '#fde8e8'}><Text fontSize="11px" fontWeight="800" color={r.points >= 0 ? '#1c8a5c' : '#c23c3c'}>{r.points >= 0 ? '+' : ''}{r.points}</Text></Box>
                      <Box flex="1"><Text fontSize="12px" fontWeight="700">{r.name}</Text><Text fontSize="10px" color="app.faint" textTransform="capitalize">{r.condition_field} {r.condition_operator} "{r.condition_value}"</Text></Box>
                      <Switch isChecked={r.enabled} onChange={() => toggleRule(r)} colorScheme="orange" size="sm" />
                      <Button size="xs" variant="ghost" fontSize="10px" onClick={() => openEditRule(r)}>Edit</Button>
                      <Button size="xs" variant="ghost" color="#c23c3c" onClick={() => { setDeleteRuleId(r.id); confirmRuleDel.onOpen(); }}><Trash2Icon size={13} /></Button>
                    </Flex>
                  ))}
                </Box>
              )}
            </Card>
          </TabPanel>

          {/* Localization & Tax */}
          <TabPanel px="0">
            <Card p="22px" maxW="560px">
              {loadingSettings ? <Flex py="40px" justify="center"><Spinner color="brand.500" /></Flex> : (
                <>
                  <Flex align="center" gap="8px" mb="18px"><Icon as={GlobeIcon} boxSize="18px" color="brand.500" /><Text fontWeight="700" fontSize="14px">Localization & Tax</Text></Flex>
                  <Stack spacing="16px">
                    <FormControl><FormLabel fontSize="12px">Base currency</FormLabel><Select value={locForm.currency} onChange={(e) => setLocForm({ ...locForm, currency: e.target.value })} size="sm" borderRadius="9px" borderColor="app.border">{CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}</Select></FormControl>
                    <Grid templateColumns="1fr 1fr" gap="14px">
                      <FormControl><FormLabel fontSize="12px">Default tax rate (%)</FormLabel><Input type="number" value={locForm.tax_rate} onChange={(e) => setLocForm({ ...locForm, tax_rate: e.target.value })} size="sm" borderRadius="9px" borderColor="app.border" placeholder="0" /></FormControl>
                      <FormControl><FormLabel fontSize="12px">Exchange rate (to USD)</FormLabel><Input type="number" step="0.0001" value={locForm.exchange_rate} onChange={(e) => setLocForm({ ...locForm, exchange_rate: e.target.value })} size="sm" borderRadius="9px" borderColor="app.border" placeholder="1" /></FormControl>
                    </Grid>
                    <Button mt="4px" size="sm" bg="navy.600" color="white" _hover={{ bg: 'navy.500' }} borderRadius="9px" fontSize="12px" isLoading={savingSettings} onClick={handleSaveSettings}>Save settings</Button>
                  </Stack>
                </>
              )}
            </Card>
          </TabPanel>

          {/* Integrations */}
          <TabPanel px="0">
            <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)', xl: 'repeat(3, 1fr)' }} gap="14px">
              {mcpServers.map((server) => (
                <Card key={server.id} p="16px">
                  <Flex align="center"><Text fontSize="13px" fontWeight="700">{server.name}</Text><Box ml="auto"><StatusBadge status={server.connected ? 'Approved' : 'Draft'} /></Box></Flex>
                  <Text fontSize="11px" color="app.subtle" mt="3px">{server.category}</Text>
                  <Button mt="12px" size="xs" w="full" variant="outline" borderColor="app.border" borderRadius="8px" fontSize="11px" onClick={() => toggleServer(server.id)}>{server.connected ? 'Disconnect' : 'Connect'}</Button>
                </Card>
              ))}
            </Grid>
          </TabPanel>

          {/* API Sync */}
          <TabPanel px="0">
            <Card>
              <CardHeader title="API Sync Connections" subtitle="Sync data with external APIs and services" right={<Button size="sm" bg="navy.600" color="white" _hover={{ bg: 'navy.500' }} borderRadius="9px" fontSize="12px" leftIcon={<PlusIcon size={14} />} onClick={openCreateSync}>Add connection</Button>} />
              {loadingSync ? <Flex py="40px" justify="center"><Spinner color="brand.500" /></Flex> : syncConnections.length === 0 ? (
                <Box px="20px" py="40px" textAlign="center"><Icon as={LinkIcon} boxSize="28px" color="app.faint" /><Text mt="10px" fontSize="13px" color="app.subtle">No sync connections yet.</Text></Box>
              ) : (
                <TableContainer>
                  <Table size="sm">
                    <Thead><Tr><Th borderColor="app.border" fontSize="10px" color="app.faint">Name</Th><Th borderColor="app.border" fontSize="10px" color="app.faint" display={{ base: 'none', md: 'table-cell' }}>Provider</Th><Th borderColor="app.border" fontSize="10px" color="app.faint">Status</Th><Th borderColor="app.border" fontSize="10px" color="app.faint" display={{ base: 'none', md: 'table-cell' }}>Last synced</Th><Th borderColor="app.border" w="120px"></Th></Tr></Thead>
                    <Tbody>
                      {syncConnections.map((conn) => (
                        <Tr key={conn.id} _hover={{ bg: 'app.surfaceAlt' }} cursor="pointer" onClick={() => openEditSync(conn)}>
                          <Td borderColor="app.border" fontSize="12px" fontWeight="700">{conn.name}</Td>
                          <Td borderColor="app.border" display={{ base: 'none', md: 'table-cell' }}><Flex align="center" gap="6px"><Icon as={GlobeIcon} boxSize="12px" color="app.subtle" /><Text fontSize="11px">{conn.provider}</Text></Flex></Td>
                          <Td borderColor="app.border"><StatusBadge status={conn.status === 'active' ? 'Approved' : conn.status === 'syncing' ? 'Pending' : 'Draft'} /></Td>
                          <Td borderColor="app.border" display={{ base: 'none', md: 'table-cell' }} fontSize="11px" color="app.faint">{conn.last_synced_at ? new Date(conn.last_synced_at).toLocaleString() : 'Never'}</Td>
                          <Td borderColor="app.border"><HStack spacing="2px" onClick={(e) => e.stopPropagation()}><Button size="xs" variant="ghost" fontSize="10px" leftIcon={<RefreshCwIcon size={12} />} isLoading={syncing === conn.id} onClick={() => runSync(conn)}>Sync</Button><Button size="xs" variant="ghost" fontSize="10px" onClick={() => toggleSync(conn)}>{conn.status === 'active' ? 'Pause' : 'Activate'}</Button><Button size="xs" variant="ghost" color="#c23c3c" onClick={() => { setDeleteSyncId(conn.id); confirmSyncDel.onOpen(); }}><Trash2Icon size={13} /></Button></HStack></Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                </TableContainer>
              )}
            </Card>
            {syncLogs.length > 0 && (
              <Card mt="14px">
                <CardHeader title="Recent sync logs" subtitle="Last 10 sync operations" />
                <Box px="20px" py="8px">
                  {syncLogs.map((log, i) => (
                    <Flex key={log.id} align="center" gap="10px" py="10px" borderBottom={i === syncLogs.length - 1 ? '0' : '1px solid'} borderColor="app.border">
                      <Icon as={log.status === 'success' ? CheckIcon : ZapIcon} boxSize="13px" color={log.status === 'success' ? '#2d9c79' : '#c23c3c'} />
                      <Box flex="1"><Text fontSize="12px" fontWeight="600">{log.status === 'success' ? `${log.records_synced} records synced` : 'Sync failed'}</Text>{log.error_message && <Text fontSize="10px" color="#c23c3c">{log.error_message}</Text>}</Box>
                      <Text fontSize="10px" color="app.faint">{new Date(log.created_at).toLocaleString()}</Text>
                    </Flex>
                  ))}
                </Box>
              </Card>
            )}
          </TabPanel>

          {/* Notifications */}
          <TabPanel px="0">
            <Card p="20px" maxW="560px">
              {['Email notifications', 'Push notifications', 'Slack alerts', 'Telegram alerts', 'Weekly digest'].map((label, i) => (
                <Flex key={label} align="center" py="13px" borderBottom={i === 4 ? '0' : '1px solid'} borderColor="app.border">
                  <Text fontSize="13px" flex="1">{label}</Text><Switch defaultChecked={i < 2} colorScheme="orange" />
                </Flex>
              ))}
            </Card>
          </TabPanel>

          {/* API Keys */}
          <TabPanel px="0">
            <Card p="20px" maxW="620px">
              <Flex align="center" gap="8px" mb="14px"><Icon as={KeyIcon} boxSize="16px" color="#e9683f" /><Text fontWeight="700" fontSize="14px">API Keys</Text></Flex>
              {[{ name: 'Production key', value: 'sk_live_••••••••••••4f2a' }, { name: 'Development key', value: 'sk_test_••••••••••••9c1b' }].map((key, i) => (
                <Flex key={i} align="center" gap="10px" py="12px" borderBottom={i === 1 ? '0' : '1px solid'} borderColor="app.border">
                  <Box flex="1"><Text fontSize="12px" fontWeight="600">{key.name}</Text><Text fontSize="11px" color="app.subtle" fontFamily="monospace">{key.value}</Text></Box>
                  <Button size="xs" variant="ghost" leftIcon={<CopyIcon size={13} />} onClick={() => toast({ title: 'API key copied', status: 'success', duration: 1400, position: 'top-right' })}>Copy</Button>
                </Flex>
              ))}
              <Button mt="14px" size="sm" variant="outline" borderColor="app.border" borderRadius="9px" fontSize="12px" leftIcon={<RefreshCwIcon size={14} />} onClick={() => toast({ title: 'New key generated', status: 'success', duration: 1600, position: 'top-right' })}>Generate new key</Button>
            </Card>
          </TabPanel>

          {/* Audit Logs */}
          <TabPanel px="0">
            <Card>
              <CardHeader title="Audit Logs" subtitle="Secure record of all user activity and data changes" />
              <Box px="20px" py="8px">
                {loadingLogs ? <Text py="20px" fontSize="12px" color="app.faint">Loading...</Text> : auditLogs.length === 0 ? (
                  <Text py="20px" fontSize="12px" color="app.faint">No activity recorded yet.</Text>
                ) : auditLogs.map((log, i) => (
                  <Flex key={log.id} align="center" gap="10px" py="11px" borderBottom={i === auditLogs.length - 1 ? '0' : '1px solid'} borderColor="app.border">
                    <Box w="28px" h="28px" display="flex" align="center" justify="center" borderRadius="full" bg="app.surfaceAlt"><Icon as={CheckIcon} boxSize="13px" color="#2d9c79" /></Box>
                    <Box flex="1"><Text fontSize="12px" fontWeight="600">{log.action}</Text><Text fontSize="10px" color="app.faint">{log.entity_type ? `${log.entity_type} · ` : ''}{new Date(log.created_at).toLocaleString()}</Text></Box>
                    {log.metadata && Object.keys(log.metadata).length > 0 && <Badge fontSize="8px" borderRadius="full" px="5px" py="1px" bg="app.surfaceAlt" color="app.subtle">{Object.keys(log.metadata).length} fields</Badge>}
                  </Flex>
                ))}
              </Box>
            </Card>
          </TabPanel>
        </TabPanels>
      </Tabs>

      {/* User Modal */}
      <FormModal isOpen={userModal.isOpen} onClose={userModal.onClose} title={editingUserId ? 'Edit user' : 'Add user'} subtitle={editingUserId ? 'Update user account' : 'Create a new user account'} loading={savingUser} onSubmit={handleSaveUser} submitLabel={editingUserId ? 'Update' : 'Create'}>
        <FormControl><FormLabel fontSize="12px">Full name</FormLabel><Input value={userForm.full_name} onChange={(e) => setUserForm({ ...userForm, full_name: e.target.value })} size="sm" borderRadius="9px" borderColor="app.border" fontSize="13px" /></FormControl>
        <FormControl><FormLabel fontSize="12px">Email</FormLabel><Input value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} size="sm" borderRadius="9px" borderColor="app.border" fontSize="13px" isDisabled={!!editingUserId} /></FormControl>
        <Grid templateColumns="1fr 1fr" gap="10px">
          <FormControl><FormLabel fontSize="12px">Role</FormLabel><Select value={userForm.role} onChange={(e) => setUserForm({ ...userForm, role: e.target.value })} size="sm" borderRadius="9px" borderColor="app.border" fontSize="13px">{ROLE_OPTIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}</Select></FormControl>
          <FormControl><FormLabel fontSize="12px">Avatar color</FormLabel><Input type="color" value={userForm.avatar_color} onChange={(e) => setUserForm({ ...userForm, avatar_color: e.target.value })} size="sm" borderRadius="9px" borderColor="app.border" h="36px" /></FormControl>
        </Grid>
      </FormModal>

      {/* Custom Field Modal */}
      <FormModal isOpen={fieldModal.isOpen} onClose={fieldModal.onClose} title={editingFieldId ? 'Edit field' : 'Add custom field'} subtitle={editingFieldId ? 'Update field definition' : 'Create an industry-specific field'} loading={savingField} onSubmit={handleSaveField} submitLabel={editingFieldId ? 'Update' : 'Create'}>
        <FormControl><FormLabel fontSize="12px">Field label</FormLabel><Input value={fieldForm.field_label} onChange={(e) => setFieldForm({ ...fieldForm, field_label: e.target.value })} placeholder="Property Type" size="sm" borderRadius="9px" borderColor="app.border" fontSize="13px" /></FormControl>
        <FormControl><FormLabel fontSize="12px">Field name (key)</FormLabel><Input value={fieldForm.field_name} onChange={(e) => setFieldForm({ ...fieldForm, field_name: e.target.value })} placeholder="property_type" size="sm" borderRadius="9px" borderColor="app.border" fontSize="13px" /></FormControl>
        <Grid templateColumns="1fr 1fr" gap="10px">
          <FormControl><FormLabel fontSize="12px">Entity type</FormLabel><Select value={fieldForm.entity_type} onChange={(e) => setFieldForm({ ...fieldForm, entity_type: e.target.value })} size="sm" borderRadius="9px" borderColor="app.border" fontSize="13px">{ENTITY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</Select></FormControl>
          <FormControl><FormLabel fontSize="12px">Field type</FormLabel><Select value={fieldForm.field_type} onChange={(e) => setFieldForm({ ...fieldForm, field_type: e.target.value })} size="sm" borderRadius="9px" borderColor="app.border" fontSize="13px">{FIELD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</Select></FormControl>
        </Grid>
        {fieldForm.field_type === 'select' && <FormControl><FormLabel fontSize="12px">Options (comma-separated)</FormLabel><Input value={fieldForm.field_options} onChange={(e) => setFieldForm({ ...fieldForm, field_options: e.target.value })} placeholder="House, Apartment, Land" size="sm" borderRadius="9px" borderColor="app.border" fontSize="13px" /></FormControl>}
        <Flex align="center" gap="10px"><Checkbox isChecked={fieldForm.is_required} onChange={(e) => setFieldForm({ ...fieldForm, is_required: e.target.checked })} colorScheme="orange" /><Text fontSize="12px">Required field</Text></Flex>
      </FormModal>

      {/* Score Rule Modal */}
      <FormModal isOpen={ruleModal.isOpen} onClose={ruleModal.onClose} title={editingRuleId ? 'Edit rule' : 'Add scoring rule'} subtitle={editingRuleId ? 'Update scoring rule' : 'Create a point-based scoring rule'} loading={savingRule} onSubmit={handleSaveRule} submitLabel={editingRuleId ? 'Update' : 'Create'}>
        <FormControl><FormLabel fontSize="12px">Rule name</FormLabel><Input value={ruleForm.name} onChange={(e) => setRuleForm({ ...ruleForm, name: e.target.value })} placeholder="Website source bonus" size="sm" borderRadius="9px" borderColor="app.border" fontSize="13px" /></FormControl>
        <Grid templateColumns="1fr 1fr" gap="10px">
          <FormControl><FormLabel fontSize="12px">Field</FormLabel><Select value={ruleForm.condition_field} onChange={(e) => setRuleForm({ ...ruleForm, condition_field: e.target.value })} size="sm" borderRadius="9px" borderColor="app.border" fontSize="13px">{SCORE_FIELDS.map((f) => <option key={f} value={f}>{f}</option>)}</Select></FormControl>
          <FormControl><FormLabel fontSize="12px">Operator</FormLabel><Select value={ruleForm.condition_operator} onChange={(e) => setRuleForm({ ...ruleForm, condition_operator: e.target.value })} size="sm" borderRadius="9px" borderColor="app.border" fontSize="13px">{SCORE_OPERATORS.map((o) => <option key={o} value={o}>{o}</option>)}</Select></FormControl>
        </Grid>
        <Grid templateColumns="1fr 1fr" gap="10px">
          <FormControl><FormLabel fontSize="12px">Value</FormLabel><Input value={ruleForm.condition_value} onChange={(e) => setRuleForm({ ...ruleForm, condition_value: e.target.value })} placeholder="Website" size="sm" borderRadius="9px" borderColor="app.border" fontSize="13px" /></FormControl>
          <FormControl><FormLabel fontSize="12px">Points (+/-)</FormLabel><Input type="number" value={ruleForm.points} onChange={(e) => setRuleForm({ ...ruleForm, points: Number(e.target.value) })} size="sm" borderRadius="9px" borderColor="app.border" fontSize="13px" placeholder="10" /></FormControl>
        </Grid>
      </FormModal>

      {/* Role Modal */}
      <FormModal isOpen={roleModal.isOpen} onClose={roleModal.onClose} title={editingRoleId ? 'Edit role' : 'Add role'} subtitle={editingRoleId ? 'Update role and permissions' : 'Define a custom role with permissions'} loading={savingRole} onSubmit={handleSaveRole} submitLabel={editingRoleId ? 'Update' : 'Create'}>
        <FormControl><FormLabel fontSize="12px">Role name</FormLabel><Input value={roleForm.name} onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })} placeholder="Sales Coordinator" size="sm" borderRadius="9px" borderColor="app.border" fontSize="13px" /></FormControl>
        <FormControl><FormLabel fontSize="12px">Description</FormLabel><Input value={roleForm.description} onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })} placeholder="Can view and edit leads, no delete" size="sm" borderRadius="9px" borderColor="app.border" fontSize="13px" /></FormControl>
        <Box><Text fontSize="12px" fontWeight="600" mb="8px">Permissions</Text><Grid templateColumns="1fr 1fr" gap="6px">{PERMISSION_KEYS.map((p) => <Checkbox key={p} isChecked={!!roleForm.permissions[p]} onChange={() => togglePerm(p)} colorScheme="orange" fontSize="11px">{p.replace(/_/g, ' ')}</Checkbox>)}</Grid></Box>
      </FormModal>

      <FormModal isOpen={syncDrawer.isOpen} onClose={syncDrawer.onClose} title={editingSyncId ? 'Edit sync connection' : 'New sync connection'} subtitle="Configure an external API sync" loading={savingSync} onSubmit={handleSaveSync} submitLabel={editingSyncId ? 'Update' : 'Create'}>
        <FormControl><FormLabel fontSize="12px">Connection name</FormLabel><Input value={syncForm.name} onChange={(e) => setSyncForm({ ...syncForm, name: e.target.value })} size="sm" borderRadius="9px" borderColor="app.border" fontSize="13px" /></FormControl>
        <FormControl><FormLabel fontSize="12px">Provider</FormLabel><Select value={syncForm.provider} onChange={(e) => setSyncForm({ ...syncForm, provider: e.target.value })} size="sm" borderRadius="9px" borderColor="app.border" fontSize="13px">{PROVIDERS.map((p) => <option key={p} value={p}>{p}</option>)}</Select></FormControl>
        <FormControl><FormLabel fontSize="12px">Endpoint URL</FormLabel><Input value={syncForm.endpoint_url} onChange={(e) => setSyncForm({ ...syncForm, endpoint_url: e.target.value })} size="sm" borderRadius="9px" borderColor="app.border" fontSize="13px" /></FormControl>
        <FormControl><FormLabel fontSize="12px">Authentication type</FormLabel><Select value={syncForm.auth_type} onChange={(e) => setSyncForm({ ...syncForm, auth_type: e.target.value })} size="sm" borderRadius="9px" borderColor="app.border" fontSize="13px">{AUTH_TYPES.map((a) => <option key={a} value={a}>{a}</option>)}</Select></FormControl>
        {syncForm.auth_type !== 'none' && <FormControl><FormLabel fontSize="12px">API key / Token</FormLabel><Input type="password" value={syncForm.api_key} onChange={(e) => setSyncForm({ ...syncForm, api_key: e.target.value })} size="sm" borderRadius="9px" borderColor="app.border" fontSize="13px" /></FormControl>}
      </FormModal>

      <ConfirmDialog isOpen={confirmUserDel.isOpen} onClose={confirmUserDel.onClose} title="Delete user" message="Delete this user account?" confirmLabel="Delete" danger onConfirm={handleDeleteUser} />
      <ConfirmDialog isOpen={confirmFieldDel.isOpen} onClose={confirmFieldDel.onClose} title="Delete custom field" message="Delete this custom field and all its values?" confirmLabel="Delete" danger onConfirm={handleDeleteField} />
      <ConfirmDialog isOpen={confirmRuleDel.isOpen} onClose={confirmRuleDel.onClose} title="Delete scoring rule" message="Delete this scoring rule?" confirmLabel="Delete" danger onConfirm={handleDeleteRule} />
      <ConfirmDialog isOpen={confirmRoleDel.isOpen} onClose={confirmRoleDel.onClose} title="Delete role" message="Delete this custom role?" confirmLabel="Delete" danger onConfirm={handleDeleteRole} />
      <ConfirmDialog isOpen={confirmSyncDel.isOpen} onClose={confirmSyncDel.onClose} title="Delete sync connection" message="Delete this sync connection?" confirmLabel="Delete" danger onConfirm={handleDeleteSync} />
    </>
  );
}
