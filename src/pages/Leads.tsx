import React, { useEffect, useState } from 'react';
import {
  Avatar,
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
  Text,
  useDisclosure,
  useToast } from
'@chakra-ui/react';
import {
  CalendarPlusIcon,
  CheckCircleIcon,
  CopyIcon,
  DownloadIcon,
  GitMergeIcon,
  MailIcon,
  MoreHorizontalIcon,
  PhoneIcon,
  PlusIcon,
  SearchIcon,
  Trash2Icon,
  UserPlusIcon,
  UsersRoundIcon } from
'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { EmptyState } from '../components/ui/EmptyState';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { FormModal } from '../components/ui/FormModal';
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
  { id: 'o1', name: 'Renee Walker', initials: 'RW', color: '#ffdccb', textColor: '#8c5535' },
  { id: 'o2', name: 'Marcus Chen', initials: 'MC', color: '#d8e7ff', textColor: '#2d4fa3' },
  { id: 'o3', name: 'Priya Nair', initials: 'PN', color: '#eadbff', textColor: '#6b35a8' },
  { id: 'o4', name: 'Diego Alvarez', initials: 'DA', color: '#c9f0e3', textColor: '#1a6b4a' }
];

const sourceConfig: Record<string, { icon: string; color: string; bg: string }> = {
  Website: { icon: '🌐', color: '#3355c9', bg: '#eef2ff' },
  Facebook: { icon: '📘', color: '#1877f2', bg: '#e8f1ff' },
  'Google Ads': { icon: '🔍', color: '#ea4335', bg: '#fef0ef' },
  Referral: { icon: '🤝', color: '#1c8a5c', bg: '#e8f5ee' },
  'Walk-in': { icon: '🚶', color: '#6b7488', bg: '#f0f2f5' },
  Event: { icon: '📅', color: '#b5760f', bg: '#fef3e0' },
  Manual: { icon: '✏️', color: '#6b7488', bg: '#f0f2f5' }
};

const statusConfig: Record<string, { color: string; bg: string; dot: string }> = {
  New: { color: '#3355c9', bg: '#eef2ff', dot: '#6c7aea' },
  Contacted: { color: '#1877f2', bg: '#e8f1ff', dot: '#4f9de0' },
  Qualified: { color: '#1c8a5c', bg: '#e8f5ee', dot: '#2d9c79' },
  Proposal: { color: '#b5760f', bg: '#fef3e0', dot: '#f0a13c' },
  Won: { color: '#1c8a5c', bg: '#d5f0e6', dot: '#1c8a5c' },
  Lost: { color: '#c23c3c', bg: '#fde8e8', dot: '#c23c3c' },
  Unqualified: { color: '#6b7488', bg: '#f0f2f5', dot: '#6b7488' }
};

function ScoreBar({ score }: { score: number }) {
  const color = score >= 80 ? '#1c8a5c' : score >= 60 ? '#b5760f' : score >= 40 ? '#e9683f' : '#c23c3c';
  const bgColor = score >= 80 ? '#e8f5ee' : score >= 60 ? '#fef3e0' : score >= 40 ? '#fff2ec' : '#fde8e8';
  return (
    <Flex align="center" gap="8px">
      <Box w="52px" h="6px" bg={`${color}22`} borderRadius="full" overflow="hidden">
        <Box h="full" borderRadius="full" bg={color} style={{ width: `${score}%` }} transition="width .3s ease" />
      </Box>
      <Box
        minW="36px"
        h="22px"
        borderRadius="6px"
        bg={bgColor}
        display="flex"
        alignItems="center"
        justifyContent="center">
        <Text fontSize="11px" fontWeight="800" color={color}>{score}</Text>
      </Box>
    </Flex>
  );
}

function StatusPill({ status }: { status: string }) {
  const cfg = statusConfig[status] ?? { color: '#6b7488', bg: '#f0f2f5', dot: '#6b7488' };
  return (
    <Flex align="center" gap="5px" px="9px" py="4px" bg={cfg.bg} borderRadius="full" w="fit-content">
      <Box w="6px" h="6px" borderRadius="full" bg={cfg.dot} flexShrink={0} />
      <Text fontSize="11px" fontWeight="600" color={cfg.color}>{status}</Text>
    </Flex>
  );
}

function SourceChip({ source }: { source: string }) {
  const cfg = sourceConfig[source] ?? { icon: '📌', color: '#6b7488', bg: '#f0f2f5' };
  return (
    <Flex align="center" gap="5px">
      <Text fontSize="13px" lineHeight="1">{cfg.icon}</Text>
      <Text fontSize="12px" color="#46506a" fontWeight="500">{source}</Text>
    </Flex>
  );
}

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
  const formModal = useDisclosure();
  const confirmDel = useDisclosure();
  const confirmBulk = useDisclosure();
  const detailModal = useDisclosure();
  const dupModal = useDisclosure();
  const [editing, setEditing] = useState<Lead | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [detailLead, setDetailLead] = useState<Lead | null>(null);
  const [form, setForm] = useState({ name: '', email: '', phone: '', company: '', source: 'Website', status: 'New', owner_id: 'o1', value: 0, follow_up_date: '' });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [duplicates, setDuplicates] = useState<{ key: string; leads: (Lead & { person: Person | null })[] }[]>([]);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    if (!session?.user) return;
    supabase.from('people').select('*').eq('user_id', session.user.id).then(({ data }) => setPeople((data ?? []) as Person[]));
  }, [session]);

  const personById = (id: string | null) => people.find((p) => p.id === id) ?? null;
  const ownerById = (id: string) => OWNERS.find((o) => o.id === id) ?? OWNERS[0];

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', email: '', phone: '', company: '', source: 'Website', status: 'New', owner_id: 'o1', value: 0, follow_up_date: '' });
    setFormErrors({});
    formModal.onOpen();
  };

  const openEdit = (lead: Lead) => {
    const p = personById(lead.person_id);
    setEditing(lead);
    setForm({ name: p?.name ?? '', email: p?.email ?? '', phone: p?.phone ?? '', company: p?.company ?? '', source: lead.source, status: lead.status, owner_id: lead.owner_id, value: lead.value, follow_up_date: lead.follow_up_date ?? '' });
    setFormErrors({});
    formModal.onOpen();
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
      if (editing.person_id) await supabase.from('people').update({ name: form.name, email: form.email, phone: form.phone, company: form.company }).eq('id', editing.person_id);
      const { error } = await mutation.update(editing.id, { source: form.source, status: form.status, owner_id: form.owner_id, owner_name: owner.name, value: Number(form.value), follow_up_date: form.follow_up_date || null });
      if (error) { toast({ title: 'Update failed', description: error, status: 'error', duration: 3000, position: 'top-right' }); return; }
      toast({ title: 'Lead updated', status: 'success', duration: 2000, position: 'top-right' });
    } else {
      const { data: person } = await supabase.from('people').insert({ user_id: session!.user.id, name: form.name, email: form.email, phone: form.phone, company: form.company, avatar_color: ['#d8e7ff', '#eadbff', '#c9f0e3', '#ffe0ee', '#f9dfbe', '#e0dcff'][Math.floor(Math.random() * 6)] }).select().maybeSingle();
      const aiScore = Math.min(100, Math.max(0, Number(form.value) > 20000 ? 85 : 60 + Math.floor(Math.random() * 20)));
      const { error } = await mutation.insert({ person_id: person?.id ?? null, source: form.source, score: 50, ai_score: aiScore, status: form.status, owner_id: form.owner_id, owner_name: owner.name, value: Number(form.value), follow_up_date: form.follow_up_date || null });
      if (error) { toast({ title: 'Create failed', description: error, status: 'error', duration: 3000, position: 'top-right' }); return; }
      toast({ title: 'Lead created', status: 'success', duration: 2000, position: 'top-right' });
    }
    formModal.onClose();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await mutation.remove(deleteId);
    if (error) return;
    toast({ title: 'Lead deleted', status: 'success', duration: 2000, position: 'top-right' });
    confirmDel.onClose(); setDeleteId(null);
  };

  const handleBulkDelete = async () => {
    const { error } = await mutation.removeMany(Array.from(list.selectedIds));
    if (error) return;
    toast({ title: `${list.selectedIds.size} leads deleted`, status: 'success', duration: 2000, position: 'top-right' });
    list.clearSelection(); confirmBulk.onClose();
  };

  const handleExport = () => {
    exportToCsv('leads.csv', list.data.map((l) => { const p = personById(l.person_id); return { name: p?.name ?? '', company: p?.company ?? '', email: p?.email ?? '', source: l.source, ai_score: l.ai_score, status: l.status, owner: l.owner_name, value: l.value }; }));
    toast({ title: 'Exported', status: 'success', duration: 1800, position: 'top-right' });
  };

  const qualifyLead = async (lead: Lead) => {
    await mutation.update(lead.id, { status: 'Qualified' });
    toast({ title: 'Lead qualified', status: 'success', duration: 1800, position: 'top-right' });
    list.refetch();
  };

  const scanDuplicates = async () => {
    setScanning(true);
    const { data: allLeads } = await supabase.from('leads').select('*').eq('user_id', session!.user.id);
    const allPeopleMap = new Map(people.map((p) => [p.id, p]));
    const groups: Record<string, (Lead & { person: Person | null })[]> = {};
    for (const lead of (allLeads ?? []) as Lead[]) {
      const person = lead.person_id ? allPeopleMap.get(lead.person_id) ?? null : null;
      const enrichedLead = { ...lead, person };
      if (person?.email) { const key = `email:${person.email.toLowerCase()}`; (groups[key] ??= []).push(enrichedLead); }
      if (person?.phone) { const key = `phone:${person.phone}`; (groups[key] ??= []).push(enrichedLead); }
      if (person?.company) { const key = `company:${person.company.toLowerCase()}`; (groups[key] ??= []).push(enrichedLead); }
    }
    const dupGroups = Object.entries(groups).filter(([, leads]) => leads.length > 1).map(([key, leads]) => ({ key, leads }));
    setDuplicates(dupGroups);
    setScanning(false);
    dupModal.onOpen();
    toast({ title: `Found ${dupGroups.length} duplicate group${dupGroups.length !== 1 ? 's' : ''}`, status: dupGroups.length > 0 ? 'warning' : 'success', duration: 3000, position: 'top-right' });
  };

  const mergeLeads = async (group: { key: string; leads: (Lead & { person: Person | null })[] }) => {
    if (group.leads.length < 2) return;
    const sorted = [...group.leads].sort((a, b) => (b.ai_score ?? 0) - (a.ai_score ?? 0));
    const master = sorted[0];
    const toDelete = sorted.slice(1).map((l) => l.id);
    await supabase.from('leads').delete().in('id', toDelete).eq('user_id', session!.user.id);
    setDuplicates((prev) => prev.filter((g) => g.key !== group.key));
    list.refetch();
    toast({ title: `Merged ${toDelete.length} duplicate${toDelete.length !== 1 ? 's' : ''} into master record`, status: 'success', duration: 3000, position: 'top-right' });
  };

  const COLS = [
    { key: 'lead', label: 'LEAD', w: 'auto', minW: '200px' },
    { key: 'source', label: 'SOURCE', w: '140px' },
    { key: 'ai_score', label: 'AI SCORE', w: '130px' },
    { key: 'status', label: 'STATUS', w: '140px' },
    { key: 'owner', label: 'OWNER', w: '160px' },
    { key: 'value', label: 'VALUE', w: '110px' },
    { key: 'actions', label: '', w: '44px' }
  ];

  return (
    <>
      <PageHeader
        title="Leads"
        subtitle="Track, score, and qualify inbound leads."
        actions={
          <HStack spacing="8px">
            <Button
              size="sm"
              variant="ghost"
              color="app.subtle"
              borderRadius="10px"
              fontSize="13px"
              fontWeight="500"
              h="36px"
              px="14px"
              leftIcon={<GitMergeIcon size={14} />}
              _hover={{ bg: 'app.surfaceAlt' }}
              isLoading={scanning}
              onClick={scanDuplicates}>
              Duplicates
            </Button>
            <Button
              size="sm"
              variant="ghost"
              color="app.subtle"
              borderRadius="10px"
              fontSize="13px"
              fontWeight="500"
              h="36px"
              px="14px"
              leftIcon={<DownloadIcon size={14} />}
              _hover={{ bg: 'app.surfaceAlt' }}
              onClick={handleExport}>
              Export
            </Button>
            <Button
              size="sm"
              h="36px"
              px="16px"
              borderRadius="10px"
              bg="#1a2035"
              color="white"
              fontSize="13px"
              fontWeight="600"
              leftIcon={<PlusIcon size={15} />}
              _hover={{ bg: '#253050' }}
              boxShadow="0 1px 3px rgba(0,0,0,0.2)"
              onClick={openCreate}>
              New lead
            </Button>
          </HStack>
        } />

      {/* Table container */}
      <Box bg="white" borderRadius="16px" border="1px solid #edf0f5" overflow="hidden" boxShadow="0 1px 4px rgba(0,0,0,0.04)">

        {/* Toolbar */}
        <Flex px="20px" py="14px" gap="10px" align="center" borderBottom="1px solid #f0f2f6">
          <InputGroup maxW="260px" size="sm">
            <InputLeftElement pointerEvents="none" h="36px"><SearchIcon size={15} color="#b0b8cc" /></InputLeftElement>
            <Input
              h="36px"
              pl="36px"
              placeholder="Search leads..."
              value={list.search}
              onChange={(e) => { list.setSearch(e.target.value); list.setPage(0); }}
              borderRadius="10px"
              bg="#f8f9fc"
              border="1px solid #edf0f5"
              fontSize="13px"
              color="#1d273d"
              _placeholder={{ color: '#b0b8cc' }}
              _focus={{ borderColor: '#c5ccdc', bg: 'white', boxShadow: '0 0 0 3px rgba(51,85,201,0.08)' }}
            />
          </InputGroup>

          <Select
            h="36px"
            maxW="160px"
            value={list.filter.status ?? 'All'}
            onChange={(e) => { list.setFilter({ ...list.filter, status: e.target.value }); list.setPage(0); }}
            borderRadius="10px"
            bg="#f8f9fc"
            border="1px solid #edf0f5"
            fontSize="13px"
            color="#46506a"
            size="sm"
            _focus={{ borderColor: '#c5ccdc', boxShadow: '0 0 0 3px rgba(51,85,201,0.08)' }}>
            <option value="All">All statuses</option>
            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>

          {list.selectedIds.size > 0 && (
            <Button
              size="sm"
              h="36px"
              px="14px"
              borderRadius="10px"
              bg="#fde8e8"
              color="#c23c3c"
              fontSize="13px"
              fontWeight="600"
              leftIcon={<Trash2Icon size={14} />}
              _hover={{ bg: '#fbd0d0' }}
              border="none"
              onClick={confirmBulk.onOpen}>
              Delete {list.selectedIds.size}
            </Button>
          )}

          <Text ml="auto" fontSize="13px" color="#98a1b2" fontWeight="500">
            {list.total} {list.total === 1 ? 'lead' : 'leads'}
          </Text>
        </Flex>

        {/* Column headers */}
        {!list.loading && list.data.length > 0 && (
          <Flex px="20px" py="10px" bg="#fafbfd" borderBottom="1px solid #f0f2f6" gap="0">
            <Box w="40px" flexShrink={0} display="flex" alignItems="center">
              <Checkbox
                isChecked={list.selectedIds.size === list.data.length && list.data.length > 0}
                onChange={list.toggleSelectAll}
                size="sm"
                sx={{ '& .chakra-checkbox__control': { borderRadius: '5px', borderColor: '#d5dae5', w: '16px', h: '16px', _checked: { bg: '#1a2035', borderColor: '#1a2035' } } }}
              />
            </Box>
            {COLS.map((col) => (
              <Box key={col.key} w={col.key === 'lead' ? 'auto' : col.w} flex={col.key === 'lead' ? '1' : undefined} minW={col.key === 'lead' ? col.minW : undefined} flexShrink={col.key === 'lead' ? 1 : 0}>
                <Text fontSize="11px" fontWeight="700" color="#98a1b2" letterSpacing="0.06em">{col.label}</Text>
              </Box>
            ))}
          </Flex>
        )}

        {list.loading ? (
          <Flex py="72px" justify="center"><Spinner size="md" color="#1a2035" thickness="2px" /></Flex>
        ) : list.data.length === 0 ? (
          <EmptyState icon={UsersRoundIcon} title="No leads found" description="Try adjusting your search or create a new lead." action={<Button size="sm" bg="#1a2035" color="white" borderRadius="10px" fontSize="13px" leftIcon={<PlusIcon size={15} />} onClick={openCreate}>New lead</Button>} />
        ) : (
          <Box>
            {list.data.map((lead, idx) => {
              const person = personById(lead.person_id);
              const owner = ownerById(lead.owner_id);
              const isLast = idx === list.data.length - 1;
              return (
                <Flex
                  key={lead.id}
                  px="20px"
                  py="0"
                  align="center"
                  borderBottom={isLast ? 'none' : '1px solid #f5f6fa'}
                  _hover={{ bg: '#fafbfd' }}
                  cursor="pointer"
                  transition="background .12s ease"
                  onClick={() => { setDetailLead(lead); detailModal.onOpen(); }}
                  h="62px"
                  gap="0">
                  {/* Checkbox */}
                  <Box w="40px" flexShrink={0} onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      isChecked={list.selectedIds.has(lead.id)}
                      onChange={() => list.toggleSelect(lead.id)}
                      size="sm"
                      sx={{ '& .chakra-checkbox__control': { borderRadius: '5px', borderColor: '#d5dae5', w: '16px', h: '16px', _checked: { bg: '#1a2035', borderColor: '#1a2035' } } }}
                    />
                  </Box>

                  {/* Lead info */}
                  <Box flex="1" minW="200px" overflow="hidden">
                    <Flex align="center" gap="12px">
                      <Avatar
                        size="sm"
                        name={person?.name ?? '?'}
                        bg={person?.avatar_color ?? '#d8e7ff'}
                        color="#46506a"
                        fontSize="11px"
                        fontWeight="700"
                        w="34px"
                        h="34px"
                        flexShrink={0}
                      />
                      <Box overflow="hidden">
                        <Text fontSize="13px" fontWeight="600" color="#1d273d" noOfLines={1}>{person?.name ?? 'Unknown'}</Text>
                        <Text fontSize="11px" color="#98a1b2" fontWeight="400" noOfLines={1}>{person?.company ?? '—'}</Text>
                      </Box>
                    </Flex>
                  </Box>

                  {/* Source */}
                  <Box w="140px" flexShrink={0} display={{ base: 'none', md: 'block' }}>
                    <SourceChip source={lead.source} />
                  </Box>

                  {/* AI Score */}
                  <Box w="130px" flexShrink={0}>
                    <ScoreBar score={lead.ai_score} />
                  </Box>

                  {/* Status */}
                  <Box w="140px" flexShrink={0}>
                    <StatusPill status={lead.status} />
                  </Box>

                  {/* Owner */}
                  <Box w="160px" flexShrink={0} display={{ base: 'none', lg: 'block' }}>
                    <Flex align="center" gap="8px">
                      <Avatar size="xs" name={owner.name} bg={owner.color} color={owner.textColor} fontSize="9px" fontWeight="800" w="26px" h="26px" />
                      <Text fontSize="12px" color="#46506a" fontWeight="500">{owner.name}</Text>
                    </Flex>
                  </Box>

                  {/* Value */}
                  <Box w="110px" flexShrink={0}>
                    <Text fontSize="13px" fontWeight="700" color="#1d273d" textAlign="right" pr="8px">
                      ${(lead.value ?? 0).toLocaleString()}
                    </Text>
                  </Box>

                  {/* Actions */}
                  <Box w="44px" flexShrink={0} onClick={(e) => e.stopPropagation()}>
                    <Menu placement="bottom-end">
                      <MenuButton
                        as={IconButton}
                        aria-label="Lead actions"
                        icon={<MoreHorizontalIcon size={16} />}
                        variant="ghost"
                        size="sm"
                        color="#b0b8cc"
                        borderRadius="8px"
                        _hover={{ bg: '#f0f2f6', color: '#1d273d' }}
                      />
                      <MenuList
                        bg="white"
                        border="1px solid #edf0f5"
                        borderRadius="12px"
                        boxShadow="0 8px 24px rgba(0,0,0,0.10)"
                        py="6px"
                        minW="160px">
                        <MenuItem bg="white" fontSize="13px" color="#1d273d" icon={<UserPlusIcon size={14} />} _hover={{ bg: '#f8f9fc' }} borderRadius="7px" mx="4px" w="calc(100% - 8px)" onClick={() => openEdit(lead)}>Edit lead</MenuItem>
                        <MenuItem bg="white" fontSize="13px" color="#1d273d" icon={<CheckCircleIcon size={14} />} _hover={{ bg: '#f8f9fc' }} borderRadius="7px" mx="4px" w="calc(100% - 8px)" onClick={() => qualifyLead(lead)}>Qualify</MenuItem>
                        <MenuItem bg="white" fontSize="13px" color="#1d273d" icon={<CalendarPlusIcon size={14} />} _hover={{ bg: '#f8f9fc' }} borderRadius="7px" mx="4px" w="calc(100% - 8px)" onClick={async () => { const d = new Date(); d.setDate(d.getDate() + 1); await mutation.update(lead.id, { follow_up_date: d.toISOString().split('T')[0] }); toast({ title: 'Follow-up scheduled', status: 'success', duration: 1800, position: 'top-right' }); }}>Schedule follow-up</MenuItem>
                        <Box h="1px" bg="#f0f2f6" mx="10px" my="4px" />
                        <MenuItem bg="white" fontSize="13px" color="#c23c3c" icon={<Trash2Icon size={14} />} _hover={{ bg: '#fde8e8' }} borderRadius="7px" mx="4px" w="calc(100% - 8px)" onClick={() => { setDeleteId(lead.id); confirmDel.onOpen(); }}>Delete</MenuItem>
                      </MenuList>
                    </Menu>
                  </Box>
                </Flex>
              );
            })}

            {/* Pagination */}
            <Box px="20px" py="12px" borderTop="1px solid #f0f2f6">
              <Flex align="center" justify="space-between">
                <Text fontSize="13px" color="#98a1b2">
                  {list.page * list.pageSize + 1}–{Math.min((list.page + 1) * list.pageSize, list.total)} of {list.total}
                </Text>
                <Flex align="center" gap="6px">
                  <Button
                    size="sm"
                    h="32px"
                    w="32px"
                    p="0"
                    borderRadius="8px"
                    variant="ghost"
                    color="#6b7488"
                    fontSize="16px"
                    _hover={{ bg: '#f0f2f6' }}
                    isDisabled={list.page === 0}
                    onClick={() => list.setPage(list.page - 1)}>‹</Button>
                  <Text fontSize="13px" color="#46506a" fontWeight="500" px="8px">{list.page + 1} / {Math.max(1, Math.ceil(list.total / list.pageSize))}</Text>
                  <Button
                    size="sm"
                    h="32px"
                    w="32px"
                    p="0"
                    borderRadius="8px"
                    variant="ghost"
                    color="#6b7488"
                    fontSize="16px"
                    _hover={{ bg: '#f0f2f6' }}
                    isDisabled={(list.page + 1) * list.pageSize >= list.total}
                    onClick={() => list.setPage(list.page + 1)}>›</Button>
                </Flex>
              </Flex>
            </Box>
          </Box>
        )}
      </Box>

      {/* Create/Edit Modal */}
      <FormModal isOpen={formModal.isOpen} onClose={formModal.onClose} title={editing ? 'Edit lead' : 'New lead'} subtitle={editing ? 'Update lead information' : 'Capture a new inbound lead'} loading={mutation.loading} onSubmit={handleSubmit} submitLabel={editing ? 'Update' : 'Create'}>
        <FormControl isInvalid={!!formErrors.name}>
          <FormLabel fontSize="12px" fontWeight="600" color="#46506a">Contact name</FormLabel>
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ava Williams" size="sm" borderRadius="9px" borderColor="#edf0f5" fontSize="13px" _focus={{ borderColor: '#1a2035', boxShadow: '0 0 0 3px rgba(26,32,53,0.08)' }} />
          {formErrors.name && <Text fontSize="11px" color="#c23c3c" mt="4px">{formErrors.name}</Text>}
        </FormControl>
        <FormControl isInvalid={!!formErrors.company}>
          <FormLabel fontSize="12px" fontWeight="600" color="#46506a">Company</FormLabel>
          <Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} placeholder="Lattice Labs" size="sm" borderRadius="9px" borderColor="#edf0f5" fontSize="13px" _focus={{ borderColor: '#1a2035', boxShadow: '0 0 0 3px rgba(26,32,53,0.08)' }} />
          {formErrors.company && <Text fontSize="11px" color="#c23c3c" mt="4px">{formErrors.company}</Text>}
        </FormControl>
        <Grid templateColumns="1fr 1fr" gap="10px">
          <FormControl isInvalid={!!formErrors.email}>
            <FormLabel fontSize="12px" fontWeight="600" color="#46506a">Email</FormLabel>
            <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="ava@company.com" size="sm" borderRadius="9px" borderColor="#edf0f5" fontSize="13px" _focus={{ borderColor: '#1a2035', boxShadow: '0 0 0 3px rgba(26,32,53,0.08)' }} />
            {formErrors.email && <Text fontSize="11px" color="#c23c3c" mt="4px">{formErrors.email}</Text>}
          </FormControl>
          <FormControl>
            <FormLabel fontSize="12px" fontWeight="600" color="#46506a">Phone</FormLabel>
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+1 415 220 1188" size="sm" borderRadius="9px" borderColor="#edf0f5" fontSize="13px" _focus={{ borderColor: '#1a2035', boxShadow: '0 0 0 3px rgba(26,32,53,0.08)' }} />
          </FormControl>
        </Grid>
        <Grid templateColumns="1fr 1fr" gap="10px">
          <FormControl>
            <FormLabel fontSize="12px" fontWeight="600" color="#46506a">Source</FormLabel>
            <Select value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} size="sm" borderRadius="9px" borderColor="#edf0f5" fontSize="13px">{SOURCE_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}</Select>
          </FormControl>
          <FormControl>
            <FormLabel fontSize="12px" fontWeight="600" color="#46506a">Status</FormLabel>
            <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} size="sm" borderRadius="9px" borderColor="#edf0f5" fontSize="13px">{STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}</Select>
          </FormControl>
        </Grid>
        <Grid templateColumns="1fr 1fr" gap="10px">
          <FormControl>
            <FormLabel fontSize="12px" fontWeight="600" color="#46506a">Owner</FormLabel>
            <Select value={form.owner_id} onChange={(e) => setForm({ ...form, owner_id: e.target.value })} size="sm" borderRadius="9px" borderColor="#edf0f5" fontSize="13px">{OWNERS.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}</Select>
          </FormControl>
          <FormControl>
            <FormLabel fontSize="12px" fontWeight="600" color="#46506a">Deal value ($)</FormLabel>
            <Input type="number" value={form.value} onChange={(e) => setForm({ ...form, value: Number(e.target.value) })} placeholder="18500" size="sm" borderRadius="9px" borderColor="#edf0f5" fontSize="13px" _focus={{ borderColor: '#1a2035', boxShadow: '0 0 0 3px rgba(26,32,53,0.08)' }} />
          </FormControl>
        </Grid>
        <FormControl>
          <FormLabel fontSize="12px" fontWeight="600" color="#46506a">Follow-up date</FormLabel>
          <Input type="date" value={form.follow_up_date} onChange={(e) => setForm({ ...form, follow_up_date: e.target.value })} size="sm" borderRadius="9px" borderColor="#edf0f5" fontSize="13px" _focus={{ borderColor: '#1a2035', boxShadow: '0 0 0 3px rgba(26,32,53,0.08)' }} />
        </FormControl>
      </FormModal>

      <ConfirmDialog isOpen={confirmDel.isOpen} onClose={confirmDel.onClose} title="Delete lead" message="Are you sure you want to delete this lead?" confirmLabel="Delete" danger loading={mutation.loading} onConfirm={handleDelete} />
      <ConfirmDialog isOpen={confirmBulk.isOpen} onClose={confirmBulk.onClose} title="Delete selected leads" message={`Delete ${list.selectedIds.size} leads?`} confirmLabel="Delete all" danger loading={mutation.loading} onConfirm={handleBulkDelete} />

      {/* Detail Modal */}
      <Modal isOpen={detailModal.isOpen} onClose={detailModal.onClose} size="md" isCentered>
        <ModalOverlay backdropFilter="blur(6px)" bg="rgba(15,21,35,0.4)" />
        <ModalContent bg="white" borderRadius="20px" overflow="hidden" boxShadow="0 20px 60px rgba(0,0,0,0.15)">
          {detailLead && (() => {
            const p = personById(detailLead.person_id);
            const owner = ownerById(detailLead.owner_id);
            const cfg = statusConfig[detailLead.status] ?? { color: '#6b7488', bg: '#f0f2f5', dot: '#6b7488' };
            return (
              <>
                <ModalHeader p="0">
                  <Box px="24px" pt="24px" pb="20px" borderBottom="1px solid #f0f2f6">
                    <Flex align="center" gap="14px">
                      <Avatar size="md" name={p?.name ?? '?'} bg={p?.avatar_color ?? '#d8e7ff'} color="#46506a" fontSize="14px" fontWeight="800" w="48px" h="48px" />
                      <Box flex="1">
                        <Text fontSize="17px" fontWeight="800" color="#1d273d" lineHeight="1.2">{p?.name ?? 'Unknown lead'}</Text>
                        <Text fontSize="12px" color="#98a1b2" mt="2px">{p?.company ?? '—'}</Text>
                      </Box>
                      <Flex align="center" gap="5px" px="10px" py="5px" bg={cfg.bg} borderRadius="full">
                        <Box w="6px" h="6px" borderRadius="full" bg={cfg.dot} />
                        <Text fontSize="11px" fontWeight="600" color={cfg.color}>{detailLead.status}</Text>
                      </Flex>
                    </Flex>
                  </Box>
                </ModalHeader>
                <ModalCloseButton top="20px" right="20px" color="#98a1b2" _hover={{ bg: '#f0f2f6', color: '#1d273d' }} borderRadius="8px" />
                <ModalBody px="24px" py="20px">
                  <Stack spacing="16px">
                    {/* Score section */}
                    <Grid templateColumns="1fr 1fr" gap="12px">
                      <Box p="16px" bg="#fafbfd" borderRadius="14px" border="1px solid #f0f2f6">
                        <Text fontSize="10px" fontWeight="700" color="#98a1b2" letterSpacing="0.06em">LEAD SCORE</Text>
                        <Text mt="6px" fontSize="22px" fontWeight="900" color="#1d273d">{detailLead.score}<Text as="span" fontSize="13px" color="#98a1b2" fontWeight="500">/100</Text></Text>
                      </Box>
                      <Box p="16px" bg="#fafbfd" borderRadius="14px" border="1px solid #f0f2f6">
                        <Text fontSize="10px" fontWeight="700" color="#98a1b2" letterSpacing="0.06em">VALUE</Text>
                        <Text mt="6px" fontSize="22px" fontWeight="900" color="#1d273d">${(detailLead.value ?? 0).toLocaleString()}</Text>
                      </Box>
                    </Grid>

                    {/* AI Score bar */}
                    <Box p="16px" bg="#fafbfd" borderRadius="14px" border="1px solid #f0f2f6">
                      <Flex justify="space-between" align="center" mb="8px">
                        <Text fontSize="11px" fontWeight="700" color="#46506a">AI CONFIDENCE SCORE</Text>
                        <Text fontSize="13px" fontWeight="800" color={detailLead.ai_score >= 70 ? '#1c8a5c' : detailLead.ai_score >= 40 ? '#b5760f' : '#c23c3c'}>{detailLead.ai_score}%</Text>
                      </Flex>
                      <Box w="full" h="8px" bg="#edf0f5" borderRadius="full" overflow="hidden">
                        <Box h="full" bg={detailLead.ai_score >= 70 ? '#1c8a5c' : detailLead.ai_score >= 40 ? '#b5760f' : '#c23c3c'} borderRadius="full" style={{ width: `${detailLead.ai_score}%` }} transition="width .4s ease" />
                      </Box>
                    </Box>

                    {/* Source + contact */}
                    {p && (
                      <Box p="16px" bg="#fafbfd" borderRadius="14px" border="1px solid #f0f2f6">
                        <Text fontSize="10px" fontWeight="700" color="#98a1b2" letterSpacing="0.06em" mb="10px">CONTACT INFO</Text>
                        <Stack spacing="6px">
                          {p.email && <Flex align="center" gap="8px"><Icon as={MailIcon} boxSize="13px" color="#98a1b2" /><Text fontSize="12px" color="#46506a">{p.email}</Text></Flex>}
                          {p.phone && <Flex align="center" gap="8px"><Icon as={PhoneIcon} boxSize="13px" color="#98a1b2" /><Text fontSize="12px" color="#46506a">{p.phone}</Text></Flex>}
                        </Stack>
                      </Box>
                    )}

                    <Grid templateColumns="1fr 1fr" gap="10px">
                      {[['OWNER', detailLead.owner_name || '—'], ['SOURCE', detailLead.source], ['FOLLOW-UP', detailLead.follow_up_date ?? '—'], ['CREATED', new Date(detailLead.created_at ?? '').toLocaleDateString()]].map(([label, val]) => (
                        <Box key={label}>
                          <Text fontSize="10px" fontWeight="700" color="#98a1b2" letterSpacing="0.06em">{label}</Text>
                          <Text fontSize="13px" fontWeight="600" color="#1d273d" mt="2px">{val}</Text>
                        </Box>
                      ))}
                    </Grid>

                    <Flex gap="8px" pt="4px">
                      <Button flex="1" h="38px" borderRadius="10px" bg="#1a2035" color="white" fontSize="13px" fontWeight="600" _hover={{ bg: '#253050' }} onClick={() => { detailModal.onClose(); openEdit(detailLead); }}>Edit lead</Button>
                      {detailLead.status !== 'Qualified' && detailLead.status !== 'Won' && (
                        <Button flex="1" h="38px" borderRadius="10px" variant="outline" borderColor="#edf0f5" color="#1d273d" fontSize="13px" fontWeight="600" leftIcon={<CheckCircleIcon size={14} />} _hover={{ bg: '#f8f9fc' }} onClick={() => { detailModal.onClose(); qualifyLead(detailLead); }}>Qualify</Button>
                      )}
                    </Flex>
                  </Stack>
                </ModalBody>
              </>
            );
          })()}
        </ModalContent>
      </Modal>

      {/* Duplicate Detection Modal */}
      <Modal isOpen={dupModal.isOpen} onClose={dupModal.onClose} size="lg" isCentered>
        <ModalOverlay backdropFilter="blur(6px)" bg="rgba(15,21,35,0.4)" />
        <ModalContent bg="white" borderRadius="20px" overflow="hidden" boxShadow="0 20px 60px rgba(0,0,0,0.15)" maxH="80vh">
          <ModalHeader borderBottom="1px solid" borderColor="app.border" pb="16px">
            <Flex align="center" gap="10px"><Icon as={GitMergeIcon} boxSize="18px" color="#e9683f" /><Box><Text fontSize="16px" fontWeight="800" fontFamily="'Plus Jakarta Sans', sans-serif">Duplicate Management</Text><Text fontSize="11px" color="#98a1b2" fontWeight="400">Detect and merge similar lead records</Text></Box></Flex>
          </ModalHeader>
          <ModalCloseButton top="20px" right="20px" color="#98a1b2" _hover={{ bg: '#f0f2f6', color: '#1d273d' }} borderRadius="8px" />
          <ModalBody py="20px" overflowY="auto">
            {duplicates.length === 0 ? (
              <Flex direction="column" align="center" py="40px"><Icon as={CheckCircleIcon} boxSize="32px" color="#1c8a5c" /><Text mt="12px" fontSize="14px" fontWeight="700" color="#1d273d">No duplicates found</Text><Text fontSize="12px" color="#98a1b2">All lead records are unique.</Text></Flex>
            ) : (
              <Stack spacing="16px">
                {duplicates.map((group) => (
                  <Box key={group.key} p="14px" bg="#fafbfd" borderRadius="12px" border="1px solid #f0f2f6">
                    <Flex align="center" gap="8px" mb="10px">
                      <Badge fontSize="9px" borderRadius="full" px="6px" py="2px" bg="#fef3e0" color="#b5760f" textTransform="capitalize">{group.key.split(':')[0]}</Badge>
                      <Text fontSize="11px" color="#98a1b2">{group.key.split(':')[1]}</Text>
                      <Text fontSize="11px" fontWeight="600" color="#1d273d" ml="auto">{group.leads.length} records</Text>
                    </Flex>
                    {group.leads.map((dupLead, i) => (
                      <Flex key={dupLead.id} align="center" gap="10px" py="8px" px="6px" bg={i === 0 ? 'rgba(28,138,92,0.05)' : 'transparent'} borderRadius="8px">
                        <Box w="20px" flexShrink={0}>{i === 0 && <Text fontSize="9px" fontWeight="800" color="#1c8a5c">MASTER</Text>}</Box>
                        <Avatar size="2xs" name={dupLead.person?.name ?? '?'} bg={dupLead.person?.avatar_color ?? '#d8e7ff'} color="#46506a" />
                        <Box flex="1"><Text fontSize="12px" fontWeight="600" noOfLines={1}>{dupLead.person?.name ?? 'Unknown'}</Text><Text fontSize="10px" color="#98a1b2">{dupLead.person?.company ?? '—'} · Score {dupLead.ai_score}</Text></Box>
                        <StatusPill status={dupLead.status} />
                      </Flex>
                    ))}
                    <Button mt="8px" size="xs" w="full" bg="#1a2035" color="white" borderRadius="8px" fontSize="11px" fontWeight="600" _hover={{ bg: '#253050' }} leftIcon={<GitMergeIcon size={12} />} onClick={() => mergeLeads(group)}>Merge into master record</Button>
                  </Box>
                ))}
              </Stack>
            )}
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
}
