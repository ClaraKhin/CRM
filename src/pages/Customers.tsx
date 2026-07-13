import React, { useEffect, useMemo, useState } from 'react';
import {
  Avatar,
  Box,
  Button,
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
  Tag,
  Text,
  useDisclosure,
  useToast } from
'@chakra-ui/react';
import {
  BuildingIcon,
  DownloadIcon,
  FileTextIcon,
  GlobeIcon,
  MailIcon,
  MapPinIcon,
  MoreHorizontalIcon,
  PhoneIcon,
  PlusIcon,
  SearchIcon,
  Trash2Icon,
  UploadIcon,
  UsersRoundIcon } from
'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { StatusBadge } from '../components/ui/StatusBadge';
import { EmptyState } from '../components/ui/EmptyState';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { FormDrawer } from '../components/ui/FormDrawer';
import { Pagination } from '../components/ui/Pagination';
import { useCrudList, useCrudMutation, exportToCsv } from '../lib/crud';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

type Person = { id: string; name: string; email: string; phone: string; company: string; avatar_color: string };
type Customer = {
  id: string;
  person_id: string | null;
  status: string;
  industry: string;
  website: string;
  tags: string[];
  lifetime_value: number;
  address: string;
  notes: string;
  created_at: string;
};

const STATUS_OPTIONS = ['Lead', 'Prospect', 'Customer', 'VIP', 'Inactive'];

export function Customers() {
  const toast = useToast();
  const [people, setPeople] = useState<Person[]>([]);
  const { session } = useAuth();
  const list = useCrudList<Customer>('customers', {
    pageSize: 9,
    searchFields: ['status', 'industry', 'website', 'address'],
    defaultSort: { key: 'created_at', dir: 'desc' }
  });
  const mutation = useCrudMutation<Customer>('customers', { onSuccess: list.refetch });
  const formDrawer = useDisclosure();
  const detailModal = useDisclosure();
  const confirmDel = useDisclosure();
  const confirmBulk = useDisclosure();
  const [editing, setEditing] = useState<Customer | null>(null);
  const [selected, setSelected] = useState<Customer | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [activities, setActivities] = useState<{ id: string; type: string; subject: string; description: string; created_at: string }[]>([]);
  const [customerDeals, setCustomerDeals] = useState<{ id: string; title: string; value: number; stage: string; project_volume: number; deal_type: string; sale_type: string; quotation_status: string; close_date: string | null }[]>([]);

  // Form state
  const [form, setForm] = useState({
    name: '', email: '', phone: '', company: '',
    status: 'Lead', industry: '', website: '', tags: '', address: '', notes: ''
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Load people for lookups
  useEffect(() => {
    if (!session?.user) return;
    (async () => {
      const { data } = await supabase.from('people').select('*').eq('user_id', session.user.id);
      setPeople((data ?? []) as Person[]);
    })();
  }, [session]);

  const personById = (id: string | null) => people.find((p) => p.id === id) ?? null;

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', email: '', phone: '', company: '', status: 'Lead', industry: '', website: '', tags: '', address: '', notes: '' });
    setFormErrors({});
    formDrawer.onOpen();
  };

  const openEdit = (customer: Customer) => {
    const p = personById(customer.person_id);
    setEditing(customer);
    setForm({
      name: p?.name ?? '', email: p?.email ?? '', phone: p?.phone ?? '', company: p?.company ?? '',
      status: customer.status, industry: customer.industry, website: customer.website,
      tags: customer.tags.join(', '), address: customer.address, notes: customer.notes
    });
    setFormErrors({});
    formDrawer.onOpen();
  };

  const openDetail = async (customer: Customer) => {
    setSelected(customer);
    detailModal.onOpen();
    if (session?.user && customer.person_id) {
      const [aData, dData] = await Promise.all([
        supabase.from('activities').select('*').eq('user_id', session.user.id).eq('person_id', customer.person_id).order('created_at', { ascending: false }).limit(10),
        supabase.from('deals').select('*').eq('user_id', session.user.id).eq('customer_id', customer.id).order('created_at', { ascending: false })
      ]);
      setActivities((aData.data ?? []) as typeof activities);
      setCustomerDeals((dData.data ?? []) as typeof customerDeals);
    }
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
    const tags = form.tags.split(',').map((t) => t.trim()).filter(Boolean);

    if (editing) {
      // Update person
      if (editing.person_id) {
        await supabase.from('people').update({
          name: form.name, email: form.email, phone: form.phone, company: form.company
        }).eq('id', editing.person_id);
      }
      const { error } = await mutation.update(editing.id, {
        status: form.status, industry: form.industry, website: form.website,
        tags, address: form.address, notes: form.notes
      });
      if (error) {
        toast({ title: 'Update failed', description: error, status: 'error', duration: 3000, position: 'top-right' });
        return;
      }
      toast({ title: 'Customer updated', status: 'success', duration: 2000, position: 'top-right' });
    } else {
      // Create person first
      const { data: person } = await supabase.from('people').insert({
        user_id: session!.user.id, name: form.name, email: form.email, phone: form.phone, company: form.company,
        avatar_color: ['#d8e7ff', '#eadbff', '#c9f0e3', '#ffe0ee', '#f9dfbe', '#e0dcff'][Math.floor(Math.random() * 6)]
      }).select().maybeSingle();
      const { error } = await mutation.insert({
        person_id: person?.id ?? null, status: form.status, industry: form.industry,
        website: form.website, tags, lifetime_value: 0, address: form.address, notes: form.notes
      });
      if (error) {
        toast({ title: 'Create failed', description: error, status: 'error', duration: 3000, position: 'top-right' });
        return;
      }
      toast({ title: 'Customer created', status: 'success', duration: 2000, position: 'top-right' });
    }
    formDrawer.onClose();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await mutation.remove(deleteId);
    if (error) {
      toast({ title: 'Delete failed', description: error, status: 'error', duration: 3000, position: 'top-right' });
      return;
    }
    toast({ title: 'Customer deleted', status: 'success', duration: 2000, position: 'top-right' });
    confirmDel.onClose();
    setDeleteId(null);
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(list.selectedIds);
    const { error } = await mutation.removeMany(ids);
    if (error) {
      toast({ title: 'Bulk delete failed', description: error, status: 'error', duration: 3000, position: 'top-right' });
      return;
    }
    toast({ title: `${ids.length} customers deleted`, status: 'success', duration: 2000, position: 'top-right' });
    list.clearSelection();
    confirmBulk.onClose();
  };

  const handleExport = () => {
    const rows = list.data.map((c) => {
      const p = personById(c.person_id);
      return { name: p?.name ?? '', company: p?.company ?? '', email: p?.email ?? '', phone: p?.phone ?? '', status: c.status, industry: c.industry, website: c.website, tags: c.tags.join('; '), lifetime_value: c.lifetime_value, address: c.address };
    });
    exportToCsv('customers.csv', rows);
    toast({ title: 'Exported to CSV', status: 'success', duration: 1800, position: 'top-right' });
  };

  const detailPerson = selected ? personById(selected.person_id) : null;

  return (
    <>
      <PageHeader
        title="Customers"
        subtitle="Manage accounts, contacts, and relationships."
        actions={
          <HStack spacing="6px">
            <Button size="sm" variant="outline" borderColor="app.border" borderRadius="9px" fontSize="12px" leftIcon={<UploadIcon size={14} />} onClick={handleExport}>Export</Button>
            <Button size="sm" borderRadius="9px" bg="navy.600" color="white" _hover={{ bg: 'navy.500' }} leftIcon={<PlusIcon size={15} />} fontSize="12px" onClick={openCreate}>New customer</Button>
          </HStack>
        } />

      <Card>
        <Flex px={{ base: '14px', md: '20px' }} py="14px" gap="10px" align="center" flexWrap="wrap" borderBottom="1px solid" borderColor="app.border">
          <InputGroup maxW="280px" size="sm">
            <InputLeftElement pointerEvents="none"><SearchIcon size={15} color="#8a93a6" /></InputLeftElement>
            <Input placeholder="Search customers..." value={list.search} onChange={(e) => { list.setSearch(e.target.value); list.setPage(0); }} borderRadius="9px" bg="app.surfaceAlt" borderColor="app.border" fontSize="12px" />
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
          <Text ml="auto" fontSize="12px" color="app.subtle">{list.total} customers</Text>
        </Flex>

        {list.loading ? (
          <Flex py="60px" justify="center"><Spinner color="brand.500" /></Flex>
        ) : list.data.length === 0 ? (
          <EmptyState icon={UsersRoundIcon} title="No customers found" description="Try adjusting your search or create a new customer." action={<Button size="sm" bg="navy.600" color="white" borderRadius="9px" fontSize="12px" leftIcon={<PlusIcon size={15} />} onClick={openCreate}>New customer</Button>} />
        ) : (
          <Box px={{ base: '14px', md: '20px' }} py="16px">
            <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)', xl: 'repeat(3, 1fr)' }} gap="14px">
              {list.data.map((customer) => {
                const p = personById(customer.person_id);
                return (
                  <Card key={customer.id} p="18px" cursor="pointer" transition="transform .12s ease" _hover={{ transform: 'translateY(-2px)' }} onClick={() => openDetail(customer)}>
                    <Flex align="center" gap="11px">
                      <Avatar size="md" name={p?.name ?? '?'} bg={p?.avatar_color ?? '#d8e7ff'} color="#46506a" fontSize="14px" />
                      <Box flex="1" minW="0">
                        <Text fontSize="14px" fontWeight="700" noOfLines={1}>{p?.company ?? 'Unknown'}</Text>
                        <Text fontSize="11px" color="app.subtle" noOfLines={1}>{p?.name ?? ''}</Text>
                      </Box>
                      <StatusBadge status={customer.status} />
                    </Flex>
                    <Flex mt="14px" gap="8px" flexWrap="wrap">
                      {customer.tags.map((tag) => <Tag key={tag} size="sm" borderRadius="full" bg="app.surfaceAlt" color="app.subtle" fontSize="10px">{tag}</Tag>)}
                    </Flex>
                    <Flex mt="14px" pt="13px" borderTop="1px solid" borderColor="app.border" justify="space-between">
                      <Box>
                        <Text fontSize="10px" color="app.faint">Industry</Text>
                        <Text fontSize="12px" fontWeight="600">{customer.industry || '—'}</Text>
                      </Box>
                      <Box textAlign="right">
                        <Text fontSize="10px" color="app.faint">Lifetime value</Text>
                        <Text fontSize="12px" fontWeight="700">${(customer.lifetime_value ?? 0).toLocaleString()}</Text>
                      </Box>
                    </Flex>
                    <Flex mt="10px" gap="6px">
                      <Button size="xs" variant="ghost" fontSize="11px" onClick={(e) => { e.stopPropagation(); openEdit(customer); }}>Edit</Button>
                      <Button size="xs" variant="ghost" fontSize="11px" color="#c23c3c" onClick={(e) => { e.stopPropagation(); setDeleteId(customer.id); confirmDel.onOpen(); }}>Delete</Button>
                    </Flex>
                  </Card>
                );
              })}
            </Grid>
            <Box mt="16px">
              <Pagination page={list.page} pageSize={list.pageSize} total={list.total} onPageChange={list.setPage} />
            </Box>
          </Box>
        )}
      </Card>

      {/* Create/Edit Form */}
      <FormDrawer isOpen={formDrawer.isOpen} onClose={formDrawer.onClose} title={editing ? 'Edit customer' : 'New customer'} subtitle={editing ? 'Update customer details' : 'Add a new customer to your CRM'} loading={mutation.loading} onSubmit={handleSubmit} submitLabel={editing ? 'Update' : 'Create'}>
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
          <FormLabel fontSize="12px">Status</FormLabel>
          <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} size="sm" borderRadius="9px" borderColor="app.border" fontSize="13px">
            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>
        </FormControl>
        <FormControl>
          <FormLabel fontSize="12px">Industry</FormLabel>
          <Input value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} placeholder="Software" size="sm" borderRadius="9px" borderColor="app.border" fontSize="13px" />
        </FormControl>
        <FormControl>
          <FormLabel fontSize="12px">Website</FormLabel>
          <Input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="latticelabs.io" size="sm" borderRadius="9px" borderColor="app.border" fontSize="13px" />
        </FormControl>
        <FormControl>
          <FormLabel fontSize="12px">Tags (comma-separated)</FormLabel>
          <Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="Enterprise, SaaS" size="sm" borderRadius="9px" borderColor="app.border" fontSize="13px" />
        </FormControl>
        <FormControl>
          <FormLabel fontSize="12px">Address</FormLabel>
          <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="San Francisco, CA" size="sm" borderRadius="9px" borderColor="app.border" fontSize="13px" />
        </FormControl>
        <FormControl>
          <FormLabel fontSize="12px">Notes</FormLabel>
          <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Internal notes..." size="sm" borderRadius="9px" borderColor="app.border" fontSize="13px" />
        </FormControl>
      </FormDrawer>

      {/* Detail Modal */}
      <Modal isOpen={detailModal.isOpen} onClose={detailModal.onClose} size="md" isCentered>
        <ModalOverlay backdropFilter="blur(4px)" />
        <ModalContent bg="app.surface" borderRadius="18px" overflow="hidden" maxH="85vh" overflowY="auto">
          <ModalHeader borderBottom="1px solid" borderColor="app.border" pb="14px">
            {detailPerson && (
              <Flex align="center" gap="12px">
                <Avatar size="md" name={detailPerson.name} bg={detailPerson.avatar_color} color="#46506a" />
                <Box>
                  <Text fontSize="16px" fontWeight="800">{detailPerson.company}</Text>
                  {selected && <StatusBadge status={selected.status} />}
                </Box>
              </Flex>
            )}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody py="18px">
            {selected && detailPerson && (
              <Box>
                <Text fontSize="11px" fontWeight="700" color="app.faint" letterSpacing="0.08em" mb="9px">CONTACT</Text>
                <Box bg="app.surfaceAlt" borderRadius="12px" p="14px">
                  {[
                    { icon: MailIcon, value: detailPerson.email },
                    { icon: PhoneIcon, value: detailPerson.phone },
                    { icon: GlobeIcon, value: selected.website },
                    { icon: MapPinIcon, value: selected.address },
                    { icon: BuildingIcon, value: selected.industry }
                  ].map((row, i) => (
                    <Flex key={i} align="center" gap="10px" py="6px">
                      <Icon as={row.icon} boxSize="15px" color="app.faint" />
                      <Text fontSize="12px">{row.value || '—'}</Text>
                    </Flex>
                  ))}
                </Box>

                <Text fontSize="11px" fontWeight="700" color="app.faint" letterSpacing="0.08em" mt="20px" mb="9px">TAGS</Text>
                <HStack spacing="8px" flexWrap="wrap">
                  {selected.tags.map((tag) => <Tag key={tag} borderRadius="full" bg="brand.50" color="brand.600" fontSize="11px">{tag}</Tag>)}
                  {selected.tags.length === 0 && <Text fontSize="12px" color="app.faint">No tags</Text>}
                </HStack>

                {selected.notes && (
                  <>
                    <Text fontSize="11px" fontWeight="700" color="app.faint" letterSpacing="0.08em" mt="20px" mb="9px">NOTES</Text>
                    <Text fontSize="12px" color="app.subtle">{selected.notes}</Text>
                  </>
                )}

                <Text fontSize="11px" fontWeight="700" color="app.faint" letterSpacing="0.08em" mt="20px" mb="9px">PROJECTS & DEALS ({customerDeals.length})</Text>
                <Box>
                  {customerDeals.length === 0 ? (
                    <Text fontSize="12px" color="app.faint">No deals linked to this customer yet.</Text>
                  ) : customerDeals.map((deal) => (
                    <Flex key={deal.id} align="center" gap="10px" p="12px" bg="app.surfaceAlt" borderRadius="10px" mb="8px">
                      <Box flex="1">
                        <Text fontSize="12px" fontWeight="700">{deal.title}</Text>
                        <Text fontSize="10px" color="app.subtle">{deal.deal_type ?? 'Project'} · {deal.sale_type ?? 'New'} · {deal.stage}</Text>
                        {(deal.project_volume ?? 0) > 0 && <Text fontSize="10px" color="app.faint">Volume: ${(deal.project_volume ?? 0).toLocaleString()}</Text>}
                      </Box>
                      <Box textAlign="right">
                        <Text fontSize="13px" fontWeight="800">${(deal.value ?? 0).toLocaleString()}</Text>
                        {deal.quotation_status && deal.quotation_status !== 'None' && <Text fontSize="9px" color="brand.600">Quote: {deal.quotation_status}</Text>}
                      </Box>
                    </Flex>
                  ))}
                </Box>

                <Text fontSize="11px" fontWeight="700" color="app.faint" letterSpacing="0.08em" mt="20px" mb="9px">ACTIVITY TIMELINE</Text>
                <Box>
                  {activities.length === 0 ? (
                    <Text fontSize="12px" color="app.faint">No activities recorded yet.</Text>
                  ) : activities.map((item, i) => (
                    <Flex key={item.id} gap="11px" pb="14px">
                      <Flex direction="column" align="center">
                        <Box w="9px" h="9px" borderRadius="full" bg="#e9683f" />
                        {i < activities.length - 1 && <Box w="1px" flex="1" bg="app.border" mt="2px" />}
                      </Flex>
                      <Box>
                        <Text fontSize="12px" fontWeight="600">{item.subject}</Text>
                        <Text fontSize="10px" color="app.subtle">{item.type} · {new Date(item.created_at).toLocaleDateString()}</Text>
                      </Box>
                    </Flex>
                  ))}
                </Box>

                <Text fontSize="11px" fontWeight="700" color="app.faint" letterSpacing="0.08em" mt="6px" mb="9px">DOCUMENTS</Text>
                <Flex align="center" gap="10px" p="12px" bg="app.surfaceAlt" borderRadius="10px">
                  <Icon as={FileTextIcon} boxSize="16px" color="app.subtle" />
                  <Text fontSize="12px" flex="1">No documents uploaded</Text>
                  <Button size="xs" variant="ghost" onClick={() => toast({ title: 'Upload started', status: 'info', duration: 1500, position: 'top-right' })}>Upload</Button>
                </Flex>
                <Flex gap="8px" pt="4px">
                  <Button size="sm" flex="1" bg="navy.600" color="white" _hover={{ bg: 'navy.500' }} borderRadius="9px" fontSize="12px" onClick={() => { detailModal.onClose(); openEdit(selected); }}>Edit customer</Button>
                  <Button size="sm" flex="1" variant="outline" borderColor="#c23c3c" color="#c23c3c" borderRadius="9px" fontSize="12px" leftIcon={<Trash2Icon size={13} />} onClick={() => { setDeleteId(selected.id); confirmDel.onOpen(); }}>Delete</Button>
                </Flex>
              </Box>
            )}
          </ModalBody>
        </ModalContent>
      </Modal>

      <ConfirmDialog isOpen={confirmDel.isOpen} onClose={confirmDel.onClose} title="Delete customer" message="Are you sure you want to delete this customer? This action cannot be undone." confirmLabel="Delete" danger loading={mutation.loading} onConfirm={handleDelete} />
      <ConfirmDialog isOpen={confirmBulk.isOpen} onClose={confirmBulk.onClose} title="Delete selected customers" message={`Delete ${list.selectedIds.size} customers? This action cannot be undone.`} confirmLabel="Delete all" danger loading={mutation.loading} onConfirm={handleBulkDelete} />
    </>
  );
}


