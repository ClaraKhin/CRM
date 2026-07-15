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
  Select,
  Spinner,
  Stack,
  Switch,
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
import { GaugeIcon, PlusIcon, Trash2Icon, ZapIcon } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Card, CardHeader } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { FormModal } from '../components/ui/FormModal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

type ScoreRule = {
  id: string;
  name: string;
  condition_field: string;
  condition_operator: string;
  condition_value: string;
  points: number;
  enabled: boolean;
};

type Lead = { id: string; person_id: string | null; source: string; score: number; ai_score: number; status: string; value: number };
type Person = { id: string; name: string; company: string; avatar_color: string };

const SCORE_FIELDS = ['source', 'status', 'value'];
const SCORE_OPERATORS = ['equals', 'contains', 'greater_than', 'less_than'];
const FIELD_LABELS: Record<string, string> = { source: 'Lead Source', status: 'Lead Status', value: 'Deal Value' };
const OPERATOR_LABELS: Record<string, string> = { equals: 'Equals', contains: 'Contains', greater_than: 'Greater Than', less_than: 'Less Than' };

export function LeadScoring() {
  const toast = useToast();
  const { session } = useAuth();
  const [rules, setRules] = useState<ScoreRule[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const ruleModal = useDisclosure();
  const confirmDel = useDisclosure();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', condition_field: 'source', condition_operator: 'equals', condition_value: '', points: 10 });

  const load = useCallback(async () => {
    if (!session?.user) return;
    setLoading(true);
    const [rRes, lRes, pRes] = await Promise.all([
      supabase.from('lead_score_rules').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false }),
      supabase.from('leads').select('*').eq('user_id', session.user.id).order('ai_score', { ascending: false }).limit(20),
      supabase.from('people').select('*').eq('user_id', session.user.id)
    ]);
    setRules((rRes.data ?? []) as ScoreRule[]);
    setLeads((lRes.data ?? []) as Lead[]);
    setPeople((pRes.data ?? []) as Person[]);
    setLoading(false);
  }, [session]);

  useEffect(() => { load(); }, [load]);

  const personById = (id: string | null) => people.find((p) => p.id === id) ?? null;

  const openCreate = () => {
    setEditingId(null);
    setForm({ name: '', condition_field: 'source', condition_operator: 'equals', condition_value: '', points: 10 });
    ruleModal.onOpen();
  };

  const openEdit = (r: ScoreRule) => {
    setEditingId(r.id);
    setForm({ name: r.name, condition_field: r.condition_field, condition_operator: r.condition_operator, condition_value: r.condition_value, points: r.points });
    ruleModal.onOpen();
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) { toast({ title: 'Rule name is required', status: 'error', duration: 2000, position: 'top-right' }); return; }
    setSaving(true);
    if (editingId) {
      await supabase.from('lead_score_rules').update(form).eq('id', editingId).eq('user_id', session!.user.id);
      toast({ title: 'Rule updated', status: 'success', duration: 2000, position: 'top-right' });
    } else {
      await supabase.from('lead_score_rules').insert({ user_id: session!.user.id, ...form, enabled: true });
      toast({ title: 'Rule created', status: 'success', duration: 2000, position: 'top-right' });
    }
    setSaving(false);
    ruleModal.onClose();
    load();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await supabase.from('lead_score_rules').delete().eq('id', deleteId).eq('user_id', session!.user.id);
    toast({ title: 'Rule deleted', status: 'success', duration: 1800, position: 'top-right' });
    confirmDel.onClose();
    setDeleteId(null);
    load();
  };

  const toggleRule = async (r: ScoreRule) => {
    setRules((prev) => prev.map((x) => x.id === r.id ? { ...x, enabled: !x.enabled } : x));
    await supabase.from('lead_score_rules').update({ enabled: !r.enabled }).eq('id', r.id).eq('user_id', session!.user.id);
  };

  const recalculateScores = async () => {
    if (!session?.user || rules.length === 0) return;
    const enabledRules = rules.filter((r) => r.enabled);
    for (const lead of leads) {
      let newScore = 0;
      for (const rule of enabledRules) {
        const fieldValue = String((lead as any)[rule.condition_field] ?? '');
        const ruleValue = String(rule.condition_value);
        let match = false;
        if (rule.condition_operator === 'equals') match = fieldValue === ruleValue;
        else if (rule.condition_operator === 'contains') match = fieldValue.toLowerCase().includes(ruleValue.toLowerCase());
        else if (rule.condition_operator === 'greater_than') match = Number(fieldValue) > Number(ruleValue);
        else if (rule.condition_operator === 'less_than') match = Number(fieldValue) < Number(ruleValue);
        if (match) newScore += rule.points;
      }
      newScore = Math.min(100, Math.max(0, newScore));
      if (newScore !== lead.ai_score) {
        await supabase.from('leads').update({ ai_score: newScore }).eq('id', lead.id).eq('user_id', session.user.id);
      }
    }
    toast({ title: 'Scores recalculated', status: 'success', duration: 2000, position: 'top-right' });
    load();
  };

  const avgScore = leads.length > 0 ? Math.round(leads.reduce((s, l) => s + (l.ai_score ?? 0), 0) / leads.length) : 0;
  const hotLeads = leads.filter((l) => (l.ai_score ?? 0) >= 70).length;
  const coldLeads = leads.filter((l) => (l.ai_score ?? 0) < 40).length;

  return (
    <>
      <PageHeader
        title="Lead Scoring"
        subtitle="Configure automated scoring rules to prioritize your leads."
        actions={
          <HStack spacing="6px">
            <Button size="sm" variant="outline" borderColor="app.border" borderRadius="9px" fontSize="12px" leftIcon={<ZapIcon size={14} />} onClick={recalculateScores} isDisabled={rules.length === 0}>Recalculate</Button>
            <Button size="sm" borderRadius="9px" bg="navy.600" color="white" _hover={{ bg: 'navy.500' }} leftIcon={<PlusIcon size={15} />} fontSize="12px" onClick={openCreate}>New rule</Button>
          </HStack>
        } />

      <Grid templateColumns={{ base: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }} gap="12px" mb="18px">
        <Card p="16px">
          <Flex align="center" gap="10px">
            <Flex w="36px" h="36px" borderRadius="11px" bg="brand.50" align="center" justify="center"><Icon as={GaugeIcon} boxSize="18px" color="#e9683f" /></Flex>
            <Box><Text fontSize="10px" color="app.subtle">Avg Score</Text><Text fontSize="20px" fontWeight="800">{avgScore}</Text></Box>
          </Flex>
        </Card>
        <Card p="16px">
          <Text fontSize="10px" color="app.subtle">Active Rules</Text>
          <Text fontSize="20px" fontWeight="800">{rules.filter((r) => r.enabled).length}</Text>
        </Card>
        <Card p="16px">
          <Text fontSize="10px" color="app.subtle">Hot Leads (70+)</Text>
          <Text fontSize="20px" fontWeight="800" color="#1c8a5c">{hotLeads}</Text>
        </Card>
        <Card p="16px">
          <Text fontSize="10px" color="app.subtle">Cold Leads (&lt;40)</Text>
          <Text fontSize="20px" fontWeight="800" color="#c23c3c">{coldLeads}</Text>
        </Card>
      </Grid>

      <Grid templateColumns={{ base: '1fr', xl: '1fr 380px' }} gap="18px">
        <Card>
          <CardHeader title="Scoring rules" subtitle={`${rules.length} rules configured`} />
          {loading ? (
            <Flex py="60px" justify="center"><Spinner color="brand.500" /></Flex>
          ) : rules.length === 0 ? (
            <EmptyState icon={GaugeIcon} title="No scoring rules" description="Create rules to automatically score leads based on their attributes." action={<Button size="sm" bg="navy.600" color="white" borderRadius="9px" fontSize="12px" leftIcon={<PlusIcon size={15} />} onClick={openCreate}>New rule</Button>} />
          ) : (
            <TableContainer>
              <Table size="sm">
                <Thead>
                  <Tr>
                    <Th borderColor="app.border" fontSize="10px" color="app.faint">Rule</Th>
                    <Th borderColor="app.border" fontSize="10px" color="app.faint">Condition</Th>
                    <Th borderColor="app.border" fontSize="10px" color="app.faint" isNumeric>Points</Th>
                    <Th borderColor="app.border" fontSize="10px" color="app.faint">Active</Th>
                    <Th borderColor="app.border" w="60px"></Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {rules.map((r) => (
                    <Tr key={r.id} _hover={{ bg: 'app.surfaceAlt' }} cursor="pointer" onClick={() => openEdit(r)}>
                      <Td borderColor="app.border" fontSize="12px" fontWeight="700">{r.name}</Td>
                      <Td borderColor="app.border" fontSize="11px" color="app.subtle">
                        {FIELD_LABELS[r.condition_field] ?? r.condition_field} {OPERATOR_LABELS[r.condition_operator] ?? r.condition_operator} "{r.condition_value}"
                      </Td>
                      <Td borderColor="app.border" isNumeric fontSize="12px" fontWeight="700">+{r.points}</Td>
                      <Td borderColor="app.border"><Switch isChecked={r.enabled} onChange={(e) => { e.stopPropagation(); toggleRule(r); }} colorScheme="orange" size="sm" /></Td>
                      <Td borderColor="app.border" onClick={(e) => e.stopPropagation()}>
                        <Button size="xs" variant="ghost" color="#c23c3c" onClick={() => { setDeleteId(r.id); confirmDel.onOpen(); }}><Trash2Icon size={13} /></Button>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </TableContainer>
          )}
        </Card>

        <Card>
          <CardHeader title="Top scored leads" subtitle="Ranked by AI score" />
          <Stack px="18px" py="8px" spacing="0" maxH="500px" overflowY="auto">
            {loading ? (
              <Text py="20px" fontSize="12px" color="app.faint" textAlign="center">Loading...</Text>
            ) : leads.length === 0 ? (
              <Text py="20px" fontSize="12px" color="app.faint" textAlign="center">No leads yet.</Text>
            ) : leads.map((lead, i) => {
              const person = personById(lead.person_id);
              const score = lead.ai_score ?? 0;
              const color = score >= 70 ? '#1c8a5c' : score >= 40 ? '#b5760f' : '#c23c3c';
              return (
                <Flex key={lead.id} py="11px" borderBottom={i === leads.length - 1 ? '0' : '1px solid'} borderColor="app.border" gap="10px" align="center">
                  <Text fontSize="11px" fontWeight="700" color="app.faint" w="20px">{i + 1}</Text>
                  <Box flex="1" minW="0">
                    <Text fontSize="12px" fontWeight="600" noOfLines={1}>{person?.name ?? 'Unknown'}</Text>
                    <Text fontSize="10px" color="app.faint">{person?.company ?? '—'}</Text>
                  </Box>
                  <Flex align="center" gap="6px">
                    <Box w="40px" h="5px" bg="app.surfaceAlt" borderRadius="full" overflow="hidden">
                      <Box h="full" bg={color} borderRadius="full" style={{ width: `${score}%` }} />
                    </Box>
                    <Text fontSize="12px" fontWeight="800" color={color} minW="28px" textAlign="right">{score}</Text>
                  </Flex>
                </Flex>
              );
            })}
          </Stack>
        </Card>
      </Grid>

      <FormModal isOpen={ruleModal.isOpen} onClose={ruleModal.onClose} title={editingId ? 'Edit rule' : 'New scoring rule'} subtitle={editingId ? 'Update scoring rule' : 'Create an automated lead scoring rule'} loading={saving} onSubmit={handleSubmit} submitLabel={editingId ? 'Update' : 'Create'}>
        <FormControl>
          <FormLabel fontSize="12px">Rule name</FormLabel>
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="High-value website leads" size="sm" borderRadius="9px" borderColor="app.border" fontSize="13px" />
        </FormControl>
        <Grid templateColumns="1fr 1fr" gap="10px">
          <FormControl>
            <FormLabel fontSize="12px">Field</FormLabel>
            <Select value={form.condition_field} onChange={(e) => setForm({ ...form, condition_field: e.target.value })} size="sm" borderRadius="9px" borderColor="app.border" fontSize="13px">
              {SCORE_FIELDS.map((f) => <option key={f} value={f}>{FIELD_LABELS[f]}</option>)}
            </Select>
          </FormControl>
          <FormControl>
            <FormLabel fontSize="12px">Operator</FormLabel>
            <Select value={form.condition_operator} onChange={(e) => setForm({ ...form, condition_operator: e.target.value })} size="sm" borderRadius="9px" borderColor="app.border" fontSize="13px">
              {SCORE_OPERATORS.map((o) => <option key={o} value={o}>{OPERATOR_LABELS[o]}</option>)}
            </Select>
          </FormControl>
        </Grid>
        <Grid templateColumns="1fr 1fr" gap="10px">
          <FormControl>
            <FormLabel fontSize="12px">Value</FormLabel>
            <Input value={form.condition_value} onChange={(e) => setForm({ ...form, condition_value: e.target.value })} placeholder="Website" size="sm" borderRadius="9px" borderColor="app.border" fontSize="13px" />
          </FormControl>
          <FormControl>
            <FormLabel fontSize="12px">Points</FormLabel>
            <Input type="number" value={form.points} onChange={(e) => setForm({ ...form, points: Number(e.target.value) })} size="sm" borderRadius="9px" borderColor="app.border" fontSize="13px" />
          </FormControl>
        </Grid>
      </FormModal>

      <ConfirmDialog isOpen={confirmDel.isOpen} onClose={confirmDel.onClose} title="Delete rule" message="Are you sure you want to delete this scoring rule?" confirmLabel="Delete" danger onConfirm={handleDelete} />
    </>
  );
}
