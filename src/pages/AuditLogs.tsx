import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Badge,
  Box,
  Button,
  Flex,
  HStack,
  Icon,
  Input,
  InputGroup,
  InputLeftElement,
  Select,
  Spinner,
  Table,
  TableContainer,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  useToast } from '@chakra-ui/react';
import {
  ActivityIcon,
  DownloadIcon,
  FilterIcon,
  GlobeIcon,
  MonitorIcon,
  SmartphoneIcon,
  UserIcon } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Card, CardHeader } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { Pagination } from '../components/ui/Pagination';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { exportToCsv } from '../lib/crud';

type AuditLog = {
  id: string;
  user_id: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  action_type: string | null;
  metadata: any;
  created_at: string;
  ip_address: string | null;
  user_agent: string | null;
  device_type: string | null;
  browser: string | null;
  os: string | null;
};

const ACTION_TYPES = ['All', 'login', 'logout', 'signup', 'password_reset', 'create', 'update', 'delete', 'read', 'export'];

const actionColor: Record<string, string> = {
  login: '#2d9c79', logout: '#6b7488', signup: '#3355c9', password_reset: '#b5760f',
  create: '#1c8a5c', update: '#e9683f', delete: '#c23c3c', read: '#8374d9', export: '#d85a9a',
};

export function AuditLogs() {
  const { session } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('All');
  const [page, setPage] = useState(0);
  const pageSize = 15;
  const toast = useToast();

  const load = useCallback(async () => {
    if (!session?.user) return;
    setLoading(true);
    const { data } = await supabase.from('audit_logs').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false }).limit(200);
    setLogs((data ?? []) as AuditLog[]);
    setLoading(false);
  }, [session]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => logs
    .filter((l) => actionFilter === 'All' || l.action_type === actionFilter || l.action === actionFilter)
    .filter((l) => !search || l.action.toLowerCase().includes(search.toLowerCase()) || (l.entity_type ?? '').toLowerCase().includes(search.toLowerCase()))
  , [logs, search, actionFilter]);

  const paged = filtered.slice(page * pageSize, (page + 1) * pageSize);

  const stats = useMemo(() => {
    const logins = logs.filter((l) => l.action_type === 'login' || l.action === 'login').length;
    const creates = logs.filter((l) => l.action_type === 'create' || l.action === 'create').length;
    const updates = logs.filter((l) => l.action_type === 'update' || l.action === 'update').length;
    const deletes = logs.filter((l) => l.action_type === 'delete' || l.action === 'delete').length;
    return { total: logs.length, logins, creates, updates, deletes };
  }, [logs]);

  const handleExport = () => {
    exportToCsv('audit-logs.csv', filtered.map((l) => ({ action: l.action, action_type: l.action_type, entity_type: l.entity_type, entity_id: l.entity_id, ip: l.ip_address, device: l.device_type, browser: l.browser, os: l.os, created_at: l.created_at })));
    toast({ title: 'Exported to CSV', status: 'success', duration: 1800, position: 'top-right' });
  };

  const getDeviceIcon = (deviceType: string | null) => {
    if (deviceType === 'mobile') return SmartphoneIcon;
    return MonitorIcon;
  };

  return (
    <>
      <PageHeader
        title="Audit Logs"
        subtitle="Track user activity, logins, and CRUD operations."
        actions={
          <Button size="sm" variant="outline" borderColor="app.border" borderRadius="9px" fontSize="12px" leftIcon={<DownloadIcon size={14} />} onClick={handleExport}>Export</Button>
        } />

      <Box
        display="grid"
        gridTemplateColumns={{ base: 'repeat(2, 1fr)', md: 'repeat(5, 1fr)' }}
        gap="12px" mb="18px">
        {[
          { label: 'Total events', value: stats.total, color: '#3355c9' },
          { label: 'Logins', value: stats.logins, color: '#2d9c79' },
          { label: 'Creates', value: stats.creates, color: '#1c8a5c' },
          { label: 'Updates', value: stats.updates, color: '#e9683f' },
          { label: 'Deletes', value: stats.deletes, color: '#c23c3c' },
        ].map((s) => (
          <Card key={s.label} p="14px">
            <Flex align="center" gap="6px">
              <Box w="7px" h="7px" borderRadius="full" bg={s.color} />
              <Text fontSize="10px" color="app.subtle">{s.label}</Text>
            </Flex>
            <Text mt="5px" fontSize="22px" fontWeight="800">{s.value}</Text>
          </Card>
        ))}
      </Box>

      <Card>
        <Flex px={{ base: '14px', md: '20px' }} py="14px" gap="10px" align="center" flexWrap="wrap" borderBottom="1px solid" borderColor="app.border">
          <InputGroup maxW="260px" size="sm">
            <InputLeftElement pointerEvents="none"><FilterIcon size={14} color="#8a93a6" /></InputLeftElement>
            <Input placeholder="Search actions..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} borderRadius="9px" bg="app.surfaceAlt" borderColor="app.border" fontSize="12px" />
          </InputGroup>
          <Select size="sm" maxW="160px" value={actionFilter} onChange={(e) => { setActionFilter(e.target.value); setPage(0); }} borderRadius="9px" borderColor="app.border" fontSize="12px">
            {ACTION_TYPES.map((t) => <option key={t} value={t}>{t === 'All' ? 'All actions' : t}</option>)}
          </Select>
          <Text ml="auto" fontSize="12px" color="app.subtle">{filtered.length} events</Text>
        </Flex>

        {loading ? (
          <Flex py="60px" justify="center"><Spinner color="brand.500" /></Flex>
        ) : paged.length === 0 ? (
          <EmptyState icon={ActivityIcon} title="No audit logs found" description="User activity will appear here as it occurs." />
        ) : (
          <TableContainer>
            <Table size="sm">
              <Thead>
                <Tr>
                  <Th borderColor="app.border" fontSize="10px" color="app.faint">Action</Th>
                  <Th borderColor="app.border" fontSize="10px" color="app.faint" display={{ base: 'none', md: 'table-cell' }}>Entity</Th>
                  <Th borderColor="app.border" fontSize="10px" color="app.faint" display={{ base: 'none', lg: 'table-cell' }}>IP Address</Th>
                  <Th borderColor="app.border" fontSize="10px" color="app.faint" display={{ base: 'none', lg: 'table-cell' }}>Device</Th>
                  <Th borderColor="app.border" fontSize="10px" color="app.faint" display={{ base: 'none', lg: 'table-cell' }}>Browser</Th>
                  <Th borderColor="app.border" fontSize="10px" color="app.faint">Timestamp</Th>
                </Tr>
              </Thead>
              <Tbody>
                {paged.map((log) => {
                  const type = log.action_type ?? log.action;
                  const color = actionColor[type] ?? '#6b7488';
                  const DeviceIcon = getDeviceIcon(log.device_type);
                  return (
                    <Tr key={log.id} _hover={{ bg: 'app.surfaceAlt' }}>
                      <Td borderColor="app.border">
                        <Flex align="center" gap="8px">
                          <Box w="6px" h="6px" borderRadius="full" bg={color} flexShrink={0} />
                          <Box>
                            <Text fontSize="12px" fontWeight="600">{log.action}</Text>
                            {(log.action_type || log.action) && (
                              <Badge fontSize="8px" borderRadius="full" px="5px" py="1px" bg={`${color}1a`} color={color} textTransform="none">{log.action_type ?? log.action}</Badge>
                            )}
                          </Box>
                        </Flex>
                      </Td>
                      <Td borderColor="app.border" display={{ base: 'none', md: 'table-cell' }} fontSize="12px" color="app.subtle">{log.entity_type ?? '—'}{log.entity_id ? `:${log.entity_id.slice(0, 8)}` : ''}</Td>
                      <Td borderColor="app.border" display={{ base: 'none', lg: 'table-cell' }}>
                        <Flex align="center" gap="6px">
                          <Icon as={GlobeIcon} boxSize="11px" color="app.faint" />
                          <Text fontSize="11px" color="app.subtle">{log.ip_address ?? '—'}</Text>
                        </Flex>
                      </Td>
                      <Td borderColor="app.border" display={{ base: 'none', lg: 'table-cell' }}>
                        <Flex align="center" gap="6px">
                          <Icon as={DeviceIcon} boxSize="11px" color="app.faint" />
                          <Text fontSize="11px" color="app.subtle">{log.device_type ?? '—'}{log.os ? ` · ${log.os}` : ''}</Text>
                        </Flex>
                      </Td>
                      <Td borderColor="app.border" display={{ base: 'none', lg: 'table-cell' }} fontSize="11px" color="app.subtle">{log.browser ?? '—'}</Td>
                      <Td borderColor="app.border" fontSize="11px" color="app.faint">{new Date(log.created_at).toLocaleString()}</Td>
                    </Tr>
                  );
                })}
              </Tbody>
            </Table>
          </TableContainer>
        )}
        {!loading && filtered.length > 0 && (
          <Pagination page={page} pageSize={pageSize} total={filtered.length} onPageChange={setPage} />
        )}
      </Card>
    </>
  );
}
