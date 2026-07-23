import React, { useCallback, useEffect, useState } from 'react';
import {
  Badge, Box, Button, Divider, Flex, FormControl, FormLabel, Grid, HStack,
  Icon, Input, Modal, ModalBody, ModalCloseButton, ModalContent,
  ModalHeader, ModalOverlay, Select, Spinner, Stack, Table,
  TableContainer, Tbody, Td, Text, Th, Thead, Tr, useDisclosure, useToast, VStack
} from '@chakra-ui/react';
import {
  CalendarIcon, CheckCircleIcon, ClockIcon, CreditCardIcon, DownloadIcon,
  EyeIcon, LayoutGridIcon, ListIcon, PlusIcon, Trash2Icon, XCircleIcon, RefreshCwIcon
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { FormModal } from '../../components/ui/FormModal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { exportToCsv } from '../../lib/crud';

type Person = { id: string; name: string; company: string };
type Invoice = { id: string; number: string; amount: number; person_id: string | null; status: string };
type Payment = {
  id: string;
  invoice_id: string | null;
  person_id: string | null;
  amount: number;
  method: string;
  status: string;
  reference: string | null;
  notes: string | null;
  paid_at: string | null;
  created_at: string;
};

type PaymentForm = {
  invoice_id: string;
  person_id: string;
  amount: number;
  method: string;
  status: string;
  reference: string;
  notes: string;
  paid_at: string;
};

const METHODS = ['Credit Card', 'Bank Transfer', 'PayPal', 'Wire Transfer', 'Cash', 'Other'];
const STATUS_OPTIONS = ['completed', 'pending', 'failed', 'refunded'];

const statusConfig: Record<string, { color: string; bg: string; icon: typeof CheckCircleIcon; label: string }> = {
  completed: { color: '#2d9c79', bg: 'rgba(45, 156, 121, 0.1)', icon: CheckCircleIcon, label: 'Completed' },
  pending: { color: '#e9683f', bg: 'rgba(233, 104, 63, 0.1)', icon: ClockIcon, label: 'Pending' },
  failed: { color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)', icon: XCircleIcon, label: 'Failed' },
  refunded: { color: '#6366f1', bg: 'rgba(99, 102, 241, 0.1)', icon: RefreshCwIcon, label: 'Refunded' },
};

const emptyForm: PaymentForm = {
  invoice_id: '', person_id: '', amount: 0, method: 'Bank Transfer',
  status: 'pending', reference: '', notes: '', paid_at: new Date().toISOString().split('T')[0],
};

export function Payments() {
  const { session } = useAuth();
  const toast = useToast();
  const formModal = useDisclosure();
  const detailModal = useDisclosure();
  const confirmDel = useDisclosure();

  const [payments, setPayments] = useState<Payment[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const [form, setForm] = useState<PaymentForm>(emptyForm);
  const [editing, setEditing] = useState<Payment | null>(null);
  const [detailPayment, setDetailPayment] = useState<Payment | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!session?.user) return;
    setLoading(true);
    const [payRes, pplRes, invRes] = await Promise.all([
      supabase.from('payments').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false }),
      supabase.from('people').select('id, name, company').eq('user_id', session.user.id),
      supabase.from('invoices').select('id, number, amount, person_id, status').eq('user_id', session.user.id),
    ]);
    setPayments((payRes.data ?? []) as Payment[]);
    setPeople((pplRes.data ?? []) as Person[]);
    setInvoices((invRes.data ?? []) as Invoice[]);
    setLoading(false);
  }, [session]);

  useEffect(() => { load(); }, [load]);

  const personName = (id: string | null) => {
    if (!id) return '—';
    const p = people.find((x) => x.id === id);
    return p ? `${p.name}${p.company ? ` (${p.company})` : ''}` : '—';
  };

  const invoiceLabel = (id: string | null) => {
    if (!id) return '—';
    const inv = invoices.find((x) => x.id === id);
    return inv ? `${inv.number} — $${inv.amount.toLocaleString()}` : '—';
  };

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    formModal.onOpen();
  };

  const openEdit = (p: Payment) => {
    setEditing(p);
    setForm({
      invoice_id: p.invoice_id ?? '',
      person_id: p.person_id ?? '',
      amount: p.amount,
      method: p.method,
      status: p.status,
      reference: p.reference ?? '',
      notes: p.notes ?? '',
      paid_at: p.paid_at ? p.paid_at.split('T')[0] : '',
    });
    formModal.onOpen();
  };

  const openDetail = (p: Payment) => {
    setDetailPayment(p);
    detailModal.onOpen();
  };

  const onInvoiceSelect = (invoiceId: string) => {
    const inv = invoices.find((i) => i.id === invoiceId);
    setForm((prev) => ({
      ...prev,
      invoice_id: invoiceId,
      person_id: inv?.person_id ?? prev.person_id,
      amount: inv?.amount ?? prev.amount,
    }));
  };

  const handleSubmit = async () => {
    if (form.amount <= 0) {
      toast({ title: 'Amount must be greater than zero', status: 'error', duration: 2000, position: 'top-right' });
      return;
    }
    setSaving(true);
    if (editing) {
      const { error } = await supabase.from('payments').update({
        invoice_id: form.invoice_id || null,
        person_id: form.person_id || null,
        amount: Number(form.amount),
        method: form.method,
        status: form.status,
        reference: form.reference || null,
        notes: form.notes || null,
        paid_at: form.paid_at || null,
      }).eq('id', editing.id).eq('user_id', session!.user.id);
      if (!error) toast({ title: 'Payment updated', status: 'success', duration: 2000, position: 'top-right' });
    } else {
      const { error } = await supabase.from('payments').insert({
        user_id: session!.user.id,
        invoice_id: form.invoice_id || null,
        person_id: form.person_id || null,
        amount: Number(form.amount),
        method: form.method,
        status: form.status,
        reference: form.reference || null,
        notes: form.notes || null,
        paid_at: form.paid_at || null,
      });
      if (!error) toast({ title: 'Payment recorded', status: 'success', duration: 2000, position: 'top-right' });
    }
    setSaving(false);
    formModal.onClose();
    load();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from('payments').delete().eq('id', deleteId).eq('user_id', session!.user.id);
    if (!error) { toast({ title: 'Payment deleted', status: 'success', duration: 1800, position: 'top-right' }); load(); }
    confirmDel.onClose();
    setDeleteId(null);
  };

  const markCompleted = async (payment: Payment) => {
    await supabase.from('payments').update({ status: 'completed', paid_at: new Date().toISOString() }).eq('id', payment.id).eq('user_id', session!.user.id);
    toast({ title: 'Payment marked as completed', status: 'success', duration: 2000, position: 'top-right' });
    load();
  };

  const handleExport = () => {
    exportToCsv('payments', payments.map((p) => ({
      id: p.id,
      customer: personName(p.person_id),
      invoice: invoiceLabel(p.invoice_id),
      amount: p.amount,
      method: p.method,
      status: p.status,
      reference: p.reference ?? '',
      paid_at: p.paid_at ?? '',
      created_at: p.created_at,
    })));
    toast({ title: 'Exported to CSV', status: 'success', duration: 1800, position: 'top-right' });
  };

  // Summary metrics
  const totalReceived = payments.filter((p) => p.status === 'completed').reduce((s, p) => s + p.amount, 0);
  const totalPending = payments.filter((p) => p.status === 'pending').reduce((s, p) => s + p.amount, 0);
  const totalFailed = payments.filter((p) => p.status === 'failed').reduce((s, p) => s + p.amount, 0);

  if (loading) {
    return (
      <Flex minH="200px" align="center" justify="center"><Spinner color="brand.500" /></Flex>
    );
  }

  return (
    <>
      <PageHeader
        title="Payments"
        subtitle="Track and manage payment transactions."
        crumb="Sales / Payments"
        actions={
          <HStack spacing="8px">
            <Button size="sm" variant="outline" borderColor="app.border" borderRadius="9px" fontSize="12px" leftIcon={<DownloadIcon size={14} />} onClick={handleExport}>Export</Button>
            <Button size="sm" variant={viewMode === 'grid' ? 'solid' : 'ghost'} colorScheme="brand" borderRadius="9px" fontSize="12px" onClick={() => setViewMode('grid')} leftIcon={<LayoutGridIcon size={14} />}>Grid</Button>
            <Button size="sm" variant={viewMode === 'list' ? 'solid' : 'ghost'} colorScheme="brand" borderRadius="9px" fontSize="12px" onClick={() => setViewMode('list')} leftIcon={<ListIcon size={14} />}>List</Button>
            <Button size="sm" bg="navy.600" color="white" _hover={{ bg: 'navy.500' }} borderRadius="9px" fontSize="12px" leftIcon={<PlusIcon size={14} />} onClick={openCreate}>Record payment</Button>
          </HStack>
        }
      />

      {/* Summary cards */}
      <Grid templateColumns={{ base: '1fr', md: 'repeat(3, 1fr)' }} gap="16px" mb="24px">
        <Card p="18px">
          <Flex align="center" gap="12px">
            <Flex w="40px" h="40px" borderRadius="12px" bg="rgba(45, 156, 121, 0.1)" align="center" justify="center">
              <CheckCircleIcon size={20} color="#2d9c79" />
            </Flex>
            <Box>
              <Text fontSize="11px" color="app.subtle">Total received</Text>
              <Text fontSize="18px" fontWeight="700" color="app.text">${totalReceived.toLocaleString()}</Text>
            </Box>
          </Flex>
        </Card>
        <Card p="18px">
          <Flex align="center" gap="12px">
            <Flex w="40px" h="40px" borderRadius="12px" bg="rgba(233, 104, 63, 0.1)" align="center" justify="center">
              <ClockIcon size={20} color="#e9683f" />
            </Flex>
            <Box>
              <Text fontSize="11px" color="app.subtle">Pending</Text>
              <Text fontSize="18px" fontWeight="700" color="app.text">${totalPending.toLocaleString()}</Text>
            </Box>
          </Flex>
        </Card>
        <Card p="18px">
          <Flex align="center" gap="12px">
            <Flex w="40px" h="40px" borderRadius="12px" bg="rgba(239, 68, 68, 0.1)" align="center" justify="center">
              <XCircleIcon size={20} color="#ef4444" />
            </Flex>
            <Box>
              <Text fontSize="11px" color="app.subtle">Failed</Text>
              <Text fontSize="18px" fontWeight="700" color="app.text">${totalFailed.toLocaleString()}</Text>
            </Box>
          </Flex>
        </Card>
      </Grid>

      {payments.length === 0 ? (
        <EmptyState icon={CreditCardIcon} title="No payments yet" description="Record your first payment transaction." actionLabel="Record payment" onAction={openCreate} />
      ) : viewMode === 'grid' ? (
        <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }} gap="20px">
          {payments.map((payment) => {
            const config = statusConfig[payment.status] ?? statusConfig.pending;
            return (
              <Card key={payment.id} transition="all 0.3s ease" _hover={{ transform: 'translateY(-4px)', shadow: 'xl' }}>
                <Box p="24px">
                  <Flex align="center" justify="space-between" mb="16px">
                    <Flex align="center" justify="center" w="48px" h="48px" borderRadius="12px" bg="brand.50">
                      <Icon as={CreditCardIcon} boxSize="24px" color="brand.500" />
                    </Flex>
                    <Badge bg={config.bg} color={config.color} borderRadius="full" fontSize="11px" fontWeight="700" px="10px" py="4px" textTransform="uppercase" letterSpacing="0.05em">
                      {config.label}
                    </Badge>
                  </Flex>
                  <VStack align="start" spacing="4px" mb="16px">
                    <Text fontSize="16px" fontWeight="700" color="app.text">${payment.amount.toLocaleString()}</Text>
                    <Text fontSize="13px" color="app.subtle">{personName(payment.person_id)}</Text>
                    {payment.invoice_id && <Text fontSize="11px" color="app.faint">Invoice: {invoiceLabel(payment.invoice_id)}</Text>}
                  </VStack>
                  <Divider borderColor="app.border" mb="16px" />
                  <Flex justify="space-between" align="center">
                    <Flex align="center" gap="4px">
                      <Icon as={CalendarIcon} boxSize="14px" color="app.subtle" />
                      <Text fontSize="12px" color="app.subtle">{payment.paid_at ? new Date(payment.paid_at).toLocaleDateString() : new Date(payment.created_at).toLocaleDateString()}</Text>
                    </Flex>
                    <HStack spacing="4px">
                      <Button size="xs" variant="ghost" color="brand.500" onClick={() => openDetail(payment)}>
                        <EyeIcon size={14} />
                      </Button>
                      {payment.status === 'pending' && (
                        <Button size="xs" variant="ghost" color="#2d9c79" onClick={() => markCompleted(payment)}>
                          <CheckCircleIcon size={14} />
                        </Button>
                      )}
                      <Button size="xs" variant="ghost" color="red.400" onClick={() => { setDeleteId(payment.id); confirmDel.onOpen(); }}>
                        <Trash2Icon size={14} />
                      </Button>
                    </HStack>
                  </Flex>
                </Box>
              </Card>
            );
          })}
        </Grid>
      ) : (
        <Card>
          <TableContainer>
            <Table variant="simple" size="sm">
              <Thead>
                <Tr>
                  <Th fontSize="11px">Customer</Th>
                  <Th fontSize="11px">Amount</Th>
                  <Th fontSize="11px">Method</Th>
                  <Th fontSize="11px">Invoice</Th>
                  <Th fontSize="11px">Date</Th>
                  <Th fontSize="11px">Status</Th>
                  <Th fontSize="11px">Actions</Th>
                </Tr>
              </Thead>
              <Tbody>
                {payments.map((payment) => {
                  const config = statusConfig[payment.status] ?? statusConfig.pending;
                  return (
                    <Tr key={payment.id} _hover={{ bg: 'app.surfaceAlt' }}>
                      <Td><Text fontSize="13px" fontWeight="600" color="app.text">{personName(payment.person_id)}</Text></Td>
                      <Td><Text fontSize="13px" fontWeight="700" color="app.text">${payment.amount.toLocaleString()}</Text></Td>
                      <Td><Text fontSize="12px" color="app.subtle">{payment.method}</Text></Td>
                      <Td><Text fontSize="12px" color="app.subtle">{payment.invoice_id ? invoiceLabel(payment.invoice_id) : '—'}</Text></Td>
                      <Td>
                        <Flex align="center" gap="4px">
                          <Icon as={CalendarIcon} boxSize="12px" color="app.subtle" />
                          <Text fontSize="12px" color="app.subtle">{payment.paid_at ? new Date(payment.paid_at).toLocaleDateString() : new Date(payment.created_at).toLocaleDateString()}</Text>
                        </Flex>
                      </Td>
                      <Td>
                        <Badge bg={config.bg} color={config.color} borderRadius="full" fontSize="10px" fontWeight="700" px="8px" py="3px" textTransform="uppercase">
                          {config.label}
                        </Badge>
                      </Td>
                      <Td>
                        <HStack spacing="4px">
                          <Button size="xs" variant="ghost" color="brand.500" onClick={() => openDetail(payment)}><EyeIcon size={14} /></Button>
                          <Button size="xs" variant="ghost" color="brand.500" onClick={() => openEdit(payment)}>Edit</Button>
                          {payment.status === 'pending' && (
                            <Button size="xs" variant="ghost" color="#2d9c79" onClick={() => markCompleted(payment)}><CheckCircleIcon size={14} /></Button>
                          )}
                          <Button size="xs" variant="ghost" color="red.400" onClick={() => { setDeleteId(payment.id); confirmDel.onOpen(); }}><Trash2Icon size={14} /></Button>
                        </HStack>
                      </Td>
                    </Tr>
                  );
                })}
              </Tbody>
            </Table>
          </TableContainer>
        </Card>
      )}

      {/* Create / Edit Form Modal */}
      <FormModal
        isOpen={formModal.isOpen}
        onClose={formModal.onClose}
        title={editing ? 'Edit payment' : 'Record payment'}
        subtitle={editing ? 'Update payment details' : 'Record a new payment transaction'}
        loading={saving}
        onSubmit={handleSubmit}
        submitLabel={editing ? 'Update' : 'Record'}>
        <FormControl>
          <FormLabel fontSize="12px">Link to invoice</FormLabel>
          <Select value={form.invoice_id} onChange={(e) => onInvoiceSelect(e.target.value)} size="sm" borderRadius="9px" borderColor="app.border" fontSize="13px">
            <option value="">— No invoice —</option>
            {invoices.map((inv) => <option key={inv.id} value={inv.id}>{inv.number} — ${inv.amount.toLocaleString()}</option>)}
          </Select>
        </FormControl>
        <FormControl>
          <FormLabel fontSize="12px">Customer</FormLabel>
          <Select value={form.person_id} onChange={(e) => setForm({ ...form, person_id: e.target.value })} size="sm" borderRadius="9px" borderColor="app.border" fontSize="13px">
            <option value="">— Select customer —</option>
            {people.map((p) => <option key={p.id} value={p.id}>{p.name}{p.company ? ` (${p.company})` : ''}</option>)}
          </Select>
        </FormControl>
        <FormControl>
          <FormLabel fontSize="12px">Amount ($)</FormLabel>
          <Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} size="sm" borderRadius="9px" borderColor="app.border" fontSize="13px" />
        </FormControl>
        <Grid templateColumns="1fr 1fr" gap="10px">
          <FormControl>
            <FormLabel fontSize="12px">Method</FormLabel>
            <Select value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })} size="sm" borderRadius="9px" borderColor="app.border" fontSize="13px">
              {METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
            </Select>
          </FormControl>
          <FormControl>
            <FormLabel fontSize="12px">Status</FormLabel>
            <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} size="sm" borderRadius="9px" borderColor="app.border" fontSize="13px">
              {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
            </Select>
          </FormControl>
        </Grid>
        <FormControl>
          <FormLabel fontSize="12px">Payment date</FormLabel>
          <Input type="date" value={form.paid_at} onChange={(e) => setForm({ ...form, paid_at: e.target.value })} size="sm" borderRadius="9px" borderColor="app.border" fontSize="13px" />
        </FormControl>
        <FormControl>
          <FormLabel fontSize="12px">Reference / Transaction ID</FormLabel>
          <Input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} size="sm" borderRadius="9px" borderColor="app.border" fontSize="13px" placeholder="e.g. TXN-123456" />
        </FormControl>
        <FormControl>
          <FormLabel fontSize="12px">Notes</FormLabel>
          <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} size="sm" borderRadius="9px" borderColor="app.border" fontSize="13px" placeholder="Optional notes" />
        </FormControl>
      </FormModal>

      {/* Detail Modal */}
      <Modal isOpen={detailModal.isOpen} onClose={detailModal.onClose} size="md" isCentered>
        <ModalOverlay backdropFilter="blur(4px)" />
        <ModalContent bg="app.surface" borderRadius="18px" overflow="hidden">
          <ModalHeader borderBottom="1px solid" borderColor="app.border" pb="14px">
            {detailPayment && (
              <Flex align="center" gap="10px">
                <Icon as={CreditCardIcon} boxSize="18px" color="brand.500" />
                <Text fontFamily="'Plus Jakarta Sans', sans-serif" fontWeight="800" fontSize="16px">Payment Details</Text>
              </Flex>
            )}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody py="18px">
            {detailPayment && (
              <Stack spacing="14px">
                <Flex gap="8px" flexWrap="wrap">
                  <Badge bg={statusConfig[detailPayment.status]?.bg} color={statusConfig[detailPayment.status]?.color} borderRadius="full" fontSize="10px" fontWeight="700" px="8px" py="3px" textTransform="uppercase">
                    {statusConfig[detailPayment.status]?.label}
                  </Badge>
                  <Badge fontSize="10px" borderRadius="full" px="8px" py="3px" bg="brand.50" color="brand.600">{detailPayment.method}</Badge>
                </Flex>
                <Grid templateColumns="1fr 1fr" gap="12px">
                  <Box><Text fontSize="10px" color="app.faint">Amount</Text><Text fontSize="18px" fontWeight="700">${detailPayment.amount.toLocaleString()}</Text></Box>
                  <Box><Text fontSize="10px" color="app.faint">Customer</Text><Text fontSize="12px" fontWeight="600">{personName(detailPayment.person_id)}</Text></Box>
                  <Box><Text fontSize="10px" color="app.faint">Invoice</Text><Text fontSize="12px" fontWeight="600">{invoiceLabel(detailPayment.invoice_id)}</Text></Box>
                  <Box><Text fontSize="10px" color="app.faint">Payment date</Text><Text fontSize="12px" fontWeight="600">{detailPayment.paid_at ? new Date(detailPayment.paid_at).toLocaleDateString() : '—'}</Text></Box>
                  <Box><Text fontSize="10px" color="app.faint">Reference</Text><Text fontSize="12px" fontWeight="600">{detailPayment.reference ?? '—'}</Text></Box>
                  <Box><Text fontSize="10px" color="app.faint">Created</Text><Text fontSize="12px" fontWeight="600">{new Date(detailPayment.created_at).toLocaleDateString()}</Text></Box>
                </Grid>
                {detailPayment.notes && (
                  <Box p="12px" bg="app.surfaceAlt" borderRadius="10px">
                    <Text fontSize="10px" color="app.faint" mb="4px">Notes</Text>
                    <Text fontSize="12px" color="app.text">{detailPayment.notes}</Text>
                  </Box>
                )}
                <Flex gap="8px" mt="6px">
                  <Button size="sm" bg="navy.600" color="white" _hover={{ bg: 'navy.500' }} borderRadius="9px" fontSize="12px" onClick={() => { detailModal.onClose(); openEdit(detailPayment); }}>Edit</Button>
                  {detailPayment.status === 'pending' && (
                    <Button size="sm" bg="#2d9c79" color="white" _hover={{ bg: '#248a6b' }} borderRadius="9px" fontSize="12px" onClick={() => { detailModal.onClose(); markCompleted(detailPayment); }}>Mark completed</Button>
                  )}
                  <Button size="sm" variant="outline" borderColor="red.200" color="red.500" borderRadius="9px" fontSize="12px" onClick={() => { detailModal.onClose(); setDeleteId(detailPayment.id); confirmDel.onOpen(); }}>Delete</Button>
                </Flex>
              </Stack>
            )}
          </ModalBody>
        </ModalContent>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={confirmDel.isOpen}
        onClose={confirmDel.onClose}
        onConfirm={handleDelete}
        title="Delete payment"
        message="Are you sure you want to delete this payment record? This action cannot be undone."
      />
    </>
  );
}
