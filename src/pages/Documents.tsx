import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Avatar,
  Badge,
  Box,
  Button,
  Flex,
  Grid,
  HStack,
  Icon,
  Input,
  InputGroup,
  InputLeftElement,
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
import {
  FileIcon,
  FileTextIcon,
  FilterIcon,
  LayoutGridIcon,
  ListIcon,
  Trash2Icon,
  UploadIcon,
  UserIcon } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

type Doc = {
  id: string;
  entity_type: string;
  entity_id: string | null;
  name: string;
  file_url: string;
  file_type: string;
  file_size: number;
  created_at: string;
  user_id: string;
  uploaded_by_name: string | null;
  uploaded_by_email: string | null;
};

const ENTITY_TYPES = ['All', 'deal', 'customer', 'lead', 'quote', 'invoice', 'product', 'general'];
const ENTITY_LABELS: Record<string, string> = {
  deal: 'Deal', customer: 'Customer', lead: 'Lead', quote: 'Quote', invoice: 'Invoice', product: 'Product', general: 'General',
};
const ENTITY_COLORS: Record<string, string> = {
  deal: '#8374d9', customer: '#2d9c79', lead: '#3355c9', quote: '#e9683f', invoice: '#b5760f', product: '#d85a9a', general: '#6b7488',
};

export function Documents() {
  const toast = useToast();
  const { session, profile } = useAuth();
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'table' | 'grid'>('table');
  const [search, setSearch] = useState('');
  const [entityFilter, setEntityFilter] = useState('All');
  const [uploaderFilter, setUploaderFilter] = useState('All');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const confirmDel = useDisclosure();
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async () => {
    if (!session?.user) return;
    setLoading(true);
    const { data, error } = await supabase.from('documents').select('*').order('created_at', { ascending: false });
    if (error) {
      toast({ title: 'Failed to load documents', description: error.message, status: 'error', duration: 3000, position: 'top-right' });
      setLoading(false);
      return;
    }
    setDocs((data ?? []) as Doc[]);
    setLoading(false);
  }, [session, toast]);

  useEffect(() => { load(); }, [load]);

  const uploaders = useMemo(() => {
    const map = new Map<string, { id: string; name: string; email: string }>();
    docs.forEach((d) => {
      if (d.user_id && !map.has(d.user_id)) {
        map.set(d.user_id, { id: d.user_id, name: d.uploaded_by_name || 'Unknown', email: d.uploaded_by_email || '' });
      }
    });
    return Array.from(map.values());
  }, [docs]);

  const filtered = useMemo(() => docs
    .filter((d) => entityFilter === 'All' || d.entity_type === entityFilter)
    .filter((d) => uploaderFilter === 'All' || d.user_id === uploaderFilter)
    .filter((d) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return d.name.toLowerCase().includes(q) ||
        (d.uploaded_by_name ?? '').toLowerCase().includes(q) ||
        (d.uploaded_by_email ?? '').toLowerCase().includes(q);
    }), [docs, search, entityFilter, uploaderFilter]);

  const formatSize = (bytes: number) => bytes < 1024 ? `${bytes}B` : bytes < 1048576 ? `${(bytes / 1024).toFixed(0)}KB` : `${(bytes / 1048576).toFixed(1)}MB`;

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !session?.user) return;
    if (file.size > 25 * 1024 * 1024) { toast({ title: 'File too large (max 25MB)', status: 'error', duration: 3000, position: 'top-right' }); return; }
    setUploading(true);
    const filePath = `${session.user.id}/general/${Date.now()}-${file.name}`;
    const { error: upErr } = await supabase.storage.from('documents').upload(filePath, file);
    const fileUrl = upErr ? `local:${file.name}` : supabase.storage.from('documents').getPublicUrl(filePath).data.publicUrl;
    const { data: docData, error: insErr } = await supabase.from('documents').insert({
      user_id: session.user.id, entity_type: 'general', entity_id: null, name: file.name,
      file_url: fileUrl, file_type: file.type || 'file', file_size: file.size,
      uploaded_by_name: profile?.full_name ?? '', uploaded_by_email: profile?.email ?? '',
    }).select().maybeSingle();
    if (insErr) {
      toast({ title: 'Upload failed', description: insErr.message, status: 'error', duration: 3000, position: 'top-right' });
    } else if (docData) {
      setDocs((prev) => [docData as Doc, ...prev]);
      toast({ title: 'Document uploaded', status: 'success', duration: 2000, position: 'top-right' });
    }
    setUploading(false);
    e.target.value = '';
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const doc = docs.find((d) => d.id === deleteId);
    const { error } = await supabase.from('documents').delete().eq('id', deleteId);
    if (error) {
      toast({ title: 'Delete failed', description: error.message, status: 'error', duration: 3000, position: 'top-right' });
      confirmDel.onClose();
      return;
    }
    setDocs((prev) => prev.filter((d) => d.id !== deleteId));
    toast({ title: 'Document deleted', status: 'success', duration: 1800, position: 'top-right' });
    confirmDel.onClose();
    setDeleteId(null);
  };

  const canDelete = (doc: Doc) => doc.user_id === session?.user?.id;

  const stats = ENTITY_TYPES.slice(1).map((t) => ({ type: t, count: docs.filter((d) => d.entity_type === t).length }));

  return (
    <>
      <PageHeader
        title="Documents"
        subtitle="All uploaded files from every module, in one place."
        actions={
          <HStack spacing="6px">
            <Flex as="label" align="center" gap="7px" px="14px" h="32px" borderRadius="9px" bg="navy.600" color="white" cursor="pointer" _hover={{ bg: 'navy.500' }} fontSize="12px" fontWeight="600">
              <UploadIcon size={14} />
              {uploading ? 'Uploading...' : 'Upload'}
              <input type="file" hidden onChange={handleUpload} disabled={uploading} />
            </Flex>
          </HStack>
        } />

      <Grid templateColumns={{ base: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }} gap="12px" mb="18px">
        <Card p="15px">
          <Flex align="center" gap="8px">
            <Flex w="30px" h="30px" borderRadius="9px" bg="brand.50" align="center" justify="center"><Icon as={FileTextIcon} boxSize="15px" color="brand.600" /></Flex>
            <Box><Text fontSize="10px" color="app.subtle">Total Files</Text><Text fontSize="20px" fontWeight="800">{docs.length}</Text></Box>
          </Flex>
        </Card>
        <Card p="15px">
          <Flex align="center" gap="8px">
            <Flex w="30px" h="30px" borderRadius="9px" bg="#e8eaff" align="center" justify="center"><Icon as={UserIcon} boxSize="15px" color="#3355c9" /></Flex>
            <Box><Text fontSize="10px" color="app.subtle">Uploaders</Text><Text fontSize="20px" fontWeight="800">{uploaders.length}</Text></Box>
          </Flex>
        </Card>
        <Card p="15px">
          <Text fontSize="10px" color="app.subtle">Total Size</Text>
          <Text fontSize="20px" fontWeight="800">{formatSize(docs.reduce((s, d) => s + (d.file_size ?? 0), 0))}</Text>
        </Card>
        <Card p="15px">
          <Text fontSize="10px" color="app.subtle">This Month</Text>
          <Text fontSize="20px" fontWeight="800">{docs.filter((d) => { const dt = new Date(d.created_at); const now = new Date(); return dt.getMonth() === now.getMonth() && dt.getFullYear() === now.getFullYear(); }).length}</Text>
        </Card>
      </Grid>

      {/* Category stats */}
      <Grid templateColumns={{ base: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }} gap="12px" mb="18px">
        {stats.map((s) => (
          <Card key={s.type} p="12px" cursor="pointer" onClick={() => setEntityFilter(s.type)} _hover={{ borderColor: ENTITY_COLORS[s.type] ?? '#6b7488' }} transition="border-color .15s ease">
            <Flex align="center" gap="8px">
              <Box w="8px" h="8px" borderRadius="full" bg={ENTITY_COLORS[s.type] ?? '#6b7488'} />
              <Text fontSize="11px" color="app.subtle">{ENTITY_LABELS[s.type] ?? s.type}</Text>
              <Text ml="auto" fontSize="16px" fontWeight="800">{s.count}</Text>
            </Flex>
          </Card>
        ))}
      </Grid>

      <Card>
        <Flex px={{ base: '14px', md: '20px' }} py="14px" gap="10px" align="center" flexWrap="wrap" borderBottom="1px solid" borderColor="app.border">
          <InputGroup maxW="240px" size="sm">
            <InputLeftElement pointerEvents="none"><FilterIcon size={14} color="app.faint" /></InputLeftElement>
            <Input placeholder="Search files, uploaders..." value={search} onChange={(e) => setSearch(e.target.value)} borderRadius="9px" bg="app.surfaceAlt" borderColor="app.border" fontSize="12px" />
          </InputGroup>
          <Select size="sm" maxW="160px" value={entityFilter} onChange={(e) => setEntityFilter(e.target.value)} borderRadius="9px" borderColor="app.border" fontSize="12px">
            {ENTITY_TYPES.map((t) => <option key={t} value={t}>{t === 'All' ? 'All types' : ENTITY_LABELS[t] ?? t}</option>)}
          </Select>
          <Select size="sm" maxW="180px" value={uploaderFilter} onChange={(e) => setUploaderFilter(e.target.value)} borderRadius="9px" borderColor="app.border" fontSize="12px">
            <option value="All">All uploaders</option>
            {uploaders.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </Select>
          <HStack spacing="2px" bg="app.surfaceAlt" borderRadius="9px" p="2px" ml="auto">
            <Button size="xs" borderRadius="7px" fontSize="11px" bg={view === 'table' ? 'navy.600' : 'transparent'} color={view === 'table' ? 'white' : 'app.subtle'} _hover={{ bg: view === 'table' ? 'navy.500' : 'app.surface' }} leftIcon={<ListIcon size={12} />} onClick={() => setView('table')}>Table</Button>
            <Button size="xs" borderRadius="7px" fontSize="11px" bg={view === 'grid' ? 'navy.600' : 'transparent'} color={view === 'grid' ? 'white' : 'app.subtle'} _hover={{ bg: view === 'grid' ? 'navy.500' : 'app.surface' }} leftIcon={<LayoutGridIcon size={12} />} onClick={() => setView('grid')}>List</Button>
          </HStack>
          <Text fontSize="12px" color="app.subtle">{filtered.length} files</Text>
        </Flex>

        {loading ? (
          <Flex py="60px" justify="center"><Spinner color="brand.500" /></Flex>
        ) : filtered.length === 0 ? (
          <EmptyState icon={FileTextIcon} title="No documents found" description="Upload a document or adjust your filters." />
        ) : view === 'table' ? (
          <TableContainer>
            <Table size="sm">
              <Thead>
                <Tr>
                  <Th borderColor="app.border" fontSize="10px" color="app.faint">Name</Th>
                  <Th borderColor="app.border" fontSize="10px" color="app.faint">Module</Th>
                  <Th borderColor="app.border" fontSize="10px" color="app.faint" display={{ base: 'none', md: 'table-cell' }}>Uploaded By</Th>
                  <Th borderColor="app.border" fontSize="10px" color="app.faint" display={{ base: 'none', md: 'table-cell' }}>Size</Th>
                  <Th borderColor="app.border" fontSize="10px" color="app.faint" display={{ base: 'none', lg: 'table-cell' }}>Date</Th>
                  <Th borderColor="app.border" w="80px"></Th>
                </Tr>
              </Thead>
              <Tbody>
                {filtered.map((doc) => {
                  const isPdf = doc.file_type.includes('pdf') || doc.name.endsWith('.pdf');
                  const isImg = doc.file_type.includes('image') || /\.(png|jpe?g|gif|webp)$/i.test(doc.name);
                  const DIcon = isPdf || isImg ? FileTextIcon : FileIcon;
                  const color = ENTITY_COLORS[doc.entity_type] ?? '#6b7488';
                  return (
                    <Tr key={doc.id} _hover={{ bg: 'app.surfaceAlt' }}>
                      <Td borderColor="app.border">
                        <Flex align="center" gap="10px">
                          <Flex w="30px" h="30px" borderRadius="8px" bg={`${color}1a`} align="center" justify="center" flexShrink={0}>
                            <DIcon size={15} color={color} />
                          </Flex>
                          <Box minW="0">
                            <Text fontSize="12px" fontWeight="600" noOfLines={1}>{doc.name}</Text>
                            <Text fontSize="10px" color="app.faint" display={{ base: 'block', md: 'none' }}>{doc.uploaded_by_name ?? 'Unknown'} · {formatSize(doc.file_size)}</Text>
                          </Box>
                        </Flex>
                      </Td>
                      <Td borderColor="app.border">
                        <Badge fontSize="9px" borderRadius="full" px="6px" py="2px" bg={`${color}1a`} color={color} textTransform="none">{ENTITY_LABELS[doc.entity_type] ?? doc.entity_type}</Badge>
                      </Td>
                      <Td borderColor="app.border" display={{ base: 'none', md: 'table-cell' }}>
                        <Flex align="center" gap="8px">
                          <Avatar size="2xs" name={doc.uploaded_by_name ?? 'Unknown'} bg="app.surfaceAlt" color="app.subtle" fontSize="9px" />
                          <Box minW="0">
                            <Text fontSize="11px" fontWeight="600" noOfLines={1}>{doc.uploaded_by_name ?? 'Unknown'}</Text>
                            <Text fontSize="9px" color="app.faint" noOfLines={1}>{doc.uploaded_by_email ?? ''}</Text>
                          </Box>
                        </Flex>
                      </Td>
                      <Td borderColor="app.border" display={{ base: 'none', md: 'table-cell' }} fontSize="12px" color="app.subtle">{formatSize(doc.file_size)}</Td>
                      <Td borderColor="app.border" display={{ base: 'none', lg: 'table-cell' }} fontSize="12px" color="app.subtle">{new Date(doc.created_at).toLocaleDateString()}</Td>
                      <Td borderColor="app.border">
                        <HStack spacing="2px">
                          {!doc.file_url.startsWith('local:') && <Button as="a" href={doc.file_url} target="_blank" size="xs" variant="ghost" fontSize="11px" color="brand.600">View</Button>}
                          {canDelete(doc) && <Button size="xs" variant="ghost" color="#c23c3c" onClick={() => { setDeleteId(doc.id); confirmDel.onOpen(); }}><Trash2Icon size={13} /></Button>}
                        </HStack>
                      </Td>
                    </Tr>
                  );
                })}
              </Tbody>
            </Table>
          </TableContainer>
        ) : (
          <Box px={{ base: '14px', md: '20px' }} py="16px">
            <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)', xl: 'repeat(3, 1fr)' }} gap="14px">
              {filtered.map((doc) => {
                const isPdf = doc.file_type.includes('pdf') || doc.name.endsWith('.pdf');
                const isImg = doc.file_type.includes('image') || /\.(png|jpe?g|gif|webp)$/i.test(doc.name);
                const DIcon = isPdf || isImg ? FileTextIcon : FileIcon;
                const color = ENTITY_COLORS[doc.entity_type] ?? '#6b7488';
                return (
                  <Card key={doc.id} p="16px" _hover={{ borderColor: color }} transition="border-color .15s ease">
                    <Flex align="center" gap="10px">
                      <Flex w="36px" h="36px" borderRadius="10px" bg={`${color}1a`} align="center" justify="center" flexShrink={0}>
                        <DIcon size={17} color={color} />
                      </Flex>
                      <Box flex="1" minW="0">
                        <Text fontSize="12px" fontWeight="700" noOfLines={1}>{doc.name}</Text>
                        <Text fontSize="10px" color="app.faint">{formatSize(doc.file_size)} · {new Date(doc.created_at).toLocaleDateString()}</Text>
                      </Box>
                    </Flex>
                    <Flex mt="12px" align="center" gap="8px">
                      <Avatar size="2xs" name={doc.uploaded_by_name ?? 'Unknown'} bg="app.surfaceAlt" color="app.subtle" fontSize="8px" />
                      <Text fontSize="10px" color="app.subtle" noOfLines={1}>{doc.uploaded_by_name ?? 'Unknown'}</Text>
                    </Flex>
                    <Flex mt="12px" align="center" justify="space-between">
                      <Badge fontSize="9px" borderRadius="full" px="6px" py="2px" bg={`${color}1a`} color={color} textTransform="none">{ENTITY_LABELS[doc.entity_type] ?? doc.entity_type}</Badge>
                      <HStack spacing="2px">
                        {!doc.file_url.startsWith('local:') && <Button as="a" href={doc.file_url} target="_blank" size="xs" variant="ghost" fontSize="11px" color="brand.600">View</Button>}
                        {canDelete(doc) && <Button size="xs" variant="ghost" color="#c23c3c" onClick={() => { setDeleteId(doc.id); confirmDel.onOpen(); }}><Trash2Icon size={13} /></Button>}
                      </HStack>
                    </Flex>
                  </Card>
                );
              })}
            </Grid>
          </Box>
        )}
      </Card>

      <ConfirmDialog isOpen={confirmDel.isOpen} onClose={confirmDel.onClose} title="Delete document" message="Are you sure you want to delete this document?" confirmLabel="Delete" danger onConfirm={handleDelete} />
    </>
  );
}
