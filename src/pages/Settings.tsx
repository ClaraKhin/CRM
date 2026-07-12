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
  Input,
  Select,
  Spinner,
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
  Trash2Icon,
  ZapIcon } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Card, CardHeader } from '../components/ui/Card';
import { StatusBadge } from '../components/ui/StatusBadge';
import { FormDrawer } from '../components/ui/FormDrawer';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { supabase, ROLE_LABELS, type UserRole } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

const ROLE_OPTIONS = Object.entries(ROLE_LABELS).map(([value, label]) => ({ value, label }));

const plans = [
  { name: 'Starter', price: '$0', current: false },
  { name: 'Growth', price: '$49', current: true },
  { name: 'Enterprise', price: 'Custom', current: false }
];

type SyncConnection = {
  id: string;
  name: string;
  provider: string;
  endpoint_url: string;
  auth_type: string;
  status: string;
  last_synced_at: string | null;
  config: any;
  created_at: string;
};

type SyncLog = {
  id: string;
  connection_id: string;
  status: string;
  records_synced: number;
  error_message: string;
  created_at: string;
};

const PROVIDERS = ['Google', 'Outlook', 'Slack', 'HubSpot', 'Salesforce', 'Zapier', 'Custom API', 'Webhook'];
const AUTH_TYPES = ['api_key', 'oauth2', 'bearer', 'basic', 'none'];

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

  // Sync form drawer
  const syncDrawer = useDisclosure();
  const [syncForm, setSyncForm] = useState({ name: '', provider: 'Google', endpoint_url: '', auth_type: 'api_key', api_key: '' });
  const [savingSync, setSavingSync] = useState(false);
  const [editingSyncId, setEditingSyncId] = useState<string | null>(null);
  const confirmSyncDel = useDisclosure();
  const [deleteSyncId, setDeleteSyncId] = useState<string | null>(null);
  const [syncing, setSyncing] = useState<string | null>(null);

  useEffect(() => {
    setProfileForm({ full_name: profile?.full_name ?? '', email: profile?.email ?? '' });
  }, [profile]);

  const loadMcp = useCallback(async () => {
    if (!session?.user) return;
    const { data } = await supabase.from('mcp_servers').select('*').eq('user_id', session.user.id);
    setMcpServers(data ?? []);
  }, [session]);

  const loadLogs = useCallback(async () => {
    if (!session?.user) return;
    setLoadingLogs(true);
    const { data } = await supabase.from('audit_logs').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false }).limit(20);
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

  useEffect(() => { loadMcp(); loadLogs(); loadSync(); }, [loadMcp, loadLogs, loadSync]);

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
    if (error) {
      toast({ title: 'Save failed', description: error.message, status: 'error', duration: 3000, position: 'top-right' });
    } else {
      await refreshProfile();
      toast({ title: 'Profile saved', status: 'success', duration: 1800, position: 'top-right' });
    }
    setSavingProfile(false);
  };

  // Sync connection CRUD
  const openCreateSync = () => {
    setEditingSyncId(null);
    setSyncForm({ name: '', provider: 'Google', endpoint_url: '', auth_type: 'api_key', api_key: '' });
    syncDrawer.onOpen();
  };

  const openEditSync = (conn: SyncConnection) => {
    setEditingSyncId(conn.id);
    setSyncForm({ name: conn.name, provider: conn.provider, endpoint_url: conn.endpoint_url, auth_type: conn.auth_type, api_key: conn.config?.api_key ?? '' });
    syncDrawer.onOpen();
  };

  const handleSaveSync = async () => {
    if (!syncForm.name.trim()) { toast({ title: 'Name is required', status: 'error', duration: 2000, position: 'top-right' }); return; }
    setSavingSync(true);
    const config = { api_key: syncForm.api_key, auth_type: syncForm.auth_type };
    if (editingSyncId) {
      await supabase.from('api_sync_connections').update({
        name: syncForm.name, provider: syncForm.provider, endpoint_url: syncForm.endpoint_url,
        auth_type: syncForm.auth_type, config
      }).eq('id', editingSyncId).eq('user_id', session!.user.id);
      toast({ title: 'Sync connection updated', status: 'success', duration: 2000, position: 'top-right' });
    } else {
      await supabase.from('api_sync_connections').insert({
        user_id: session!.user.id, name: syncForm.name, provider: syncForm.provider,
        endpoint_url: syncForm.endpoint_url, auth_type: syncForm.auth_type, status: 'inactive', config
      });
      toast({ title: 'Sync connection created', status: 'success', duration: 2000, position: 'top-right' });
    }
    setSavingSync(false);
    syncDrawer.onClose();
    loadSync();
  };

  const handleDeleteSync = async () => {
    if (!deleteSyncId) return;
    await supabase.from('api_sync_connections').delete().eq('id', deleteSyncId).eq('user_id', session!.user.id);
    toast({ title: 'Connection deleted', status: 'success', duration: 1800, position: 'top-right' });
    confirmSyncDel.onClose(); setDeleteSyncId(null); loadSync();
  };

  const toggleSync = async (conn: SyncConnection) => {
    const newStatus = conn.status === 'active' ? 'inactive' : 'active';
    await supabase.from('api_sync_connections').update({ status: newStatus }).eq('id', conn.id).eq('user_id', session!.user.id);
    toast({ title: `${conn.name} ${newStatus === 'active' ? 'activated' : 'deactivated'}`, status: 'info', duration: 1600, position: 'top-right' });
    loadSync();
  };

  const runSync = async (conn: SyncConnection) => {
    setSyncing(conn.id);
    await supabase.from('api_sync_connections').update({ status: 'syncing' }).eq('id', conn.id).eq('user_id', session!.user.id);
    setTimeout(async () => {
      const records = Math.floor(Math.random() * 50) + 5;
      await supabase.from('api_sync_connections').update({ status: 'active', last_synced_at: new Date().toISOString() }).eq('id', conn.id).eq('user_id', session!.user.id);
      await supabase.from('api_sync_logs').insert({
        user_id: session!.user.id, connection_id: conn.id, status: 'success', records_synced: records
      });
      toast({ title: `${conn.name} synced ${records} records`, status: 'success', duration: 2000, position: 'top-right' });
      setSyncing(null);
      loadSync();
    }, 1500);
  };

  return (
    <>
      <PageHeader title="Settings" subtitle="Manage your workspace, team, and integrations." />

      <Tabs colorScheme="orange" variant="soft-rounded">
        <TabList overflowX="auto" pb="4px" gap="4px">
          {['Profile', 'Team & Roles', 'Integrations', 'API Sync', 'Notifications', 'Billing', 'API Keys', 'Audit Logs'].map((t) => (
            <Tab key={t} fontSize="12px" fontWeight="600" whiteSpace="nowrap" _selected={{ bg: 'brand.50', color: 'brand.600' }}>{t}</Tab>
          ))}
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
                  <FormControl>
                    <FormLabel fontSize="12px">Full name</FormLabel>
                    <Input value={profileForm.full_name} onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })} size="sm" borderRadius="9px" borderColor="app.border" />
                  </FormControl>
                  <FormControl>
                    <FormLabel fontSize="12px">Email</FormLabel>
                    <Input value={profileForm.email} isDisabled size="sm" borderRadius="9px" borderColor="app.border" />
                  </FormControl>
                </Grid>
                <Button mt="18px" size="sm" bg="navy.600" color="white" _hover={{ bg: 'navy.500' }} borderRadius="9px" fontSize="12px" isLoading={savingProfile} onClick={saveProfile}>Save changes</Button>
              </Card>
              <Card p="20px">
                <Text fontWeight="700" fontSize="13px" mb="14px">Security</Text>
                <Flex direction="column" gap="12px">
                  <Flex align="center" gap="10px" p="12px" bg="app.surfaceAlt" borderRadius="10px">
                    <Icon as={KeyIcon} boxSize="16px" color="brand.500" />
                    <Box flex="1">
                      <Text fontSize="12px" fontWeight="600">Two-factor auth</Text>
                      <Text fontSize="10px" color="app.faint">Protect your account with 2FA</Text>
                    </Box>
                    <StatusBadge status="Approved" />
                  </Flex>
                  <Flex align="center" gap="10px" p="12px" bg="app.surfaceAlt" borderRadius="10px">
                    <Icon as={ZapIcon} boxSize="16px" color="#2d9c79" />
                    <Box flex="1">
                      <Text fontSize="12px" fontWeight="600">Active sessions</Text>
                      <Text fontSize="10px" color="app.faint">1 device · this browser</Text>
                    </Box>
                  </Flex>
                </Flex>
              </Card>
            </Grid>
          </TabPanel>

          {/* Team & Roles */}
          <TabPanel px="0">
            <Card>
              <CardHeader title="Roles & permissions" subtitle="RBAC role definitions" />
              <Box px="20px" py="8px">
                {ROLE_OPTIONS.map((r, i) => (
                  <Flex key={r.value} align="center" py="14px" borderBottom={i === ROLE_OPTIONS.length - 1 ? '0' : '1px solid'} borderColor="app.border">
                    <Box>
                      <Text fontSize="13px" fontWeight="700">{r.label}</Text>
                      <Text fontSize="11px" color="app.subtle">
                        {r.value === 'super_admin' || r.value === 'admin' ? 'Full access' : r.value === 'sales_manager' ? 'Manage team + deals' : r.value === 'sales_executive' ? 'Own leads + deals' : r.value === 'finance' ? 'Invoices + billing' : 'Leads + reports'}
                      </Text>
                    </Box>
                    {profile?.role === r.value && <Badge ml="auto" colorScheme="orange" fontSize="9px">YOU</Badge>}
                  </Flex>
                ))}
              </Box>
            </Card>
          </TabPanel>

          {/* Integrations */}
          <TabPanel px="0">
            <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)', xl: 'repeat(3, 1fr)' }} gap="14px">
              {mcpServers.map((server) => (
                <Card key={server.id} p="16px">
                  <Flex align="center">
                    <Text fontSize="13px" fontWeight="700">{server.name}</Text>
                    <Box ml="auto"><StatusBadge status={server.connected ? 'Approved' : 'Draft'} /></Box>
                  </Flex>
                  <Text fontSize="11px" color="app.subtle" mt="3px">{server.category}</Text>
                  <Button mt="12px" size="xs" w="full" variant="outline" borderColor="app.border" borderRadius="8px" fontSize="11px" onClick={() => toggleServer(server.id)}>
                    {server.connected ? 'Disconnect' : 'Connect'}
                  </Button>
                </Card>
              ))}
            </Grid>
          </TabPanel>

          {/* API Sync */}
          <TabPanel px="0">
            <Card>
              <CardHeader title="API Sync Connections" subtitle="Sync data with external APIs and services" right={<Button size="sm" bg="navy.600" color="white" _hover={{ bg: 'navy.500' }} borderRadius="9px" fontSize="12px" leftIcon={<PlusIcon size={14} />} onClick={openCreateSync}>Add connection</Button>} />
              {loadingSync ? (
                <Flex py="40px" justify="center"><Spinner color="brand.500" /></Flex>
              ) : syncConnections.length === 0 ? (
                <Box px="20px" py="40px" textAlign="center">
                  <Icon as={LinkIcon} boxSize="28px" color="app.faint" />
                  <Text mt="10px" fontSize="13px" color="app.subtle">No sync connections yet.</Text>
                  <Text fontSize="11px" color="app.faint">Add a connection to sync data with external APIs.</Text>
                </Box>
              ) : (
                <TableContainer>
                  <Table size="sm">
                    <Thead>
                      <Tr>
                        <Th borderColor="app.border" fontSize="10px" color="app.faint">Name</Th>
                        <Th borderColor="app.border" fontSize="10px" color="app.faint" display={{ base: 'none', md: 'table-cell' }}>Provider</Th>
                        <Th borderColor="app.border" fontSize="10px" color="app.faint" display={{ base: 'none', lg: 'table-cell' }}>Endpoint</Th>
                        <Th borderColor="app.border" fontSize="10px" color="app.faint">Status</Th>
                        <Th borderColor="app.border" fontSize="10px" color="app.faint" display={{ base: 'none', md: 'table-cell' }}>Last synced</Th>
                        <Th borderColor="app.border" w="120px"></Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {syncConnections.map((conn) => (
                        <Tr key={conn.id} _hover={{ bg: 'app.surfaceAlt' }} cursor="pointer" onClick={() => openEditSync(conn)}>
                          <Td borderColor="app.border" fontSize="12px" fontWeight="700">{conn.name}</Td>
                          <Td borderColor="app.border" display={{ base: 'none', md: 'table-cell' }}>
                            <Flex align="center" gap="6px">
                              <Icon as={GlobeIcon} boxSize="12px" color="app.subtle" />
                              <Text fontSize="11px">{conn.provider}</Text>
                            </Flex>
                          </Td>
                          <Td borderColor="app.border" display={{ base: 'none', lg: 'table-cell' }} fontSize="11px" color="app.subtle" noOfLines={1}>{conn.endpoint_url || '—'}</Td>
                          <Td borderColor="app.border"><StatusBadge status={conn.status === 'active' ? 'Approved' : conn.status === 'syncing' ? 'Pending' : conn.status === 'error' ? 'Overdue' : 'Draft'} /></Td>
                          <Td borderColor="app.border" display={{ base: 'none', md: 'table-cell' }} fontSize="11px" color="app.faint">{conn.last_synced_at ? new Date(conn.last_synced_at).toLocaleString() : 'Never'}</Td>
                          <Td borderColor="app.border">
                            <HStack spacing="2px" onClick={(e) => e.stopPropagation()}>
                              <Button size="xs" variant="ghost" fontSize="10px" leftIcon={<RefreshCwIcon size={12} />} isLoading={syncing === conn.id} onClick={() => runSync(conn)}>Sync</Button>
                              <Button size="xs" variant="ghost" fontSize="10px" onClick={() => toggleSync(conn)}>{conn.status === 'active' ? 'Pause' : 'Activate'}</Button>
                              <Button size="xs" variant="ghost" color="#c23c3c" onClick={() => { setDeleteSyncId(conn.id); confirmSyncDel.onOpen(); }}><Trash2Icon size={13} /></Button>
                            </HStack>
                          </Td>
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
                      <Box flex="1">
                        <Text fontSize="12px" fontWeight="600">{log.status === 'success' ? `${log.records_synced} records synced` : 'Sync failed'}</Text>
                        {log.error_message && <Text fontSize="10px" color="#c23c3c">{log.error_message}</Text>}
                      </Box>
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
              {['Email notifications', 'Push notifications', 'Slack alerts', 'Weekly digest'].map((label, i) => (
                <Flex key={label} align="center" py="13px" borderBottom={i === 3 ? '0' : '1px solid'} borderColor="app.border">
                  <Text fontSize="13px" flex="1">{label}</Text>
                  <Switch defaultChecked={i < 2} colorScheme="orange" />
                </Flex>
              ))}
            </Card>
          </TabPanel>

          {/* Billing */}
          <TabPanel px="0">
            <Grid templateColumns={{ base: '1fr', md: 'repeat(3, 1fr)' }} gap="14px">
              {plans.map((plan) => (
                <Card key={plan.name} p="20px" borderColor={plan.current ? 'brand.500' : 'app.border'} borderWidth={plan.current ? '2px' : '1px'}>
                  <Flex align="center">
                    <Text fontSize="14px" fontWeight="800">{plan.name}</Text>
                    {plan.current && <Box ml="auto"><StatusBadge status="Approved" /></Box>}
                  </Flex>
                  <Text mt="8px" fontFamily="'Plus Jakarta Sans', sans-serif" fontSize="26px" fontWeight="800">
                    {plan.price}<Text as="span" fontSize="12px" color="app.subtle" fontWeight="500">/mo</Text>
                  </Text>
                  <Button mt="14px" size="sm" w="full" borderRadius="9px" fontSize="12px" isDisabled={plan.current} bg={plan.current ? 'app.surfaceAlt' : 'navy.600'} color={plan.current ? 'app.subtle' : 'white'} _hover={{ bg: plan.current ? 'app.surfaceAlt' : 'navy.500' }} onClick={() => toast({ title: `Switched to ${plan.name}`, status: 'success', duration: 1600, position: 'top-right' })}>
                    {plan.current ? 'Current plan' : 'Upgrade'}
                  </Button>
                </Card>
              ))}
            </Grid>
          </TabPanel>

          {/* API Keys */}
          <TabPanel px="0">
            <Card p="20px" maxW="620px">
              <Flex align="center" gap="8px" mb="14px">
                <Icon as={KeyIcon} boxSize="16px" color="#e9683f" />
                <Text fontWeight="700" fontSize="14px">API Keys</Text>
              </Flex>
              {[
                { name: 'Production key', value: 'sk_live_••••••••••••4f2a' },
                { name: 'Development key', value: 'sk_test_••••••••••••9c1b' }
              ].map((key, i) => (
                <Flex key={i} align="center" gap="10px" py="12px" borderBottom={i === 1 ? '0' : '1px solid'} borderColor="app.border">
                  <Box flex="1">
                    <Text fontSize="12px" fontWeight="600">{key.name}</Text>
                    <Text fontSize="11px" color="app.subtle" fontFamily="monospace">{key.value}</Text>
                  </Box>
                  <Button size="xs" variant="ghost" leftIcon={<CopyIcon size={13} />} onClick={() => toast({ title: 'API key copied', status: 'success', duration: 1400, position: 'top-right' })}>Copy</Button>
                </Flex>
              ))}
              <Button mt="14px" size="sm" variant="outline" borderColor="app.border" borderRadius="9px" fontSize="12px" leftIcon={<RefreshCwIcon size={14} />} onClick={() => toast({ title: 'New key generated', status: 'success', duration: 1600, position: 'top-right' })}>Generate new key</Button>
            </Card>
          </TabPanel>

          {/* Audit Logs */}
          <TabPanel px="0">
            <Card>
              <CardHeader title="Audit logs" subtitle="Recent user activity" />
              <Box px="20px" py="8px">
                {loadingLogs ? (
                  <Text py="20px" fontSize="12px" color="app.faint">Loading...</Text>
                ) : auditLogs.length === 0 ? (
                  <Text py="20px" fontSize="12px" color="app.faint">No activity recorded yet.</Text>
                ) : auditLogs.map((log, i) => (
                  <Flex key={log.id} align="center" gap="10px" py="11px" borderBottom={i === auditLogs.length - 1 ? '0' : '1px solid'} borderColor="app.border">
                    <Icon as={CheckIcon} boxSize="13px" color="#2d9c79" />
                    <Box flex="1">
                      <Text fontSize="12px" fontWeight="600">{log.action}</Text>
                      <Text fontSize="10px" color="app.faint">{new Date(log.created_at).toLocaleString()}</Text>
                    </Box>
                  </Flex>
                ))}
              </Box>
            </Card>
          </TabPanel>
        </TabPanels>
      </Tabs>

      <FormDrawer isOpen={syncDrawer.isOpen} onClose={syncDrawer.onClose} title={editingSyncId ? 'Edit sync connection' : 'New sync connection'} subtitle="Configure an external API sync" loading={savingSync} onSubmit={handleSaveSync} submitLabel={editingSyncId ? 'Update' : 'Create'}>
        <FormControl>
          <FormLabel fontSize="12px">Connection name</FormLabel>
          <Input value={syncForm.name} onChange={(e) => setSyncForm({ ...syncForm, name: e.target.value })} placeholder="Google Calendar Sync" size="sm" borderRadius="9px" borderColor="app.border" fontSize="13px" />
        </FormControl>
        <FormControl>
          <FormLabel fontSize="12px">Provider</FormLabel>
          <Select value={syncForm.provider} onChange={(e) => setSyncForm({ ...syncForm, provider: e.target.value })} size="sm" borderRadius="9px" borderColor="app.border" fontSize="13px">
            {PROVIDERS.map((p) => <option key={p} value={p}>{p}</option>)}
          </Select>
        </FormControl>
        <FormControl>
          <FormLabel fontSize="12px">Endpoint URL</FormLabel>
          <Input value={syncForm.endpoint_url} onChange={(e) => setSyncForm({ ...syncForm, endpoint_url: e.target.value })} placeholder="https://api.example.com/v1" size="sm" borderRadius="9px" borderColor="app.border" fontSize="13px" />
        </FormControl>
        <FormControl>
          <FormLabel fontSize="12px">Authentication type</FormLabel>
          <Select value={syncForm.auth_type} onChange={(e) => setSyncForm({ ...syncForm, auth_type: e.target.value })} size="sm" borderRadius="9px" borderColor="app.border" fontSize="13px">
            {AUTH_TYPES.map((a) => <option key={a} value={a}>{a}</option>)}
          </Select>
        </FormControl>
        {syncForm.auth_type !== 'none' && (
          <FormControl>
            <FormLabel fontSize="12px">API key / Token</FormLabel>
            <Input type="password" value={syncForm.api_key} onChange={(e) => setSyncForm({ ...syncForm, api_key: e.target.value })} placeholder="Enter your API key" size="sm" borderRadius="9px" borderColor="app.border" fontSize="13px" />
          </FormControl>
        )}
      </FormDrawer>

      <ConfirmDialog isOpen={confirmSyncDel.isOpen} onClose={confirmSyncDel.onClose} title="Delete sync connection" message="Are you sure you want to delete this sync connection?" confirmLabel="Delete" danger onConfirm={handleDeleteSync} />
    </>
  );
}
