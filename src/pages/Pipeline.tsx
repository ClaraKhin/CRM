import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
  Select,
  Spinner,
  Text,
  useDisclosure,
  useToast } from '@chakra-ui/react';
import { FileTextIcon, PlusIcon, TrendingUpIcon } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { FormDrawer } from '../components/ui/FormDrawer';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

type Person = { id: string; name: string; company: string; avatar_color: string };
type Customer = { id: string; person_id: string | null; status: string; industry: string };
type Deal = {
  id: string;
  person_id: string | null;
  customer_id: string | null;
  title: string;
  value: number;
  project_volume: number;
  stage: string;
  probability: number;
  owner_id: string;
  owner_name: string;
  close_date: string | null;
  competitors: string;
  notes: string;
  deal_type: string;
  sale_type: string;
  quotation_status: string;
  created_at: string;
};

const stageOrder: { stage: string; tone: string }[] = [
  { stage: 'New', tone: '#6c7aea' },
  { stage: 'Contacted', tone: '#4f9de0' },
  { stage: 'Qualified', tone: '#2d9c79' },
  { stage: 'Meeting', tone: '#8374d9' },
  { stage: 'Proposal', tone: '#f0a13c' },
  { stage: 'Negotiation', tone: '#d85a9a' },
  { stage: 'Won', tone: '#1c8a5c' },
  { stage: 'Lost', tone: '#c23c3c' }
];

const OWNERS = [
  { id: 'o1', name: 'Renee Walker', color: '#ffdccb' },
  { id: 'o2', name: 'Marcus Chen', color: '#d8e7ff' },
  { id: 'o3', name: 'Priya Nair', color: '#eadbff' },
  { id: 'o4', name: 'Diego Alvarez', color: '#c9f0e3' }
];

const DEAL_TYPES = ['Project', 'Product', 'Service'];
const SALE_TYPES = ['New', 'Renewal', 'Upsell', 'Cross-sell'];
const QUOTATION_STATUSES = ['None', 'Draft', 'Sent', 'Approved'];

export function Pipeline() {
  const toast = useToast();
  const { session } = useAuth();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [dragId, setDragId] = useState<string | null>(null);
  const formDrawer = useDisclosure();
  const [editing, setEditing] = useState<Deal | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    title: '', person_id: '', customer_id: '', value: 0, project_volume: 0,
    stage: 'New', probability: 20, owner_id: 'o1', close_date: '',
    competitors: '', notes: '', deal_type: 'Project', sale_type: 'New', quotation_status: 'None'
  });

  const load = useCallback(async () => {
    if (!session?.user) return;
    setLoading(true);
    const [dealsRes, peopleRes, custRes] = await Promise.all([
      supabase.from('deals').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false }),
      supabase.from('people').select('*').eq('user_id', session.user.id),
      supabase.from('customers').select('*').eq('user_id', session.user.id)
    ]);
    setDeals((dealsRes.data ?? []) as Deal[]);
    setPeople((peopleRes.data ?? []) as Person[]);
    setCustomers((custRes.data ?? []) as Customer[]);
    setLoading(false);
  }, [session]);

  useEffect(() => { load(); }, [load]);

  const personById = (id: string | null) => people.find((p) => p.id === id) ?? null;
  const customerById = (id: string | null) => customers.find((c) => c.id === id) ?? null;
  const ownerById = (id: string) => OWNERS.find((o) => o.id === id) ?? OWNERS[0];

  const openValue = useMemo(() => deals.filter((d) => d.stage !== 'Won' && d.stage !== 'Lost').reduce((s, d) => s + d.value, 0), [deals]);
  const wonValue = useMemo(() => deals.filter((d) => d.stage === 'Won').reduce((s, d) => s + d.value, 0), [deals]);
  const totalProjectVolume = useMemo(() => deals.reduce((s, d) => s + (d.project_volume ?? 0), 0), [deals]);
  const forecast = useMemo(() => Math.round(deals.filter((d) => d.stage !== 'Lost').reduce((s, d) => s + d.value * d.probability / 100, 0)), [deals]);

  const onDrop = async (stage: string) => {
    if (!dragId) return;
    const deal = deals.find((d) => d.id === dragId);
    if (!deal) return;
    const probMap: Record<string, number> = { New: 20, Contacted: 30, Qualified: 50, Meeting: 60, Proposal: 70, Negotiation: 82, Won: 100, Lost: 0 };
    setDeals((prev) => prev.map((d) => d.id === dragId ? { ...d, stage, probability: probMap[stage] ?? d.probability } : d));
    await supabase.from('deals').update({ stage, probability: probMap[stage] ?? deal.probability }).eq('id', dragId).eq('user_id', session!.user.id);
    toast({ title: `Deal moved to ${stage}`, status: 'success', duration: 1600, position: 'top-right' });
    setDragId(null);
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ title: '', person_id: '', customer_id: '', value: 0, project_volume: 0, stage: 'New', probability: 20, owner_id: 'o1', close_date: '', competitors: '', notes: '', deal_type: 'Project', sale_type: 'New', quotation_status: 'None' });
    formDrawer.onOpen();
  };

  const openEdit = (deal: Deal) => {
    setEditing(deal);
    setForm({
      title: deal.title, person_id: deal.person_id ?? '', customer_id: deal.customer_id ?? '',
      value: deal.value, project_volume: deal.project_volume ?? 0, stage: deal.stage,
      probability: deal.probability, owner_id: deal.owner_id, close_date: deal.close_date ?? '',
      competitors: deal.competitors, notes: deal.notes,
      deal_type: deal.deal_type ?? 'Project', sale_type: deal.sale_type ?? 'New',
      quotation_status: deal.quotation_status ?? 'None'
    });
    formDrawer.onOpen();
  };

  const handleSubmit = async () => {
    if (!form.title.trim()) { toast({ title: 'Title is required', status: 'error', duration: 2000, position: 'top-right' }); return; }
    const owner = ownerById(form.owner_id);
    setSaving(true);
    if (editing) {
      const { error } = await supabase.from('deals').update({
        title: form.title, person_id: form.person_id || null, customer_id: form.customer_id || null,
        value: Number(form.value), project_volume: Number(form.project_volume),
        stage: form.stage, probability: Number(form.probability), owner_id: form.owner_id, owner_name: owner.name,
        close_date: form.close_date || null, competitors: form.competitors, notes: form.notes,
        deal_type: form.deal_type, sale_type: form.sale_type, quotation_status: form.quotation_status
      }).eq('id', editing.id).eq('user_id', session!.user.id);
      if (!error) toast({ title: 'Deal updated', status: 'success', duration: 2000, position: 'top-right' });
    } else {
      const { error } = await supabase.from('deals').insert({
        user_id: session!.user.id, title: form.title, person_id: form.person_id || null,
        customer_id: form.customer_id || null, value: Number(form.value), project_volume: Number(form.project_volume),
        stage: form.stage, probability: Number(form.probability), owner_id: form.owner_id, owner_name: owner.name,
        close_date: form.close_date || null, competitors: form.competitors, notes: form.notes,
        deal_type: form.deal_type, sale_type: form.sale_type, quotation_status: form.quotation_status
      });
      if (!error) toast({ title: 'Deal created', status: 'success', duration: 2000, position: 'top-right' });
    }
    setSaving(false);
    formDrawer.onClose();
    load();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('deals').delete().eq('id', id).eq('user_id', session!.user.id);
    if (!error) { toast({ title: 'Deal deleted', status: 'success', duration: 1800, position: 'top-right' }); load(); }
  };

  const generateQuote = async (deal: Deal) => {
    const maxRes = await supabase.from('quotes').select('number').eq('user_id', session!.user.id);
    const max = (maxRes.data ?? []).reduce((m, q) => {
      const n = parseInt((q.number ?? '').replace(/\D/g, '')) || 0;
      return Math.max(m, n);
    }, 1042);
    const { error } = await supabase.from('quotes').insert({
      user_id: session!.user.id, deal_id: deal.id, person_id: deal.person_id,
      number: `QT-${max + 1}`, amount: deal.value, tax: Math.round(deal.value * 0.1),
      status: 'Draft', version: 1, items: 1, notes: `Generated from deal: ${deal.title}`
    });
    if (!error) {
      await supabase.from('deals').update({ quotation_status: 'Draft' }).eq('id', deal.id).eq('user_id', session!.user.id);
      toast({ title: `Quote QT-${max + 1} generated from ${deal.title}`, status: 'success', duration: 2000, position: 'top-right' });
      load();
    }
  };

  return (
    <>
      <PageHeader
        title="Pipeline"
        subtitle="Drag deals between stages to update your forecast."
        actions={<Button size="sm" borderRadius="9px" bg="navy.600" color="white" _hover={{ bg: 'navy.500' }} leftIcon={<PlusIcon size={15} />} fontSize="12px" onClick={openCreate}>New deal</Button>} />

      <Grid templateColumns={{ base: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }} gap="12px" mb="18px">
        {[
          { label: 'Open pipeline', value: `$${openValue.toLocaleString()}` },
          { label: 'Weighted forecast', value: `$${forecast.toLocaleString()}` },
          { label: 'Won this quarter', value: `$${wonValue.toLocaleString()}` },
          { label: 'Total project volume', value: `$${totalProjectVolume.toLocaleString()}` }
        ].map((item) => (
          <Card key={item.label} p="15px">
            <Text fontSize="11px" color="app.subtle">{item.label}</Text>
            <Text mt="4px" fontFamily="'Plus Jakarta Sans', sans-serif" fontSize="19px" fontWeight="800" letterSpacing="-0.03em">{item.value}</Text>
          </Card>
        ))}
      </Grid>

      {loading ? (
        <Flex py="60px" justify="center"><Spinner color="brand.500" /></Flex>
      ) : (
        <Flex gap="12px" overflowX="auto" pb="8px">
          {stageOrder.map(({ stage, tone }) => {
            const stageDeals = deals.filter((d) => d.stage === stage);
            const total = stageDeals.reduce((s, d) => s + d.value, 0);
            return (
              <Box key={stage} minW="230px" flex="1" onDragOver={(e) => e.preventDefault()} onDrop={() => onDrop(stage)}>
                <Flex align="center" gap="7px" mb="10px" px="4px">
                  <Box w="8px" h="8px" borderRadius="full" bg={tone} />
                  <Text fontSize="12px" fontWeight="700">{stage}</Text>
                  <Text fontSize="10px" color="app.faint">({stageDeals.length})</Text>
                  <Text ml="auto" fontSize="10px" color="app.subtle" fontWeight="600">${(total / 1000).toFixed(1)}k</Text>
                </Flex>
                <Box bg="app.surfaceAlt" borderRadius="14px" p="8px" minH="120px">
                  {stageDeals.length === 0 ? (
                    <Flex h="80px" align="center" justify="center"><Text fontSize="10px" color="app.faint">Drop deals here</Text></Flex>
                  ) : stageDeals.map((deal) => {
                    const person = personById(deal.person_id);
                    const customer = customerById(deal.customer_id);
                    return (
                      <Box
                        key={deal.id}
                        draggable
                        onDragStart={() => setDragId(deal.id)}
                        onDoubleClick={() => openEdit(deal)}
                        mb="8px"
                        p="12px"
                        bg="app.surface"
                        borderRadius="12px"
                        border="1px solid"
                        borderColor="app.border"
                        cursor="grab"
                        _active={{ cursor: 'grabbing' }}
                        boxShadow="0 2px 5px rgba(24,35,57,.04)"
                        transition="transform .12s ease"
                        _hover={{ transform: 'translateY(-1px)' }}>
                        <Flex align="center" justify="space-between">
                          <Text fontSize="12px" fontWeight="700">{deal.title}</Text>
                          <Badge fontSize="8px" borderRadius="full" px="6px" py="2px" bg="app.surfaceAlt" color="app.subtle" textTransform="capitalize">{deal.deal_type ?? 'Project'}</Badge>
                        </Flex>
                        <Text mt="1px" fontSize="10px" color="app.subtle">{customer ? personById(customer.person_id)?.company ?? '—' : person?.company ?? '—'}</Text>
                        <Flex mt="10px" align="center" gap="6px">
                          <Text fontSize="13px" fontWeight="800">${deal.value.toLocaleString()}</Text>
                          <Flex align="center" gap="3px" ml="auto" color="#219669">
                            <Icon as={TrendingUpIcon} boxSize="11px" />
                            <Text fontSize="10px" fontWeight="700">{deal.probability}%</Text>
                          </Flex>
                          <Avatar size="2xs" name={person?.name ?? '?'} bg={person?.avatar_color ?? '#d8e7ff'} color="#46506a" fontSize="7px" />
                        </Flex>
                        {(deal.project_volume ?? 0) > 0 && (
                          <Text mt="4px" fontSize="9px" color="app.faint">Project volume: ${(deal.project_volume ?? 0).toLocaleString()}</Text>
                        )}
                        <Flex mt="6px" gap="4px" flexWrap="wrap">
                          <Badge fontSize="8px" borderRadius="full" px="5px" py="1px" bg="brand.50" color="brand.600" textTransform="capitalize">{deal.sale_type ?? 'New'}</Badge>
                          {deal.quotation_status && deal.quotation_status !== 'None' && (
                            <Badge fontSize="8px" borderRadius="full" px="5px" py="1px" bg="#e8f5ee" color="#1c8a5c" textTransform="capitalize">Quote: {deal.quotation_status}</Badge>
                          )}
                        </Flex>
                        {deal.close_date && <Text mt="4px" fontSize="9px" color="app.faint">Close: {deal.close_date}</Text>}
                        {deal.stage !== 'Won' && deal.stage !== 'Lost' && (
                          <Button mt="8px" size="xs" variant="ghost" fontSize="9px" leftIcon={<FileTextIcon size={11} />} onClick={(e) => { e.stopPropagation(); generateQuote(deal); }}>Generate Quote</Button>
                        )}
                      </Box>
                    );
                  })}
                </Box>
              </Box>
            );
          })}
        </Flex>
      )}

      <FormDrawer isOpen={formDrawer.isOpen} onClose={formDrawer.onClose} title={editing ? 'Edit deal' : 'New deal'} subtitle={editing ? 'Update deal details' : 'Create a new pipeline deal'} loading={saving} onSubmit={handleSubmit} submitLabel={editing ? 'Update' : 'Create'}>
        <FormControl>
          <FormLabel fontSize="12px">Deal title</FormLabel>
          <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Atlas Cloud platform" size="sm" borderRadius="9px" borderColor="app.border" fontSize="13px" />
        </FormControl>
        <FormControl>
          <FormLabel fontSize="12px">Customer (account)</FormLabel>
          <Select value={form.customer_id} onChange={(e) => setForm({ ...form, customer_id: e.target.value })} size="sm" borderRadius="9px" borderColor="app.border" fontSize="13px">
            <option value="">— Select customer —</option>
            {customers.map((c) => {
              const p = personById(c.person_id);
              return <option key={c.id} value={c.id}>{p?.company ?? 'Unknown'} ({c.status})</option>;
            })}
          </Select>
        </FormControl>
        <FormControl>
          <FormLabel fontSize="12px">Contact person</FormLabel>
          <Select value={form.person_id} onChange={(e) => setForm({ ...form, person_id: e.target.value })} size="sm" borderRadius="9px" borderColor="app.border" fontSize="13px">
            <option value="">— Select —</option>
            {people.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.company})</option>)}
          </Select>
        </FormControl>
        <Grid templateColumns="1fr 1fr" gap="10px">
          <FormControl>
            <FormLabel fontSize="12px">Deal value ($)</FormLabel>
            <Input type="number" value={form.value} onChange={(e) => setForm({ ...form, value: Number(e.target.value) })} placeholder="14300" size="sm" borderRadius="9px" borderColor="app.border" fontSize="13px" />
          </FormControl>
          <FormControl>
            <FormLabel fontSize="12px">Project volume ($)</FormLabel>
            <Input type="number" value={form.project_volume} onChange={(e) => setForm({ ...form, project_volume: Number(e.target.value) })} placeholder="50000" size="sm" borderRadius="9px" borderColor="app.border" fontSize="13px" />
          </FormControl>
        </Grid>
        <Grid templateColumns="1fr 1fr" gap="10px">
          <FormControl>
            <FormLabel fontSize="12px">Deal type</FormLabel>
            <Select value={form.deal_type} onChange={(e) => setForm({ ...form, deal_type: e.target.value })} size="sm" borderRadius="9px" borderColor="app.border" fontSize="13px">
              {DEAL_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </Select>
          </FormControl>
          <FormControl>
            <FormLabel fontSize="12px">Sale type</FormLabel>
            <Select value={form.sale_type} onChange={(e) => setForm({ ...form, sale_type: e.target.value })} size="sm" borderRadius="9px" borderColor="app.border" fontSize="13px">
              {SALE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </Select>
          </FormControl>
        </Grid>
        <Grid templateColumns="1fr 1fr" gap="10px">
          <FormControl>
            <FormLabel fontSize="12px">Stage</FormLabel>
            <Select value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value })} size="sm" borderRadius="9px" borderColor="app.border" fontSize="13px">
              {stageOrder.map((s) => <option key={s.stage} value={s.stage}>{s.stage}</option>)}
            </Select>
          </FormControl>
          <FormControl>
            <FormLabel fontSize="12px">Probability (%)</FormLabel>
            <Input type="number" value={form.probability} onChange={(e) => setForm({ ...form, probability: Number(e.target.value) })} size="sm" borderRadius="9px" borderColor="app.border" fontSize="13px" />
          </FormControl>
        </Grid>
        <Grid templateColumns="1fr 1fr" gap="10px">
          <FormControl>
            <FormLabel fontSize="12px">Owner</FormLabel>
            <Select value={form.owner_id} onChange={(e) => setForm({ ...form, owner_id: e.target.value })} size="sm" borderRadius="9px" borderColor="app.border" fontSize="13px">
              {OWNERS.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
            </Select>
          </FormControl>
          <FormControl>
            <FormLabel fontSize="12px">Quotation status</FormLabel>
            <Select value={form.quotation_status} onChange={(e) => setForm({ ...form, quotation_status: e.target.value })} size="sm" borderRadius="9px" borderColor="app.border" fontSize="13px">
              {QUOTATION_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </Select>
          </FormControl>
        </Grid>
        <FormControl>
          <FormLabel fontSize="12px">Expected close date</FormLabel>
          <Input type="date" value={form.close_date} onChange={(e) => setForm({ ...form, close_date: e.target.value })} size="sm" borderRadius="9px" borderColor="app.border" fontSize="13px" />
        </FormControl>
        <FormControl>
          <FormLabel fontSize="12px">Competitors</FormLabel>
          <Input value={form.competitors} onChange={(e) => setForm({ ...form, competitors: e.target.value })} placeholder="Competitor A, B" size="sm" borderRadius="9px" borderColor="app.border" fontSize="13px" />
        </FormControl>
        <FormControl>
          <FormLabel fontSize="12px">Notes</FormLabel>
          <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Deal notes..." size="sm" borderRadius="9px" borderColor="app.border" fontSize="13px" />
        </FormControl>
        {editing && <Button size="sm" variant="outline" borderColor="#c23c3c" color="#c23c3c" borderRadius="9px" fontSize="12px" onClick={() => { handleDelete(editing.id); formDrawer.onClose(); }}>Delete deal</Button>}
      </FormDrawer>
    </>
  );
}
