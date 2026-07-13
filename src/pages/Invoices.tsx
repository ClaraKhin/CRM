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
  useToast } from '@chakra-ui/react';
import { DownloadIcon, FileTextIcon, LinkIcon, PlusIcon, PrinterIcon, Trash2Icon } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Card, CardHeader } from '../components/ui/Card';
import { StatusBadge } from '../components/ui/StatusBadge';
import { EmptyState } from '../components/ui/EmptyState';
import { FormModal } from '../components/ui/FormModal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { exportToCsv } from '../lib/crud';

type Person = { id: string; name: string; company: string; avatar_color: string };
type Deal = { id: string; title: string; value: number; person_id: string | null; stage: string };
type Invoice = {
  id: string;
  person_id: string | null;
  deal_id: string | null;
  number: string;
  amount: number;
  tax: number;
  discount: number;
  status: string;
  due_date: string | null;
  payment_history: any[];
  created_at: string;
};

const STATUS_OPTIONS = ['Draft', 'Pending', 'Paid', 'Overdue'];

export function Invoices() {
  const toast = useToast();
  const { session } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const formDrawer = useDisclosure();
  const confirmDel = useDisclosure();
  const [editing, setEditing] = useState<Invoice | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [detailInvoice, setDetailInvoice] = useState<Invoice | null>(null);
  const detailModal = useDisclosure();
  const [form, setForm] = useState({ number: '', person_id: '', deal_id: '', amount: 0, tax: 0, discount: 0, status: 'Draft', due_date: '' });

  const load = useCallback(async () => {
    if (!session?.user) return;
    setLoading(true);
    const [iRes, pRes, dRes] = await Promise.all([
      supabase.from('invoices').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false }),
      supabase.from('people').select('*').eq('user_id', session.user.id),
      supabase.from('deals').select('*').eq('user_id', session.user.id)
    ]);
    setInvoices((iRes.data ?? []) as Invoice[]);
    setPeople((pRes.data ?? []) as Person[]);
    setDeals((dRes.data ?? []) as Deal[]);
    setLoading(false);
  }, [session]);

  useEffect(() => { load(); }, [load]);

  const personById = (id: string | null) => people.find((p) => p.id === id) ?? null;
  const dealById = (id: string | null) => deals.find((d) => d.id === id) ?? null;

  const outstanding = invoices.filter((i) => i.status !== 'Paid' && i.status !== 'Draft').reduce((s, i) => s + i.amount, 0);
  const paid = invoices.filter((i) => i.status === 'Paid').reduce((s, i) => s + i.amount, 0);
  const overdue = invoices.filter((i) => i.status === 'Overdue').reduce((s, i) => s + i.amount, 0);

  const nextNumber = () => {
    const max = invoices.reduce((m, i) => {
      const n = parseInt(i.number.replace(/\D/g, '')) || 0;
      return Math.max(m, n);
    }, 2205);
    return `INV-${max + 1}`;
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ number: nextNumber(), person_id: '', deal_id: '', amount: 0, tax: 0, discount: 0, status: 'Draft', due_date: '' });
    formDrawer.onOpen();
  };

  const openEdit = (invoice: Invoice) => {
    setEditing(invoice);
    setForm({ number: invoice.number, person_id: invoice.person_id ?? '', deal_id: invoice.deal_id ?? '', amount: invoice.amount, tax: invoice.tax, discount: invoice.discount, status: invoice.status, due_date: invoice.due_date ?? '' });
    formDrawer.onOpen();
  };

  const onDealSelect = (dealId: string) => {
    const deal = deals.find((d) => d.id === dealId);
    setForm((prev) => ({
      ...prev,
      deal_id: dealId,
      person_id: deal?.person_id ?? prev.person_id,
      amount: deal?.value ?? prev.amount,
      tax: deal ? Math.round(deal.value * 0.1) : prev.tax
    }));
  };

  const handleSubmit = async () => {
    if (!form.number.trim()) { toast({ title: 'Invoice number is required', status: 'error', duration: 2000, position: 'top-right' }); return; }
    setSaving(true);
    if (editing) {
      const { error } = await supabase.from('invoices').update({
        number: form.number, person_id: form.person_id || null, deal_id: form.deal_id || null,
        amount: Number(form.amount), tax: Number(form.tax), discount: Number(form.discount),
        status: form.status, due_date: form.due_date || null
      }).eq('id', editing.id).eq('user_id', session!.user.id);
      if (!error) toast({ title: 'Invoice updated', status: 'success', duration: 2000, position: 'top-right' });
    } else {
      const { error } = await supabase.from('invoices').insert({
        user_id: session!.user.id, number: form.number, person_id: form.person_id || null,
        deal_id: form.deal_id || null, amount: Number(form.amount), tax: Number(form.tax),
        discount: Number(form.discount), status: form.status, due_date: form.due_date || null, payment_history: []
      });
      if (!error) toast({ title: 'Invoice created', status: 'success', duration: 2000, position: 'top-right' });
    }
    setSaving(false);
    formDrawer.onClose();
    load();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from('invoices').delete().eq('id', deleteId).eq('user_id', session!.user.id);
    if (!error) { toast({ title: 'Invoice deleted', status: 'success', duration: 1800, position: 'top-right' }); load(); }
    confirmDel.onClose();
    setDeleteId(null);
  };

  const markPaid = async (invoice: Invoice) => {
    const payment = { date: new Date().toISOString().split('T')[0], amount: invoice.amount, method: 'Bank transfer' };
    await supabase.from('invoices').update({ status: 'Paid', payment_history: [...(invoice.payment_history ?? []), payment] }).eq('id', invoice.id).eq('user_id', session!.user.id);
    toast({ title: `${invoice.number} marked as paid`, status: 'success', duration: 2000, position: 'top-right' });
    load();
  };

  const handleExport = () => {
    exportToCsv('invoices.csv', invoices.map((i) => {
      const p = personById(i.person_id);
      const d = dealById(i.deal_id);
      return { number: i.number, deal: d?.title ?? '', customer: p?.company ?? '', amount: i.amount, tax: i.tax, discount: i.discount, status: i.status, due: i.due_date ?? '' };
    }));
    toast({ title: 'Exported to CSV', status: 'success', duration: 1800, position: 'top-right' });
  };

  return (
    <>
      <PageHeader
        title="Invoices"
        subtitle="Track payments, taxes, and outstanding balances."
        actions={
          <HStack spacing="6px">
            <Button size="sm" variant="outline" borderColor="app.border" borderRadius="9px" fontSize="12px" leftIcon={<DownloadIcon size={14} />} onClick={handleExport}>Export</Button>
            <Button size="sm" borderRadius="9px" bg="navy.600" color="white" _hover={{ bg: 'navy.500' }} leftIcon={<PlusIcon size={15} />} fontSize="12px" onClick={openCreate}>New invoice</Button>
          </HStack>
        } />

      <Grid templateColumns="repeat(3, 1fr)" gap="12px" mb="18px">
        {[
          { label: 'Outstanding', value: `$${outstanding.toLocaleString()}`, color: '#b5760f' },
          { label: 'Paid this month', value: `$${paid.toLocaleString()}`, color: '#1c8a5c' },
          { label: 'Overdue', value: `$${overdue.toLocaleString()}`, color: '#c23c3c' }
        ].map((item) => (
          <Card key={item.label} p="15px">
            <Text fontSize="11px" color="app.subtle">{item.label}</Text>
            <Text mt="4px" fontFamily="'Plus Jakarta Sans', sans-serif" fontSize={{ base: '15px', md: '19px' }} fontWeight="800" color={item.color}>{item.value}</Text>
          </Card>
        ))}
      </Grid>

      <Card>
        <CardHeader title="All invoices" subtitle={`${invoices.length} invoices`} />
        {loading ? (
          <Flex py="60px" justify="center"><Spinner color="brand.500" /></Flex>
        ) : invoices.length === 0 ? (
          <EmptyState icon={FileTextIcon} title="No invoices found" description="Create a new invoice to get started." action={<Button size="sm" bg="navy.600" color="white" borderRadius="9px" fontSize="12px" leftIcon={<PlusIcon size={15} />} onClick={openCreate}>New invoice</Button>} />
        ) : (
          <TableContainer>
            <Table size="sm">
              <Thead>
                <Tr>
                  <Th borderColor="app.border" fontSize="10px" color="app.faint">Invoice</Th>
                  <Th borderColor="app.border" fontSize="10px" color="app.faint" display={{ base: 'none', md: 'table-cell' }}>Deal</Th>
                  <Th borderColor="app.border" fontSize="10px" color="app.faint" display={{ base: 'none', md: 'table-cell' }}>Customer</Th>
                  <Th borderColor="app.border" fontSize="10px" color="app.faint" display={{ base: 'none', lg: 'table-cell' }}>Due</Th>
                  <Th borderColor="app.border" fontSize="10px" color="app.faint">Status</Th>
                  <Th borderColor="app.border" fontSize="10px" color="app.faint" isNumeric>Amount</Th>
                  <Th borderColor="app.border" w="80px"></Th>
                </Tr>
              </Thead>
              <Tbody>
                {invoices.map((invoice) => {
                  const person = personById(invoice.person_id);
                  const deal = dealById(invoice.deal_id);
                  return (
                    <Tr key={invoice.id} _hover={{ bg: 'app.surfaceAlt' }} cursor="pointer" onClick={() => { setDetailInvoice(invoice); detailModal.onOpen(); }}>
                      <Td borderColor="app.border" fontSize="12px" fontWeight="700">{invoice.number}</Td>
                      <Td borderColor="app.border" display={{ base: 'none', md: 'table-cell' }}>
                        {deal ? (
                          <Flex align="center" gap="4px">
                            <Icon as={LinkIcon} boxSize="11px" color="brand.500" />
                            <Text fontSize="11px" fontWeight="600" noOfLines={1}>{deal.title}</Text>
                          </Flex>
                        ) : <Text fontSize="11px" color="app.faint">—</Text>}
                      </Td>
                      <Td borderColor="app.border" display={{ base: 'none', md: 'table-cell' }} fontSize="12px">{person?.company ?? '—'}</Td>
                      <Td borderColor="app.border" display={{ base: 'none', lg: 'table-cell' }} fontSize="12px" color="app.subtle">{invoice.due_date ?? '—'}</Td>
                      <Td borderColor="app.border"><StatusBadge status={invoice.status} /></Td>
                      <Td borderColor="app.border" isNumeric fontSize="12px" fontWeight="700">${(invoice.amount ?? 0).toLocaleString()}</Td>
                      <Td borderColor="app.border">
                        <HStack spacing="2px" onClick={(e) => e.stopPropagation()}>
                          {invoice.status !== 'Paid' && <Button size="xs" variant="ghost" fontSize="10px" color="#1c8a5c" onClick={() => markPaid(invoice)}>Mark paid</Button>}
                          <Button size="xs" variant="ghost" fontSize="10px" leftIcon={<PrinterIcon size={12} />} onClick={() => toast({ title: `${invoice.number} PDF generated`, status: 'info', duration: 1500, position: 'top-right' })}>PDF</Button>
                          <Button size="xs" variant="ghost" color="#c23c3c" onClick={() => { setDeleteId(invoice.id); confirmDel.onOpen(); }}><Trash2Icon size={13} /></Button>
                        </HStack>
                      </Td>
                    </Tr>
                  );
                })}
              </Tbody>
            </Table>
          </TableContainer>
        )}
      </Card>

      <FormModal isOpen={formDrawer.isOpen} onClose={formDrawer.onClose} title={editing ? 'Edit invoice' : 'New invoice'} subtitle={editing ? 'Update invoice details' : 'Generate a new invoice'} loading={saving} onSubmit={handleSubmit} submitLabel={editing ? 'Update' : 'Create'}>
        <FormControl>
          <FormLabel fontSize="12px">Invoice number</FormLabel>
          <Input value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} size="sm" borderRadius="9px" borderColor="app.border" fontSize="13px" />
        </FormControl>
        <FormControl>
          <FormLabel fontSize="12px">Link to deal (project)</FormLabel>
          <Select value={form.deal_id} onChange={(e) => onDealSelect(e.target.value)} size="sm" borderRadius="9px" borderColor="app.border" fontSize="13px">
            <option value="">— Select deal —</option>
            {deals.map((d) => <option key={d.id} value={d.id}>{d.title} (${d.value.toLocaleString()})</option>)}
          </Select>
        </FormControl>
        <FormControl>
          <FormLabel fontSize="12px">Customer</FormLabel>
          <Select value={form.person_id} onChange={(e) => setForm({ ...form, person_id: e.target.value })} size="sm" borderRadius="9px" borderColor="app.border" fontSize="13px">
            <option value="">— Select —</option>
            {people.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.company})</option>)}
          </Select>
        </FormControl>
        <FormControl>
          <FormLabel fontSize="12px">Amount ($)</FormLabel>
          <Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} size="sm" borderRadius="9px" borderColor="app.border" fontSize="13px" />
        </FormControl>
        <Grid templateColumns="1fr 1fr" gap="10px">
          <FormControl>
            <FormLabel fontSize="12px">Tax ($)</FormLabel>
            <Input type="number" value={form.tax} onChange={(e) => setForm({ ...form, tax: Number(e.target.value) })} size="sm" borderRadius="9px" borderColor="app.border" fontSize="13px" />
          </FormControl>
          <FormControl>
            <FormLabel fontSize="12px">Discount ($)</FormLabel>
            <Input type="number" value={form.discount} onChange={(e) => setForm({ ...form, discount: Number(e.target.value) })} size="sm" borderRadius="9px" borderColor="app.border" fontSize="13px" />
          </FormControl>
        </Grid>
        <FormControl>
          <FormLabel fontSize="12px">Due date</FormLabel>
          <Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} size="sm" borderRadius="9px" borderColor="app.border" fontSize="13px" />
        </FormControl>
        <FormControl>
          <FormLabel fontSize="12px">Status</FormLabel>
          <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} size="sm" borderRadius="9px" borderColor="app.border" fontSize="13px">
            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>
        </FormControl>
      </FormModal>

      <ConfirmDialog isOpen={confirmDel.isOpen} onClose={confirmDel.onClose} title="Delete invoice" message="Are you sure you want to delete this invoice?" confirmLabel="Delete" danger onConfirm={handleDelete} />

      {/* Floating invoice detail modal */}
      <Modal isOpen={detailModal.isOpen} onClose={detailModal.onClose} size="md" isCentered>
        <ModalOverlay backdropFilter="blur(4px)" />
        <ModalContent bg="app.surface" borderRadius="18px" overflow="hidden">
          <ModalHeader borderBottom="1px solid" borderColor="app.border" pb="14px">
            {detailInvoice && (
              <Flex align="center" gap="10px">
                <Icon as={FileTextIcon} boxSize="18px" color="brand.500" />
                <Text fontFamily="'Plus Jakarta Sans', sans-serif" fontWeight="800" fontSize="16px">{detailInvoice.number}</Text>
              </Flex>
            )}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody py="18px">
            {detailInvoice && (() => {
              const person = personById(detailInvoice.person_id);
              const deal = dealById(detailInvoice.deal_id);
              const total = (detailInvoice.amount ?? 0) + (detailInvoice.tax ?? 0) - (detailInvoice.discount ?? 0);
              return (
                <Stack spacing="14px">
                  <Flex gap="8px" flexWrap="wrap">
                    <StatusBadge status={detailInvoice.status} />
                    {deal && <Badge fontSize="9px" borderRadius="full" px="8px" py="2px" bg="brand.50" color="brand.600">Deal: {deal.title}</Badge>}
                  </Flex>
                  <Grid templateColumns="1fr 1fr 1fr" gap="10px">
                    <Box p="12px" bg="app.surfaceAlt" borderRadius="12px">
                      <Text fontSize="10px" color="app.faint">Amount</Text>
                      <Text mt="4px" fontSize="15px" fontWeight="800">${(detailInvoice.amount ?? 0).toLocaleString()}</Text>
                    </Box>
                    <Box p="12px" bg="app.surfaceAlt" borderRadius="12px">
                      <Text fontSize="10px" color="app.faint">Tax</Text>
                      <Text mt="4px" fontSize="15px" fontWeight="800">${(detailInvoice.tax ?? 0).toLocaleString()}</Text>
                    </Box>
                    <Box p="12px" bg="app.surfaceAlt" borderRadius="12px">
                      <Text fontSize="10px" color="app.faint">Discount</Text>
                      <Text mt="4px" fontSize="15px" fontWeight="800">-${(detailInvoice.discount ?? 0).toLocaleString()}</Text>
                    </Box>
                  </Grid>
                  <Box p="14px" bg="app.surfaceAlt" borderRadius="12px">
                    <Flex justify="space-between">
                      <Text fontSize="12px" fontWeight="700">Total</Text>
                      <Text fontSize="18px" fontWeight="800">${total.toLocaleString()}</Text>
                    </Flex>
                  </Box>
                  {person && (
                    <Box p="14px" bg="app.surfaceAlt" borderRadius="12px">
                      <Text fontSize="10px" color="app.faint" mb="8px">CUSTOMER</Text>
                      <Text fontSize="12px" fontWeight="700">{person.name}</Text>
                      <Text fontSize="11px" color="app.subtle">{person.company}</Text>
                    </Box>
                  )}
                  {deal && (
                    <Box p="14px" bg="app.surfaceAlt" borderRadius="12px">
                      <Text fontSize="10px" color="app.faint" mb="8px">LINKED DEAL</Text>
                      <Flex align="center" gap="8px"><Icon as={LinkIcon} boxSize="14px" color="brand.500" /><Text fontSize="12px" fontWeight="600">{deal.title}</Text></Flex>
                    </Box>
                  )}
                  <Grid templateColumns="1fr 1fr" gap="10px">
                    <Box><Text fontSize="10px" color="app.faint">Due date</Text><Text fontSize="12px" fontWeight="600">{detailInvoice.due_date ?? '—'}</Text></Box>
                    <Box><Text fontSize="10px" color="app.faint">Created</Text><Text fontSize="12px" fontWeight="600">{new Date(detailInvoice.created_at).toLocaleDateString()}</Text></Box>
                  </Grid>
                  {detailInvoice.payment_history && detailInvoice.payment_history.length > 0 && (
                    <Box p="14px" bg="app.surfaceAlt" borderRadius="12px">
                      <Text fontSize="10px" color="app.faint" mb="8px">PAYMENT HISTORY</Text>
                      {detailInvoice.payment_history.map((p: any, i: number) => (
                        <Flex key={i} justify="space-between" py="4px" borderBottom={i === detailInvoice.payment_history.length - 1 ? '0' : '1px solid'} borderColor="app.border">
                          <Text fontSize="11px" color="app.subtle">{p.date} · {p.method}</Text>
                          <Text fontSize="11px" fontWeight="600">${p.amount.toLocaleString()}</Text>
                        </Flex>
                      ))}
                    </Box>
                  )}
                  <Flex gap="8px" pt="4px">
                    {detailInvoice.status !== 'Paid' && <Button size="sm" flex="1" bg="#1c8a5c" color="white" _hover={{ bg: '#167a4e' }} borderRadius="9px" fontSize="12px" onClick={() => { markPaid(detailInvoice); detailModal.onClose(); }}>Mark paid</Button>}
                    <Button size="sm" flex="1" bg="navy.600" color="white" _hover={{ bg: 'navy.500' }} borderRadius="9px" fontSize="12px" onClick={() => { detailModal.onClose(); openEdit(detailInvoice); }}>Edit</Button>
                    <Button size="sm" flex="1" variant="outline" borderColor="#c23c3c" color="#c23c3c" borderRadius="9px" fontSize="12px" leftIcon={<Trash2Icon size={13} />} onClick={() => { setDeleteId(detailInvoice.id); confirmDel.onOpen(); }}>Delete</Button>
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
