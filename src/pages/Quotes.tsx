import React, { useCallback, useEffect, useState } from 'react';
import {
  Box,
  Button,
  Flex,
  FormControl,
  FormLabel,
  HStack,
  Icon,
  Input,
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
  useDisclosure,
  useToast } from '@chakra-ui/react';
import { DownloadIcon, FileTextIcon, HistoryIcon, LinkIcon, MailIcon, PlusIcon, PrinterIcon, Trash2Icon } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Card, CardHeader } from '../components/ui/Card';
import { StatusBadge } from '../components/ui/StatusBadge';
import { EmptyState } from '../components/ui/EmptyState';
import { FormDrawer } from '../components/ui/FormDrawer';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { exportToCsv } from '../lib/crud';

type Person = { id: string; name: string; company: string; avatar_color: string };
type Deal = { id: string; title: string; value: number; person_id: string | null; customer_id: string | null; stage: string };
type Customer = { id: string; person_id: string | null; status: string };
type Quote = {
  id: string;
  person_id: string | null;
  deal_id: string | null;
  number: string;
  amount: number;
  tax: number;
  status: string;
  version: number;
  items: number;
  notes: string;
  created_at: string;
};

const STATUS_OPTIONS = ['Draft', 'Sent', 'Approved', 'Rejected'];

export function Quotes() {
  const toast = useToast();
  const { session } = useAuth();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const formDrawer = useDisclosure();
  const confirmDel = useDisclosure();
  const [editing, setEditing] = useState<Quote | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ number: '', person_id: '', deal_id: '', amount: 0, tax: 0, status: 'Draft', items: 1, notes: '' });

  const load = useCallback(async () => {
    if (!session?.user) return;
    setLoading(true);
    const [qRes, pRes, dRes, cRes] = await Promise.all([
      supabase.from('quotes').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false }),
      supabase.from('people').select('*').eq('user_id', session.user.id),
      supabase.from('deals').select('*').eq('user_id', session.user.id),
      supabase.from('customers').select('*').eq('user_id', session.user.id)
    ]);
    setQuotes((qRes.data ?? []) as Quote[]);
    setPeople((pRes.data ?? []) as Person[]);
    setDeals((dRes.data ?? []) as Deal[]);
    setCustomers((cRes.data ?? []) as Customer[]);
    setLoading(false);
  }, [session]);

  useEffect(() => { load(); }, [load]);

  const personById = (id: string | null) => people.find((p) => p.id === id) ?? null;
  const dealById = (id: string | null) => deals.find((d) => d.id === id) ?? null;

  const nextNumber = () => {
    const max = quotes.reduce((m, q) => {
      const n = parseInt(q.number.replace(/\D/g, '')) || 0;
      return Math.max(m, n);
    }, 1042);
    return `QT-${max + 1}`;
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ number: nextNumber(), person_id: '', deal_id: '', amount: 0, tax: 0, status: 'Draft', items: 1, notes: '' });
    formDrawer.onOpen();
  };

  const openEdit = (quote: Quote) => {
    setEditing(quote);
    setForm({ number: quote.number, person_id: quote.person_id ?? '', deal_id: quote.deal_id ?? '', amount: quote.amount, tax: quote.tax, status: quote.status, items: quote.items, notes: quote.notes });
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
    if (!form.number.trim()) { toast({ title: 'Quote number is required', status: 'error', duration: 2000, position: 'top-right' }); return; }
    setSaving(true);
    if (editing) {
      const { error } = await supabase.from('quotes').update({
        number: form.number, person_id: form.person_id || null, deal_id: form.deal_id || null,
        amount: Number(form.amount), tax: Number(form.tax), status: form.status,
        items: Number(form.items), notes: form.notes, version: editing.version + 1
      }).eq('id', editing.id).eq('user_id', session!.user.id);
      if (!error) toast({ title: 'Quote updated (new version)', status: 'success', duration: 2000, position: 'top-right' });
    } else {
      const { error } = await supabase.from('quotes').insert({
        user_id: session!.user.id, number: form.number, person_id: form.person_id || null,
        deal_id: form.deal_id || null, amount: Number(form.amount), tax: Number(form.tax),
        status: form.status, version: 1, items: Number(form.items), notes: form.notes
      });
      if (!error && form.deal_id) {
        await supabase.from('deals').update({ quotation_status: form.status }).eq('id', form.deal_id).eq('user_id', session!.user.id);
      }
      if (!error) toast({ title: 'Quote created', status: 'success', duration: 2000, position: 'top-right' });
    }
    setSaving(false);
    formDrawer.onClose();
    load();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from('quotes').delete().eq('id', deleteId).eq('user_id', session!.user.id);
    if (!error) { toast({ title: 'Quote deleted', status: 'success', duration: 1800, position: 'top-right' }); load(); }
    confirmDel.onClose();
    setDeleteId(null);
  };

  const sendForApproval = async (quote: Quote) => {
    await supabase.from('quotes').update({ status: 'Sent' }).eq('id', quote.id).eq('user_id', session!.user.id);
    if (quote.deal_id) {
      await supabase.from('deals').update({ quotation_status: 'Sent' }).eq('id', quote.deal_id).eq('user_id', session!.user.id);
    }
    toast({ title: `${quote.number} sent for approval`, status: 'success', duration: 2000, position: 'top-right' });
    load();
  };

  const handleExport = () => {
    exportToCsv('quotes.csv', quotes.map((q) => {
      const p = personById(q.person_id);
      const d = dealById(q.deal_id);
      return { number: q.number, deal: d?.title ?? '', customer: p?.company ?? '', amount: q.amount, tax: q.tax, status: q.status, version: q.version, items: q.items, created: q.created_at };
    }));
    toast({ title: 'Exported to CSV', status: 'success', duration: 1800, position: 'top-right' });
  };

  return (
    <>
      <PageHeader
        title="Quotes"
        subtitle="Build, send, and track quotations linked to deals."
        actions={
          <HStack spacing="6px">
            <Button size="sm" variant="outline" borderColor="app.border" borderRadius="9px" fontSize="12px" leftIcon={<DownloadIcon size={14} />} onClick={handleExport}>Export</Button>
            <Button size="sm" borderRadius="9px" bg="navy.600" color="white" _hover={{ bg: 'navy.500' }} leftIcon={<PlusIcon size={15} />} fontSize="12px" onClick={openCreate}>New quote</Button>
          </HStack>
        } />

      <Card>
        <CardHeader title="All quotes" subtitle={`${quotes.length} quotes`} />
        {loading ? (
          <Flex py="60px" justify="center"><Spinner color="brand.500" /></Flex>
        ) : quotes.length === 0 ? (
          <EmptyState icon={FileTextIcon} title="No quotes found" description="Create a new quote or generate one from a deal." action={<Button size="sm" bg="navy.600" color="white" borderRadius="9px" fontSize="12px" leftIcon={<PlusIcon size={15} />} onClick={openCreate}>New quote</Button>} />
        ) : (
          <TableContainer>
            <Table size="sm">
              <Thead>
                <Tr>
                  <Th borderColor="app.border" fontSize="10px" color="app.faint">Quote</Th>
                  <Th borderColor="app.border" fontSize="10px" color="app.faint" display={{ base: 'none', md: 'table-cell' }}>Deal</Th>
                  <Th borderColor="app.border" fontSize="10px" color="app.faint" display={{ base: 'none', md: 'table-cell' }}>Customer</Th>
                  <Th borderColor="app.border" fontSize="10px" color="app.faint">Status</Th>
                  <Th borderColor="app.border" fontSize="10px" color="app.faint" isNumeric>Amount</Th>
                  <Th borderColor="app.border" fontSize="10px" color="app.faint" display={{ base: 'none', lg: 'table-cell' }}>Tax</Th>
                  <Th borderColor="app.border" w="80px"></Th>
                </Tr>
              </Thead>
              <Tbody>
                {quotes.map((quote) => {
                  const person = personById(quote.person_id);
                  const deal = dealById(quote.deal_id);
                  return (
                    <Tr key={quote.id} _hover={{ bg: 'app.surfaceAlt' }} cursor="pointer" onClick={() => openEdit(quote)}>
                      <Td borderColor="app.border">
                        <Text fontSize="12px" fontWeight="700">{quote.number}</Text>
                        <Flex align="center" gap="4px" color="app.faint">
                          <Icon as={HistoryIcon} boxSize="10px" />
                          <Text fontSize="9px">v{quote.version} · {quote.items} items</Text>
                        </Flex>
                      </Td>
                      <Td borderColor="app.border" display={{ base: 'none', md: 'table-cell' }}>
                        {deal ? (
                          <Flex align="center" gap="4px">
                            <Icon as={LinkIcon} boxSize="11px" color="brand.500" />
                            <Text fontSize="11px" fontWeight="600" noOfLines={1}>{deal.title}</Text>
                          </Flex>
                        ) : <Text fontSize="11px" color="app.faint">—</Text>}
                      </Td>
                      <Td borderColor="app.border" display={{ base: 'none', md: 'table-cell' }}>
                        <Text fontSize="12px">{person?.company ?? '—'}</Text>
                      </Td>
                      <Td borderColor="app.border"><StatusBadge status={quote.status} /></Td>
                      <Td borderColor="app.border" isNumeric fontSize="12px" fontWeight="700">${(quote.amount ?? 0).toLocaleString()}</Td>
                      <Td borderColor="app.border" isNumeric display={{ base: 'none', lg: 'table-cell' }} fontSize="12px" color="app.subtle">${(quote.tax ?? 0).toLocaleString()}</Td>
                      <Td borderColor="app.border">
                        <HStack spacing="2px" onClick={(e) => e.stopPropagation()}>
                          {quote.status === 'Draft' && <Button size="xs" variant="ghost" fontSize="10px" leftIcon={<MailIcon size={12} />} onClick={() => sendForApproval(quote)}>Send</Button>}
                          <Button size="xs" variant="ghost" fontSize="10px" leftIcon={<PrinterIcon size={12} />} onClick={() => toast({ title: `${quote.number} PDF generated`, status: 'info', duration: 1500, position: 'top-right' })}>PDF</Button>
                          <Button size="xs" variant="ghost" color="#c23c3c" onClick={() => { setDeleteId(quote.id); confirmDel.onOpen(); }}><Trash2Icon size={13} /></Button>
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

      <FormDrawer isOpen={formDrawer.isOpen} onClose={formDrawer.onClose} title={editing ? 'Edit quote' : 'New quote'} subtitle={editing ? 'Update quote details' : 'Create a quotation linked to a deal'} loading={saving} onSubmit={handleSubmit} submitLabel={editing ? 'Update' : 'Create'}>
        <FormControl>
          <FormLabel fontSize="12px">Quote number</FormLabel>
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
        <FormControl>
          <FormLabel fontSize="12px">Tax ($)</FormLabel>
          <Input type="number" value={form.tax} onChange={(e) => setForm({ ...form, tax: Number(e.target.value) })} size="sm" borderRadius="9px" borderColor="app.border" fontSize="13px" />
        </FormControl>
        <FormControl>
          <FormLabel fontSize="12px">Items</FormLabel>
          <Input type="number" value={form.items} onChange={(e) => setForm({ ...form, items: Number(e.target.value) })} size="sm" borderRadius="9px" borderColor="app.border" fontSize="13px" />
        </FormControl>
        <FormControl>
          <FormLabel fontSize="12px">Status</FormLabel>
          <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} size="sm" borderRadius="9px" borderColor="app.border" fontSize="13px">
            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>
        </FormControl>
        <FormControl>
          <FormLabel fontSize="12px">Notes</FormLabel>
          <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Quote notes..." size="sm" borderRadius="9px" borderColor="app.border" fontSize="13px" />
        </FormControl>
      </FormDrawer>

      <ConfirmDialog isOpen={confirmDel.isOpen} onClose={confirmDel.onClose} title="Delete quote" message="Are you sure you want to delete this quote?" confirmLabel="Delete" danger onConfirm={handleDelete} />
    </>
  );
}
