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
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
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
  CalendarIcon,
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
  const [selected, setSelected] = useState<AuditLog | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
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
    .filter((l) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return l.action.toLowerCase().includes(q) ||
        (l.entity_type ?? '').toLowerCase().includes(q) ||
        (l.ip_address ?? '').toLowerCase().includes(q) ||
        (l.browser ?? '').toLowerCase().includes(q) ||
        (l.device_type ?? '').toLowerCase().includes(q);
    })
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
    exportToCsv('audit-logs.csv', filtered.map((l) => ({
      action: l.action, action_type: l.action_type, entity_type: l.entity_type,
      entity_id: l.entity_id, ip: l.ip_address, device: l.device_type,
      browser: l.browser, os: l.os, created_at: l.created_at,
    })));
    toast({ title: 'Exported to CSV', status: 'success', duration: 1800, position: 'top-right' });
  };

  const getDeviceIcon = (deviceType: string | null) => {
    if (deviceType === 'mobile') return SmartphoneIcon;
    return MonitorIcon;
  };

  const openDetail = (log: AuditLog) => {
    setSelected(log);
    setDetailOpen(true);
  };

  const statCards = [
    { label: 'Total events', value: stats.total, color: '#3355c9' },
    { label: 'Logins', value: stats.logins, color: '#2d9c79' },
    { label: 'Creates', value: stats.creates, color: '#1c8a5c' },
    { label: 'Updates', value: stats.updates, color: '#e9683f' },
    { label: 'Deletes', value: stats.deletes, color: '#c23c3c' },
  ];

  return (
    <>
      <PageHeader
        title="Audit Logs"
        subtitle="Track user activity, logins, CRUD operations with full device and location metadata."
        actions={
          <HStack spacing="6px">
            <Button size="sm" variant="outline" borderColor="app.border" borderRadius="9px" fontSize="12px" leftIcon={<DownloadIcon size={14} />} onClick={handleExport}>Export</Button>
          </HStack>
        } />

      <Box display="grid" gridTemplateColumns={{ base: 'repeat(2, 1fr)', md: 'repeat(5, 1fr)' }} gap="12px" mb="18px">
        {statCards.map((s) => (
          <Card key={s.label} p="15px">
            <Flex align="center" gap="8px">
              <Box w="30px" h="30px" borderRadius="9px" bg={`${s.color}1a`} display="flex" alignItems="center" justifyContent="center">
                <Box w="8px" h="8px" borderRadius="full" bg={s.color} />
              </Box>
              <Box>
                <Text fontSize="10px" color="app.subtle">{s.label}</Text>
                <Text fontSize="20px" fontWeight="800">{s.value}</Text>
              </Box>
            </Flex>
          </Card>
        ))}
      </Box>

      <Card>
        <Flex px={{ base: '14px', md: '20px' }} py="14px" gap="10px" align="center" flexWrap="wrap" borderBottom="1px solid" borderColor="app.border">
          <InputGroup maxW="260px" size="sm">
            <InputLeftElement pointerEvents="none"><FilterIcon size={14} color="app.faint" /></InputLeftElement>
            <Input placeholder="Search actions, IP, browser..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} borderRadius="9px" bg="app.surfaceAlt" borderColor="app.border" fontSize="12px" />
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
                    <Tr key={log.id} _hover={{ bg: 'app.surfaceAlt' }} cursor="pointer" onClick={() => openDetail(log)}>
                      <Td borderColor="app.border">
                        <Flex align="center" gap="8px">
                          <Box w="28px" h="28px" borderRadius="8px" bg={`${color}1a`} display="flex" alignItems="center" justifyContent="center" flexShrink={0}>
                            <Box w="6px" h="6px" borderRadius="full" bg={color} />
                          </Box>
                          <Box>
                            <Text fontSize="12px" fontWeight="600">{log.action}</Text>
                            {(log.action_type || log.action) && (
                              <Badge fontSize="8px" borderRadius="full" px="5px" py="1px" bg={`${color}1a`} color={color} textTransform="none">{log.action_type ?? log.action}</Badge>
                            )}
                          </Box>
                        </Flex>
                      </Td>
                      <Td borderColor="app.border" display={{ base: 'none', md: 'table-cell' }} fontSize="12px" color="app.subtle" maxW="220px" whiteSpace="nowrap" overflow="hidden" textOverflow="ellipsis" title={log.entity_id ?? undefined}>{log.entity_type ?? '—'}{log.entity_id ? ` · ${log.entity_id}` : ''}</Td>
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

      {/* Detail Modal */}
      <Modal isOpen={detailOpen} onClose={() => setDetailOpen(false)} size="md" isCentered>
        <ModalOverlay backdropFilter="blur(4px)" />
        <ModalContent bg="app.surface" borderRadius="16px" overflow="hidden">
          {selected && (() => {
            const type = selected.action_type ?? selected.action;
            const color = actionColor[type] ?? '#6b7488';
            const DeviceIcon = getDeviceIcon(selected.device_type);
            return (
              <>
                <ModalHeader borderBottom="1px solid" borderColor="app.border" pb="14px">
                  <Flex align="center" gap="10px">
                    <Flex w="36px" h="36px" borderRadius="10px" bg={`${color}1a`} align="center" justify="center">
                      <Box w="10px" h="10px" borderRadius="full" bg={color} />
                    </Flex>
                    <Box>
                      <Text fontSize="15px" fontWeight="800">{selected.action}</Text>
                      <Badge fontSize="9px" borderRadius="full" px="6px" py="1px" bg={`${color}1a`} color={color} textTransform="none">{type}</Badge>
                    </Box>
                  </Flex>
                </ModalHeader>
                <ModalCloseButton />
                <ModalBody py="16px">
                  <Box p="14px" bg="app.surfaceAlt" borderRadius="10px" mb="12px">
                    <Text fontSize="10px" color="app.faint" mb="8px" letterSpacing="0.06em">ENTITY</Text>
                    <Flex align="center" gap="8px">
                      <Text fontSize="12px" fontWeight="600">{selected.entity_type ?? '—'}</Text>
                      {selected.entity_id && <Text fontSize="11px" color="app.faint">ID: {selected.entity_id.slice(0, 12)}</Text>}
                    </Flex>
                  </Box>

                  <Grid templateColumns="1fr 1fr" gap="10px" mb="12px">
                    <Box p="12px" bg="app.surfaceAlt" borderRadius="10px">
                      <Flex align="center" gap="6px" mb="4px"><Icon as={GlobeIcon} boxSize="12px" color="app.faint" /><Text fontSize="9px" color="app.faint" letterSpacing="0.06em">IP ADDRESS</Text></Flex>
                      <Text fontSize="12px" fontWeight="600">{selected.ip_address ?? '—'}</Text>
                    </Box>
                    <Box p="12px" bg="app.surfaceAlt" borderRadius="10px">
                      <Flex align="center" gap="6px" mb="4px"><Icon as={DeviceIcon} boxSize="12px" color="app.faint" /><Text fontSize="9px" color="app.faint" letterSpacing="0.06em">DEVICE</Text></Flex>
                      <Text fontSize="12px" fontWeight="600">{selected.device_type ?? '—'}</Text>
                      {selected.os && <Text fontSize="10px" color="app.faint">{selected.os}</Text>}
                    </Box>
                  </Grid>

                  <Box p="12px" bg="app.surfaceAlt" borderRadius="10px" mb="12px">
                    <Text fontSize="9px" color="app.faint" letterSpacing="0.06em" mb="4px">BROWSER</Text>
                    <Text fontSize="12px" fontWeight="600">{selected.browser ?? '—'}</Text>
                  </Box>

                  {selected.user_agent && (
                    <Box p="12px" bg="app.surfaceAlt" borderRadius="10px" mb="12px">
                      <Text fontSize="9px" color="app.faint" letterSpacing="0.06em" mb="4px">USER AGENT</Text>
                      <Text fontSize="10px" color="app.subtle" fontFamily="monospace" wordBreak="break-all" lineHeight="1.4">{selected.user_agent}</Text>
                    </Box>
                  )}

                  {selected.metadata && Object.keys(selected.metadata).length > 0 && (
                    <Box p="12px" bg="app.surfaceAlt" borderRadius="10px" mb="12px">
                      <Text fontSize="9px" color="app.faint" letterSpacing="0.06em" mb="8px">METADATA ({Object.keys(selected.metadata).length} fields)</Text>
                      <Box as="pre" fontSize="10px" color="app.subtle" fontFamily="monospace" whiteSpace="pre-wrap" wordBreak="break-all" lineHeight="1.4" m="0">
                        {JSON.stringify(selected.metadata, null, 2)}
                      </Box>
                    </Box>
                  )}

                  <Flex justify="space-between" align="center" p="12px" bg="app.surfaceAlt" borderRadius="10px">
                    <Flex align="center" gap="6px"><Icon as={CalendarIcon} boxSize="12px" color="app.faint" /><Text fontSize="10px" color="app.faint" letterSpacing="0.06em">TIMESTAMP</Text></Flex>
                    <Text fontSize="11px" fontWeight="600">{new Date(selected.created_at).toLocaleString()}</Text>
                  </Flex>
                </ModalBody>
              </>
            );
          })()}
        </ModalContent>
      </Modal>
    </>
  );
}
