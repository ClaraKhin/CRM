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
  Switch,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Text,
  useToast } from
'@chakra-ui/react';
import { CheckIcon, CopyIcon, KeyIcon, RefreshCwIcon } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Card, CardHeader } from '../components/ui/Card';
import { StatusBadge } from '../components/ui/StatusBadge';
import { supabase, ROLE_LABELS, type UserRole } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

const ROLE_OPTIONS = Object.entries(ROLE_LABELS).map(([value, label]) => ({ value, label }));

const plans = [
  { name: 'Starter', price: '$0', current: false },
  { name: 'Growth', price: '$49', current: true },
  { name: 'Enterprise', price: 'Custom', current: false }
];

export function Settings() {
  const toast = useToast();
  const { session, profile, refreshProfile } = useAuth();
  const [mcpServers, setMcpServers] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ full_name: profile?.full_name ?? '', email: profile?.email ?? '' });

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

  useEffect(() => { loadMcp(); loadLogs(); }, [loadMcp, loadLogs]);

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

  return (
    <>
      <PageHeader title="Settings" subtitle="Manage your workspace, team, and integrations." />

      <Tabs colorScheme="orange" variant="soft-rounded">
        <TabList overflowX="auto" pb="4px" gap="4px">
          {['Profile', 'Team & Roles', 'Integrations', 'Notifications', 'Billing', 'API Keys', 'Audit Logs'].map((t) => (
            <Tab key={t} fontSize="12px" fontWeight="600" whiteSpace="nowrap" _selected={{ bg: 'brand.50', color: 'brand.600' }}>{t}</Tab>
          ))}
        </TabList>

        <TabPanels mt="14px">
          {/* Profile */}
          <TabPanel px="0">
            <Card p="22px" maxW="560px">
              <Flex align="center" gap="14px" mb="20px">
                <Avatar size="lg" name={profile?.full_name ?? 'CRM User'} bg={profile?.avatar_color ?? '#ffdccb'} color="#b6451e" />
                <Box>
                  <Text fontWeight="700" fontSize="15px">{profile?.full_name ?? 'CRM User'}</Text>
                  <Text fontSize="12px" color="app.subtle">{profile ? ROLE_LABELS[profile.role] : 'Sales Executive'}</Text>
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
    </>
  );
}
