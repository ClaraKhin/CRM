import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Avatar,
  Box,
  Button,
  Flex,
  FormControl,
  FormLabel,
  Grid,
  Icon,
  Input,
  Select,
  Spinner,
  Text,
  useDisclosure,
  useToast } from
'@chakra-ui/react';
import { PlusIcon, TrendingUpIcon } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { FormDrawer } from '../components/ui/FormDrawer';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

type Person = { id: string; name: string; company: string; avatar_color: string };
type Deal = {
  id: string;
  person_id: string | null;
  title: string;
  value: number;
  stage: string;
  probability: number;
  owner_id: string;
  owner_name: string;
  close_date: string | null;
  competitors: string;
  notes: string;
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

export function Pipeline() {
  const toast = useToast();
  const { session } = useAuth();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [dragId, setDragId] = useState<string | null>(null);
  const formDrawer = useDisclosure();
  const [editing, setEditing] = useState<Deal | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    title: '', person_id: '', value: 0, stage: 'New', probability: 20,
    owner_id: 'o1', close_date: '', competitors: '', notes: ''
  });

  const load = useCallback(async () => {
    if (!session?.user) return;
    setLoading(true);
    const [dealsRes, peopleRes] = await Promise.all([
      supabase.from('deals').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false }),
      supabase.from('people').select('*').eq('user_id', session.user.id)
    ]);
    setDeals((dealsRes.data ?? []) as Deal[]);
    setPeople((peopleRes.data ?? []) as Person[]);
    setLoading(false);
  }, [session]);

  useEffect(() => { load(); }, [load]);

  const personById = (id: string | null) => people.find((p) => p.id === id) ?? null;
  const ownerById = (id: string) => OWNERS.find((o) => o.id === id) ?? OWNERS[0];

  const openValue = useMemo(() => deals.filter((d) => d.stage !== 'Won' && d.stage !== 'Lost').reduce((s, d) => s + d.value, 0), [deals]);
  const wonValue = useMemo(() => deals.filter((d) => d.stage === 'Won').reduce((s, d) => s + d.value, 0), [deals]);
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
    setForm({ title: '', person_id: '', value: 0, stage: 'New', probability: 20, owner_id: 'o1', close_date: '', competitors: '', notes: '' });
    formDrawer.onOpen();
  };

  const openEdit = (deal: Deal) => {
    setEditing(deal);
    setForm({
      title: deal.title, person_id: deal.person_id ?? '', value: deal.value, stage: deal.stage,
      probability: deal.probability, owner_id: deal.owner_id, close_date: deal.close_date ?? '',
      competitors: deal.competitors, notes: deal.notes
    });
    formDrawer.onOpen();
  };

  const handleSubmit = async () => {
    if (!form.title.trim()) { toast({ title: 'Title is required', status: 'error', duration: 2000, position: 'top-right' }); return; }
    const owner = ownerById(form.owner_id);
    setSaving(true);
    if (editing) {
      const { error } = await supabase.from('deals').update({
        title: form.title, person_id: form.person_id || null, value: Number(form.value),
        stage: form.stage, probability: Number(form.probability), owner_id: form.owner_id, owner_name: owner.name,
        close_date: form.close_date || null, competitors: form.competitors, notes: form.notes
      }).eq('id', editing.id).eq('user_id', session!.user.id);
      if (!error) toast({ title: 'Deal updated', status: 'success', duration: 2000, position: 'top-right' });
    } else {
      const { error } = await supabase.from('deals').insert({
        user_id: session!.user.id, title: form.title, person_id: form.person_id || null,
        value: Number(form.value), stage: form.stage, probability: Number(form.probability),
        owner_id: form.owner_id, owner_name: owner.name, close_date: form.close_date || null,
        competitors: form.competitors, notes: form.notes
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
          { label: 'Avg win probability', value: `${deals.length ? Math.round(deals.reduce((s, d) => s + d.probability, 0) / deals.length) : 0}%` }
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
                        <Text fontSize="12px" fontWeight="700">{deal.title}</Text>
                        <Text mt="1px" fontSize="10px" color="app.subtle">{person?.company ?? '—'}</Text>
                        <Flex mt="10px" align="center" gap="6px">
                          <Text fontSize="13px" fontWeight="800">${deal.value.toLocaleString()}</Text>
                          <Flex align="center" gap="3px" ml="auto" color="#219669">
                            <Icon as={TrendingUpIcon} boxSize="11px" />
                            <Text fontSize="10px" fontWeight="700">{deal.probability}%</Text>
                          </Flex>
                          <Avatar size="2xs" name={person?.name ?? '?'} bg={person?.avatar_color ?? '#d8e7ff'} color="#46506a" fontSize="7px" />
                        </Flex>
                        {deal.close_date && <Text mt="6px" fontSize="9px" color="app.faint">Close: {deal.close_date}</Text>}
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
          <FormLabel fontSize="12px">Customer</FormLabel>
          <Select value={form.person_id} onChange={(e) => setForm({ ...form, person_id: e.target.value })} size="sm" borderRadius="9px" borderColor="app.border" fontSize="13px">
            <option value="">— Select —</option>
            {people.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.company})</option>)}
          </Select>
        </FormControl>
        <FormControl>
          <FormLabel fontSize="12px">Deal value ($)</FormLabel>
          <Input type="number" value={form.value} onChange={(e) => setForm({ ...form, value: Number(e.target.value) })} placeholder="14300" size="sm" borderRadius="9px" borderColor="app.border" fontSize="13px" />
        </FormControl>
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
        <FormControl>
          <FormLabel fontSize="12px">Owner</FormLabel>
          <Select value={form.owner_id} onChange={(e) => setForm({ ...form, owner_id: e.target.value })} size="sm" borderRadius="9px" borderColor="app.border" fontSize="13px">
            {OWNERS.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
          </Select>
        </FormControl>
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
