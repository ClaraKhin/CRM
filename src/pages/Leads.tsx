import React, { useEffect, useState } from 'react';
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
  InputGroup,
  InputLeftElement,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
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
  useToast } from
'@chakra-ui/react';
import {
  CalendarPlusIcon,
  CheckCircleIcon,
  CopyIcon,
  DownloadIcon,
  FlameIcon,
  MailIcon,
  MoreHorizontalIcon,
  PhoneIcon,
  PlusIcon,
  SearchIcon,
  Trash2Icon,
  TrendingUpIcon,
  UserPlusIcon,
  UsersRoundIcon } from
'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { StatusBadge } from '../components/ui/StatusBadge';
import { ScoreBadge } from '../components/ui/ScoreBadge';
import { EmptyState } from '../components/ui/EmptyState';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { FormDrawer } from '../components/ui/FormDrawer';
import { Pagination } from '../components/ui/Pagination';
import { useCrudList, useCrudMutation, exportToCsv } from '../lib/crud';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

type Person = { id: string; name: string; email: string; phone: string; company: string; avatar_color: string };
type Lead = {
  id: string;
  person_id: string | null;
  source: string;
  score: number;
  ai_score: number;
  status: string;
  owner_id: string;
  owner_name: string;
  value: number;
  follow_up_date: string | null;
  created_at: string;
};

const STATUS_OPTIONS = ['New', 'Contacted', 'Qualified', 'Proposal', 'Won', 'Lost', 'Unqualified'];
const SOURCE_OPTIONS = ['Website', 'Facebook', 'Google Ads', 'Referral', 'Walk-in', 'Event', 'Manual'];
const OWNERS = [
  { id: 'o1', name: 'Renee Walker', color: '#ffdccb' },
  { id: 'o2', name: 'Marcus Chen', color: '#d8e7ff' },
  { id: 'o3', name: 'Priya Nair', color: '#eadbff' },
  { id: 'o4', name: 'Diego Alvarez', color: '#c9f0e3' }
];
const sourceIcon: Record<string, string> = { Website: '🌐', Facebook: '📘', 'Google Ads': '🔍', Referral: '🤝', 'Walk-in': '🚶', Event: '📅', Manual: '✏️' };
const statusFlow: Record<string, string> = { New: '#6c7aea', Contacted: '#4f9de0', Qualified: '#2d9c79', Proposal: '#f0a13c', Won: '#1c8a5c', Lost: '#c23c3c', Unqualified: '#6b7488' };

export function Leads() {
  const toast = useToast();
  const { session } = useAuth();
  const [people, setPeople] = useState<Person[]>([]);
  const list = useCrudList<Lead>('leads', {
    pageSize: 10,
    searchFields: ['source', 'owner_name', 'status'],
    defaultSort: { key: 'created_at', dir: 'desc' }
  });
  const mutation = useCrudMutation<Lead>('leads', { onSuccess: list.refetch });
  const formDrawer = useDisclosure();
  const confirmDel = useDisclosure();
  const confirmBulk = useDisclosure();
  const detailModal = useDisclosure();
  const [editing, setEditing] = useState<Lead | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [detailLead, setDetailLead] = useState<Lead | null>(null);

  const [form, setForm] = useState({
    name: '', email: '', phone: '', company: '',
    source: 'Website', status: 'New', owner_id: 'o1', value: 0, follow_up_date: ''
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!session?.user) return;
    (async () => {
      const { data } = await supabase.from('people').select('*').eq('user_id', session.user.id);
      setPeople((data ?? []) as Person[]);
    })();
  }, [session]);

  const personById = (id: string | null) => people.find((p) => p.id === id) ?? null;
  const ownerById = (id: string) => OWNERS.find((o) => o.id === id) ?? OWNERS[0];

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', email: '', phone: '', company: '', source: 'Website', status: 'New', owner_id: 'o1', value: 0, follow_up_date: '' });
    setFormErrors({});
    formDrawer.onOpen();
  };

  const openEdit = (lead: Lead) => {
    const p = personById(lead.person_id);
    setEditing(lead);
    setForm({
      name: p?.name ?? '', email: p?.email ?? '', phone: p?.phone ?? '', company: p?.company ?? '',
      source: lead.source, status: lead.status, owner_id: lead.owner_id, value: lead.value,
      follow_up_date: lead.follow_up_date ?? ''
    });
    setFormErrors({});
    formDrawer.onOpen();
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Name is required';
    if (!form.company.trim()) e.company = 'Company is required';
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Invalid email';
    setFormErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    const owner = ownerById(form.owner_id);

    if (editing) {
      if (editing.person_id) {
        await supabase.from('people').update({
          name: form.name, email: form.email, phone: form.phone, company: form.company
        }).eq('id', editing.person_id);
      }
      const { error } = await mutation.update(editing.id, {
        source: form.source, status: form.status, owner_id: form.owner_id, owner_name: owner.name,
        value: Number(form.value), follow_up_date: form.follow_up_date || null
      });
      if (error) { toast({ title: 'Update failed', description: error, status: 'error', duration: 3000, position: 'top-right' }); return; }
      toast({ title: 'Lead updated', status: 'success', duration: 2000, position: 'top-right' });
    } else {
      const { data: person } = await supabase.from('people').insert({
        user_id: session!.user.id, name: form.name, email: form.email, phone: form.phone, company: form.company,
        avatar_color: ['#d8e7ff', '#eadbff', '#c9f0e3', '#ffe0ee', '#f9dfbe', '#e0dcff'][Math.floor(Math.random() * 6)]
      }).select().maybeSingle();
      const aiScore = Math.min(100, Math.max(0, Number(form.value) > 20000 ? 85 : 60 + Math.floor(Math.random() * 20)));
      const { error } = await mutation.insert({
        person_id: person?.id ?? null, source: form.source, score: 50, ai_score: aiScore,
        status: form.status, owner_id: form.owner_id, owner_name: owner.name,
        value: Number(form.value), follow_up_date: form.follow_up_date || null
      });
      if (error) { toast({ title: 'Create failed', description: error, status: 'error', duration: 3000, position: 'top-right' }); return; }
      toast({ title: 'Lead created', status: 'success', duration: 2000, position: 'top-right' });
    }
    formDrawer.onClose();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await mutation.remove(deleteId);
    if (error) { toast({ title: 'Delete failed', description: error, status: 'error', duration: 3000, position: 'top-right' }); return; }
    toast({ title: 'Lead deleted', status: 'success', duration: 2000, position: 'top-right' });
    confirmDel.onClose();
    setDeleteId(null);
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(list.selectedIds);
    const { error } = await mutation.removeMany(ids);
    if (error) { toast({ title: 'Bulk delete failed', description: error, status: 'error', duration: 3000, position: 'top-right' }); return; }
    toast({ title: `${ids.length} leads deleted`, status: 'success', duration: 2000, position: 'top-right' });
    list.clearSelection();
    confirmBulk.onClose();
  };

  const handleExport = () => {
    const rows = list.data.map((l) => {
      const p = personById(l.person_id);
      return { name: p?.name ?? '', company: p?.company ?? '', email: p?.email ?? '', source: l.source, score: l.score, ai_score: l.ai_score, status: l.status, owner: l.owner_name, value: l.value, follow_up: l.follow_up_date ?? '', created: l.created_at };
    });
    exportToCsv('leads.csv', rows);
    toast({ title: 'Exported to CSV', status: 'success', duration: 1800, position: 'top-right' });
  };

  const qualifyLead = async (lead: Lead) => {
    await mutation.update(lead.id, { status: 'Qualified' });
    toast({ title: 'Lead qualified', status: 'success', duration: 1800, position: 'top-right' });
    list.refetch();
  };

  const checkDuplicate = (lead: Lead) => {
    const p = personById(lead.person_id);
    if (!p) return false;
    return people.filter((pp) => pp.email && p.email && pp.email === p.email).length > 1;
  };

  return (
    <>
      <PageHeader
        title="Leads"
        subtitle="Track, score, and qualify inbound leads."
        actions={
          <HStack spacing="6px">
            <Button size="sm" variant="outline" borderColor="app.border" borderRadius="9px" fontSize="12px" leftIcon={<DownloadIcon size={14} />} onClick={handleExport}>Export</Button>
            <Button size="sm" borderRadius="9px" bg="navy.600" color="white" _hover={{ bg: 'navy.500' }} leftIcon={<PlusIcon size={15} />} fontSize="12px" onClick={openCreate}>New lead</Button>
          </HStack>
        } />

      <Card>
        <Flex px={{ base: '14px', md: '20px' }} py="14px" gap="10px" align="center" flexWrap="wrap" borderBottom="1px solid" borderColor="app.border">
          <InputGroup maxW="280px" size="sm">
            <InputLeftElement pointerEvents="none"><SearchIcon size={15} color="#8a93a6" /></InputLeftElement>
            <Input placeholder="Search leads..." value={list.search} onChange={(e) => { list.setSearch(e.target.value); list.setPage(0); }} borderRadius="9px" bg="app.surfaceAlt" borderColor="app.border" fontSize="12px" />
          </InputGroup>
          <Select size="sm" maxW="160px" value={list.filter.status ?? 'All'} onChange={(e) => { list.setFilter({ ...list.filter, status: e.target.value }); list.setPage(0); }} borderRadius="9px" borderColor="app.border" fontSize="12px">
            <option value="All">All statuses</option>
            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>
          {list.selectedIds.size > 0 && (
            <Button size="sm" variant="outline" borderColor="#c23c3c" color="#c23c3c" borderRadius="9px" fontSize="12px" leftIcon={<Trash2Icon size={14} />} onClick={confirmBulk.onOpen}>
              Delete ({list.selectedIds.size})
            </Button>
          )}
          <Text ml="auto" fontSize="12px" color="app.subtle">{list.total} leads</Text>
        </Flex>

        {list.loading ? (
          <Flex py="60px" justify="center"><Spinner color="brand.500" /></Flex>
        ) : list.data.length === 0 ? (
          <EmptyState icon={UsersRoundIcon} title="No leads found" description="Try adjusting your search or create a new lead." action={<Button size="sm" bg="navy.600" color="white" borderRadius="9px" fontSize="12px" leftIcon={<PlusIcon size={15} />} onClick={openCreate}>New lead</Button>} />
        ) : (
          <TableContainer>
            <Table size="sm" variant="simple">
              <Thead>
                <Tr>
                  <Th borderColor="app.border" fontSize="10px" color="app.faint" w="36px">
                    <Checkbox isChecked={list.selectedIds.size === list.data.length && list.data.length > 0} onChange={list.toggleSelectAll} colorScheme="orange" />
                  </Th>
                  <Th borderColor="app.border" fontSize="10px" color="app.faint">Lead</Th>
                  <Th borderColor="app.border" fontSize="10px" color="app.faint" display={{ base: 'none', md: 'table-cell' }}>Source</Th>
                  <Th borderColor="app.border" fontSize="10px" color="app.faint">AI Score</Th>
                  <Th borderColor="app.border" fontSize="10px" color="app.faint">Status</Th>
                  <Th borderColor="app.border" fontSize="10px" color="app.faint" display={{ base: 'none', lg: 'table-cell' }}>Owner</Th>
                  <Th borderColor="app.border" fontSize="10px" color="app.faint" isNumeric>Value</Th>
                  <Th borderColor="app.border" w="40px"></Th>
                </Tr>
              </Thead>
              <Tbody>
                {list.data.map((lead) => {
                  const person = personById(lead.person_id);
                  const owner = ownerById(lead.owner_id);
                  const dup = checkDuplicate(lead);
                  return (
                    <Tr key={lead.id} _hover={{ bg: 'app.surfaceAlt' }} cursor="pointer" onClick={() => { setDetailLead(lead); detailModal.onOpen(); }}>
                      <Td borderColor="app.border" onClick={(e) => e.stopPropagation()}>
                        <Checkbox isChecked={list.selectedIds.has(lead.id)} onChange={() => list.toggleSelect(lead.id)} colorScheme="orange" />
                      </Td>
                      <Td borderColor="app.border">
                        <Flex align="center" gap="10px">
                          <Avatar size="sm" name={person?.name ?? '?'} bg={person?.avatar_color ?? '#d8e7ff'} color="#46506a" fontSize="10px" />
                          <Box>
                            <Flex align="center" gap="5px">
                              <Text fontSize="12px" fontWeight="700">{person?.name ?? 'Unknown'}</Text>
                              {dup && <Icon as={CopyIcon} size={12} color="#b5760f" />}
                            </Flex>
                            <Text fontSize="10px" color="app.subtle">{person?.company ?? ''}</Text>
                          </Box>
                        </Flex>
                      </Td>
                      <Td borderColor="app.border" display={{ base: 'none', md: 'table-cell' }}>
                        <Flex align="center" gap="6px">
                          <Text fontSize="12px">{sourceIcon[lead.source] ?? '📌'}</Text>
                          <Text fontSize="11px" color="app.subtle">{lead.source}</Text>
                        </Flex>
                      </Td>
                      <Td borderColor="app.border">
                        <ScoreBadge score={lead.ai_score} />
                      </Td>
                      <Td borderColor="app.border">
                        <Flex align="center" gap="6px">
                          <Box w="6px" h="6px" borderRadius="full" bg={statusFlow[lead.status] ?? '#6b7488'} flexShrink={0} />
                          <StatusBadge status={lead.status} />
                        </Flex>
                      </Td>
                      <Td borderColor="app.border" display={{ base: 'none', lg: 'table-cell' }}>
                        <HStack spacing="7px">
                          <Avatar size="2xs" name={owner.name} bg={owner.color} color="#46506a" fontSize="8px" />
                          <Text fontSize="11px">{lead.owner_name}</Text>
                        </HStack>
                      </Td>
                      <Td borderColor="app.border" isNumeric fontSize="12px" fontWeight="700">${(lead.value ?? 0).toLocaleString()}</Td>
                      <Td borderColor="app.border" onClick={(e) => e.stopPropagation()}>
                        <Menu placement="bottom-end">
                          <MenuButton as={IconButton} aria-label="Lead actions" icon={<MoreHorizontalIcon size={15} />} variant="ghost" size="xs" />
                          <MenuList bg="app.surface" borderColor="app.border">
                            <MenuItem bg="app.surface" fontSize="12px" icon={<UserPlusIcon size={14} />} onClick={() => openEdit(lead)}>Edit lead</MenuItem>
                            <MenuItem bg="app.surface" fontSize="12px" icon={<CheckCircleIcon size={14} />} onClick={() => qualifyLead(lead)}>Qualify</MenuItem>
                            <MenuItem bg="app.surface" fontSize="12px" icon={<CalendarPlusIcon size={14} />} onClick={async () => {
                              const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
                              await mutation.update(lead.id, { follow_up_date: tomorrow.toISOString().split('T')[0] });
                              toast({ title: 'Follow-up scheduled', status: 'success', duration: 1800, position: 'top-right' });
                            }}>Schedule follow-up</MenuItem>
                            <MenuItem bg="app.surface" fontSize="12px" color="#c23c3c" icon={<Trash2Icon size={14} />} onClick={() => { setDeleteId(lead.id); confirmDel.onOpen(); }}>Delete</MenuItem>
                          </MenuList>
                        </Menu>
                      </Td>
                    </Tr>
                  );
                })}
              </Tbody>
            </Table>
            <Pagination page={list.page} pageSize={list.pageSize} total={list.total} onPageChange={list.setPage} />
          </TableContainer>
        )}
      </Card>

      <FormDrawer isOpen={formDrawer.isOpen} onClose={formDrawer.onClose} title={editing ? 'Edit lead' : 'New lead'} subtitle={editing ? 'Update lead information' : 'Capture a new inbound lead'} loading={mutation.loading} onSubmit={handleSubmit} submitLabel={editing ? 'Update' : 'Create'}>
        <FormControl isInvalid={!!formErrors.name}>
          <FormLabel fontSize="12px">Contact name</FormLabel>
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ava Williams" size="sm" borderRadius="9px" borderColor="app.border" fontSize="13px" />
          {formErrors.name && <Text fontSize="11px" color="#c23c3c" mt="4px">{formErrors.name}</Text>}
        </FormControl>
        <FormControl isInvalid={!!formErrors.company}>
          <FormLabel fontSize="12px">Company</FormLabel>
          <Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} placeholder="Lattice Labs" size="sm" borderRadius="9px" borderColor="app.border" fontSize="13px" />
          {formErrors.company && <Text fontSize="11px" color="#c23c3c" mt="4px">{formErrors.company}</Text>}
        </FormControl>
        <FormControl isInvalid={!!formErrors.email}>
          <FormLabel fontSize="12px">Email</FormLabel>
          <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="ava@company.com" size="sm" borderRadius="9px" borderColor="app.border" fontSize="13px" />
          {formErrors.email && <Text fontSize="11px" color="#c23c3c" mt="4px">{formErrors.email}</Text>}
        </FormControl>
        <FormControl>
          <FormLabel fontSize="12px">Phone</FormLabel>
          <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+1 415 220 1188" size="sm" borderRadius="9px" borderColor="app.border" fontSize="13px" />
        </FormControl>
        <FormControl>
          <FormLabel fontSize="12px">Source</FormLabel>
          <Select value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} size="sm" borderRadius="9px" borderColor="app.border" fontSize="13px">
            {SOURCE_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>
        </FormControl>
        <FormControl>
          <FormLabel fontSize="12px">Status</FormLabel>
          <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} size="sm" borderRadius="9px" borderColor="app.border" fontSize="13px">
            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>
        </FormControl>
        <FormControl>
          <FormLabel fontSize="12px">Owner</FormLabel>
          <Select value={form.owner_id} onChange={(e) => setForm({ ...form, owner_id: e.target.value })} size="sm" borderRadius="9px" borderColor="app.border" fontSize="13px">
            {OWNERS.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
          </Select>
        </FormControl>
        <FormControl>
          <FormLabel fontSize="12px">Deal value ($)</FormLabel>
          <Input type="number" value={form.value} onChange={(e) => setForm({ ...form, value: Number(e.target.value) })} placeholder="18500" size="sm" borderRadius="9px" borderColor="app.border" fontSize="13px" />
        </FormControl>
        <FormControl>
          <FormLabel fontSize="12px">Follow-up date</FormLabel>
          <Input type="date" value={form.follow_up_date} onChange={(e) => setForm({ ...form, follow_up_date: e.target.value })} size="sm" borderRadius="9px" borderColor="app.border" fontSize="13px" />
        </FormControl>
      </FormDrawer>

      <ConfirmDialog isOpen={confirmDel.isOpen} onClose={confirmDel.onClose} title="Delete lead" message="Are you sure you want to delete this lead?" confirmLabel="Delete" danger loading={mutation.loading} onConfirm={handleDelete} />
      <ConfirmDialog isOpen={confirmBulk.isOpen} onClose={confirmBulk.onClose} title="Delete selected leads" message={`Delete ${list.selectedIds.size} leads?`} confirmLabel="Delete all" danger loading={mutation.loading} onConfirm={handleBulkDelete} />

      {/* Floating lead detail modal */}
      <Modal isOpen={detailModal.isOpen} onClose={detailModal.onClose} size="md" isCentered>
        <ModalOverlay backdropFilter="blur(4px)" />
        <ModalContent bg="app.surface" borderRadius="18px" overflow="hidden">
          <ModalHeader borderBottom="1px solid" borderColor="app.border" pb="14px">
            {detailLead && (() => {
              const p = personById(detailLead.person_id);
              return (
                <Flex align="center" gap="10px">
                  <Avatar size="sm" name={p?.name ?? '?'} bg={p?.avatar_color ?? '#d8e7ff'} color="#46506a" />
                  <Box>
                    <Text fontFamily="'Plus Jakarta Sans', sans-serif" fontWeight="800" fontSize="16px">{p?.name ?? 'Unknown lead'}</Text>
                    <Text fontSize="11px" color="app.subtle">{p?.company ?? '—'}</Text>
                  </Box>
                </Flex>
              );
            })()}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody py="18px">
            {detailLead && (() => {
              const p = personById(detailLead.person_id);
              return (
                <Stack spacing="14px">
                  <Flex gap="8px" flexWrap="wrap">
                    <Flex align="center" gap="6px">
                      <Box w="6px" h="6px" borderRadius="full" bg={statusFlow[detailLead.status] ?? '#6b7488'} />
                      <StatusBadge status={detailLead.status} />
                    </Flex>
                    <Badge fontSize="9px" borderRadius="full" px="8px" py="2px" bg="app.surfaceAlt" color="app.subtle">{sourceIcon[detailLead.source] ?? '📌'} {detailLead.source}</Badge>
                  </Flex>

                  <Grid templateColumns="1fr 1fr" gap="10px">
                    <Box p="14px" bg="app.surfaceAlt" borderRadius="12px">
                      <Text fontSize="10px" color="app.faint">Lead score</Text>
                      <Text mt="4px" fontSize="18px" fontWeight="800">{detailLead.score}/100</Text>
                    </Box>
                    <Box p="14px" bg="app.surfaceAlt" borderRadius="12px">
                      <Text fontSize="10px" color="app.faint">Estimated value</Text>
                      <Text mt="4px" fontSize="18px" fontWeight="800">${(detailLead.value ?? 0).toLocaleString()}</Text>
                    </Box>
                  </Grid>

                  <Box>
                    <Flex justify="space-between" mb="6px">
                      <Text fontSize="11px" color="app.subtle">AI score</Text>
                      <Text fontSize="11px" fontWeight="700">{detailLead.ai_score}/100</Text>
                    </Flex>
                    <Box w="full" h="8px" bg="app.surfaceAlt" borderRadius="full" overflow="hidden">
                      <Box h="full" bg={detailLead.ai_score >= 70 ? '#1c8a5c' : detailLead.ai_score >= 40 ? '#b5760f' : '#c23c3c'} borderRadius="full" style={{ width: `${detailLead.ai_score}%` }} />
                    </Box>
                  </Box>

                  {p && (
                    <Box p="14px" bg="app.surfaceAlt" borderRadius="12px">
                      <Text fontSize="10px" color="app.faint" mb="8px">CONTACT</Text>
                      {p.email && <Flex align="center" gap="6px" mb="4px"><Icon as={MailIcon} boxSize="11px" color="app.faint" /><Text fontSize="11px" color="app.subtle">{p.email}</Text></Flex>}
                      {p.phone && <Flex align="center" gap="6px" mb="4px"><Icon as={PhoneIcon} boxSize="11px" color="app.faint" /><Text fontSize="11px" color="app.subtle">{p.phone}</Text></Flex>}
                    </Box>
                  )}

                  <Grid templateColumns="1fr 1fr" gap="10px">
                    <Box><Text fontSize="10px" color="app.faint">Owner</Text><Text fontSize="12px" fontWeight="600">{detailLead.owner_name || '—'}</Text></Box>
                    <Box><Text fontSize="10px" color="app.faint">Follow-up</Text><Text fontSize="12px" fontWeight="600">{detailLead.follow_up_date ?? '—'}</Text></Box>
                    <Box><Text fontSize="10px" color="app.faint">Created</Text><Text fontSize="12px" fontWeight="600">{new Date(detailLead.created_at ?? '').toLocaleDateString()}</Text></Box>
                    <Box><Text fontSize="10px" color="app.faint">Status</Text><Text fontSize="12px" fontWeight="600">{detailLead.status}</Text></Box>
                  </Grid>

                  <Flex gap="8px" pt="4px">
                    <Button size="sm" flex="1" bg="navy.600" color="white" _hover={{ bg: 'navy.500' }} borderRadius="9px" fontSize="12px" onClick={() => { detailModal.onClose(); openEdit(detailLead); }}>Edit lead</Button>
                    {detailLead.status !== 'Qualified' && detailLead.status !== 'Won' && (
                      <Button size="sm" flex="1" variant="outline" borderColor="app.border" borderRadius="9px" fontSize="12px" leftIcon={<CheckCircleIcon size={13} />} onClick={() => { detailModal.onClose(); qualifyLead(detailLead); }}>Qualify</Button>
                    )}
                  </Flex>
                </Stack>
              );
            })()}
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
}
