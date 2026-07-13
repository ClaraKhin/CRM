import React, { useCallback, useEffect, useState } from 'react';
import {
  Box,
  Button,
  Flex,
  FormControl,
  FormLabel,
  Icon,
  Input,
  Select,
  Spinner,
  Switch,
  Text,
  useDisclosure,
  useToast } from
'@chakra-ui/react';
import { ArrowRightIcon, PlusIcon, Trash2Icon, ZapIcon } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Card, CardHeader } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { FormModal } from '../components/ui/FormModal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

type Automation = {
  id: string;
  name: string;
  trigger: string;
  action: string;
  enabled: boolean;
  runs: number;
};

const TRIGGER_OPTIONS = [
  'New lead created', 'No activity for 48h', 'Lead qualified', 'Deal > $30k in negotiation',
  'Invoice past due date', 'New customer added', 'Task overdue', 'Quote sent'
];
const ACTION_OPTIONS = [
  'Assign to round-robin rep', 'Create task + notify owner', 'Send 3-email sequence',
  'Notify sales manager', 'Slack finance channel', 'Send welcome email', 'Escalate to admin'
];

export function Automation() {
  const toast = useToast();
  const { session } = useAuth();
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [loading, setLoading] = useState(true);
  const formDrawer = useDisclosure();
  const confirmDel = useDisclosure();
  const [editing, setEditing] = useState<Automation | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', trigger: TRIGGER_OPTIONS[0], action: ACTION_OPTIONS[0], enabled: true });

  const load = useCallback(async () => {
    if (!session?.user) return;
    setLoading(true);
    const { data } = await supabase.from('automations').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false });
    setAutomations((data ?? []) as Automation[]);
    setLoading(false);
  }, [session]);

  useEffect(() => { load(); }, [load]);

  const toggle = async (id: string) => {
    const auto = automations.find((a) => a.id === id);
    if (!auto) return;
    setAutomations((prev) => prev.map((a) => a.id === id ? { ...a, enabled: !a.enabled } : a));
    await supabase.from('automations').update({ enabled: !auto.enabled }).eq('id', id).eq('user_id', session!.user.id);
    toast({ title: `${auto.name} ${auto.enabled ? 'disabled' : 'enabled'}`, status: 'info', duration: 1600, position: 'top-right' });
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', trigger: TRIGGER_OPTIONS[0], action: ACTION_OPTIONS[0], enabled: true });
    formDrawer.onOpen();
  };

  const openEdit = (auto: Automation) => {
    setEditing(auto);
    setForm({ name: auto.name, trigger: auto.trigger, action: auto.action, enabled: auto.enabled });
    formDrawer.onOpen();
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) { toast({ title: 'Name is required', status: 'error', duration: 2000, position: 'top-right' }); return; }
    setSaving(true);
    if (editing) {
      const { error } = await supabase.from('automations').update({
        name: form.name, trigger: form.trigger, action: form.action, enabled: form.enabled
      }).eq('id', editing.id).eq('user_id', session!.user.id);
      if (!error) toast({ title: 'Rule updated', status: 'success', duration: 2000, position: 'top-right' });
    } else {
      const { error } = await supabase.from('automations').insert({
        user_id: session!.user.id, name: form.name, trigger: form.trigger, action: form.action, enabled: form.enabled, runs: 0
      });
      if (!error) toast({ title: 'Rule created', status: 'success', duration: 2000, position: 'top-right' });
    }
    setSaving(false);
    formDrawer.onClose();
    load();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from('automations').delete().eq('id', deleteId).eq('user_id', session!.user.id);
    if (!error) { toast({ title: 'Rule deleted', status: 'success', duration: 1800, position: 'top-right' }); load(); }
    confirmDel.onClose();
    setDeleteId(null);
  };

  return (
    <>
      <PageHeader
        title="Automation"
        subtitle="Workflow rules that run on autopilot."
        actions={<Button size="sm" borderRadius="9px" bg="navy.600" color="white" _hover={{ bg: 'navy.500' }} leftIcon={<PlusIcon size={15} />} fontSize="12px" onClick={openCreate}>New rule</Button>} />

      <Card>
        <CardHeader title="Automation rules" subtitle={`${automations.filter((a) => a.enabled).length} active`} />
        {loading ? (
          <Flex py="60px" justify="center"><Spinner color="brand.500" /></Flex>
        ) : automations.length === 0 ? (
          <EmptyState icon={ZapIcon} title="No automation rules" description="Create a rule to automate your workflow." action={<Button size="sm" bg="navy.600" color="white" borderRadius="9px" fontSize="12px" leftIcon={<PlusIcon size={15} />} onClick={openCreate}>New rule</Button>} />
        ) : (
          <Box px={{ base: '14px', md: '20px' }} py="8px">
            {automations.map((rule, i) => (
              <Flex key={rule.id} align="center" gap="14px" py="16px" borderBottom={i === automations.length - 1 ? '0' : '1px solid'} borderColor="app.border" flexWrap={{ base: 'wrap', md: 'nowrap' }} cursor="pointer" onClick={() => openEdit(rule)}>
                <Flex w="38px" h="38px" borderRadius="11px" bg="brand.50" align="center" justify="center" flexShrink={0}>
                  <Icon as={ZapIcon} boxSize="17px" color="#e9683f" />
                </Flex>
                <Box minW="0">
                  <Text fontSize="13px" fontWeight="700">{rule.name}</Text>
                  <Text fontSize="10px" color="app.faint">{rule.runs} runs</Text>
                </Box>
                <Flex align="center" gap="8px" ml={{ base: 0, md: 'auto' }} flexWrap="wrap">
                  <Box px="10px" py="5px" bg="app.surfaceAlt" borderRadius="8px"><Text fontSize="11px">{rule.trigger}</Text></Box>
                  <Icon as={ArrowRightIcon} boxSize="14px" color="app.faint" />
                  <Box px="10px" py="5px" bg="app.surfaceAlt" borderRadius="8px"><Text fontSize="11px">{rule.action}</Text></Box>
                </Flex>
                <Flex align="center" gap="6px" ml={{ base: 'auto', md: '4px' }} onClick={(e) => e.stopPropagation()}>
                  <Button size="xs" variant="ghost" color="#c23c3c" onClick={() => { setDeleteId(rule.id); confirmDel.onOpen(); }}><Trash2Icon size={13} /></Button>
                  <Switch isChecked={rule.enabled} onChange={() => toggle(rule.id)} colorScheme="orange" size="sm" />
                </Flex>
              </Flex>
            ))}
          </Box>
        )}
      </Card>

      <FormModal isOpen={formDrawer.isOpen} onClose={formDrawer.onClose} title={editing ? 'Edit rule' : 'New rule'} subtitle={editing ? 'Update automation rule' : 'Create a new automation rule'} loading={saving} onSubmit={handleSubmit} submitLabel={editing ? 'Update' : 'Create'}>
        <FormControl>
          <FormLabel fontSize="12px">Rule name</FormLabel>
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Auto-assign new leads" size="sm" borderRadius="9px" borderColor="app.border" fontSize="13px" />
        </FormControl>
        <FormControl>
          <FormLabel fontSize="12px">Trigger</FormLabel>
          <Select value={form.trigger} onChange={(e) => setForm({ ...form, trigger: e.target.value })} size="sm" borderRadius="9px" borderColor="app.border" fontSize="13px">
            {TRIGGER_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
          </Select>
        </FormControl>
        <FormControl>
          <FormLabel fontSize="12px">Action</FormLabel>
          <Select value={form.action} onChange={(e) => setForm({ ...form, action: e.target.value })} size="sm" borderRadius="9px" borderColor="app.border" fontSize="13px">
            {ACTION_OPTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
          </Select>
        </FormControl>
        <FormControl>
          <Flex align="center" gap="10px">
            <Switch isChecked={form.enabled} onChange={(e) => setForm({ ...form, enabled: e.target.checked })} colorScheme="orange" />
            <Text fontSize="12px">Enable immediately</Text>
          </Flex>
        </FormControl>
      </FormModal>

      <ConfirmDialog isOpen={confirmDel.isOpen} onClose={confirmDel.onClose} title="Delete rule" message="Are you sure you want to delete this automation rule?" confirmLabel="Delete" danger onConfirm={handleDelete} />
    </>
  );
}
