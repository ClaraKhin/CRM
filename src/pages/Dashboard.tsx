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
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Stack,
  Text,
  useDisclosure,
  useToast } from
'@chakra-ui/react';
import {
  AlertCircleIcon,
  BotIcon,
  CalendarClockIcon,
  ChevronDownIcon,
  CircleDollarSignIcon,
  Clock3Icon,
  FlameIcon,
  LayoutListIcon,
  MailIcon,
  PhoneIcon,
  PlusIcon,
  RefreshCwIcon,
  TargetIcon,
  TrendingUpIcon,
  UsersRoundIcon,
  ZapIcon } from
'lucide-react';
import { useNavigate } from 'react-router-dom';
import { MetricCard } from '../components/dashboard/MetricCard';
import { RevenueChart } from '../components/dashboard/RevenueChart';
import { AiBriefing } from '../components/dashboard/AiBriefing';
import { Card, CardHeader } from '../components/ui/Card';
import { PageHeader } from '../components/ui/PageHeader';
import { StatusBadge } from '../components/ui/StatusBadge';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

type Deal = { id: string; title: string; value: number; stage: string; probability: number; owner_name: string; close_date: string | null; customer_id: string | null; project_volume: number; deal_type: string; sale_type: string; quotation_status: string; person_id: string | null; competitors: string; notes: string };
type Task = { id: string; title: string; done: boolean; due_date: string | null; priority: string; owner_name: string };
type Activity = { id: string; type: string; subject: string; description: string; created_at: string };
type Customer = { id: string; person_id: string | null; status: string; industry: string };
type Person = { id: string; name: string; company: string; email: string; phone: string; avatar_color: string };
type Lead = { id: string; person_id: string | null; source: string; score: number; ai_score: number; status: string; owner_name: string; value: number; follow_up_date: string | null };
type Invoice = { id: string; number: string; amount: number; status: string; due_date: string | null };

const stageColors: Record<string, string> = { New: '#6c7aea', Contacted: '#4f9de0', Qualified: '#2d9c79', Meeting: '#8374d9', Proposal: '#f0a13c', Negotiation: '#d85a9a', Won: '#1c8a5c', Lost: '#c23c3c' };
const activityColors: Record<string, string> = { Call: '#4f9de0', Email: '#e9683f', Meeting: '#8374d9', WhatsApp: '#2d9c79', Telegram: '#3355c9', SMS: '#f0a13c', Note: '#6b7488' };

export function Dashboard() {
  const [period, setPeriod] = useState('This month');
  const [deals, setDeals] = useState<Deal[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const { session, profile } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const detailModal = useDisclosure();
  const [detailDeal, setDetailDeal] = useState<Deal | null>(null);

  const load = useCallback(async () => {
    if (!session?.user) return;
    setLoading(true);
    const [dRes, tRes, aRes, cRes, pRes, lRes, iRes] = await Promise.all([
      supabase.from('deals').select('*').eq('user_id', session.user.id),
      supabase.from('tasks').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false }).limit(8),
      supabase.from('activities').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false }).limit(8),
      supabase.from('customers').select('*').eq('user_id', session.user.id),
      supabase.from('people').select('*').eq('user_id', session.user.id),
      supabase.from('leads').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false }).limit(6),
      supabase.from('invoices').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false }).limit(5)
    ]);
    setDeals((dRes.data ?? []) as Deal[]);
    setTasks((tRes.data ?? []) as Task[]);
    setActivities((aRes.data ?? []) as Activity[]);
    setCustomers((cRes.data ?? []) as Customer[]);
    setPeople((pRes.data ?? []) as Person[]);
    setLeads((lRes.data ?? []) as Lead[]);
    setInvoices((iRes.data ?? []) as Invoice[]);
    setLoading(false);
  }, [session]);

  useEffect(() => { load(); }, [load]);

  const syncData = async () => {
    setSyncing(true);
    await load();
    setLastSync(new Date().toLocaleTimeString());
    setSyncing(false);
    toast({ title: 'Dashboard data synced', status: 'success', duration: 1600, position: 'top-right' });
  };

  // Computed metrics
  const wonValue = useMemo(() => deals.filter((d) => d.stage === 'Won').reduce((s, d) => s + d.value, 0), [deals]);
  const lostValue = useMemo(() => deals.filter((d) => d.stage === 'Lost').reduce((s, d) => s + d.value, 0), [deals]);
  const openValue = useMemo(() => deals.filter((d) => d.stage !== 'Won' && d.stage !== 'Lost').reduce((s, d) => s + d.value, 0), [deals]);
  const projectVolume = useMemo(() => deals.reduce((s, d) => s + (d.project_volume ?? 0), 0), [deals]);
  const avgProb = deals.length ? Math.round(deals.reduce((s, d) => s + d.probability, 0) / deals.length) : 0;
  const activeCustomers = customers.filter((c) => c.status === 'Customer' || c.status === 'VIP').length;
  const newLeadsCount = leads.filter((l) => l.status === 'New').length;
  const qualifiedLeads = leads.filter((l) => l.status === 'Qualified' || l.status === 'Proposal').length;
  const pendingTasks = tasks.filter((t) => !t.done);
  const highPriorityTasks = pendingTasks.filter((t) => t.priority === 'High');
  const overdueInvoices = invoices.filter((i) => i.status === 'Overdue');
  const overdueAmount = overdueInvoices.reduce((s, i) => s + i.amount, 0);
  const wonDeals = deals.filter((d) => d.stage === 'Won');
  const lostDeals = deals.filter((d) => d.stage === 'Lost');
  const winRate = deals.length > 0 ? Math.round((wonDeals.length / (wonDeals.length + lostDeals.length || 1)) * 100) : 0;

  // Stage distribution for chart
  const stageDistribution = ['New', 'Contacted', 'Qualified', 'Meeting', 'Proposal', 'Negotiation', 'Won'].map((stage) => ({
    label: stage, value: deals.filter((d) => d.stage === stage).length, color: stageColors[stage]
  })).filter((s) => s.value > 0);

  // Upcoming deals (closing soon)
  const upcomingDeals = useMemo(() =>
    deals.filter((d) => d.close_date && d.stage !== 'Won' && d.stage !== 'Lost')
      .sort((a, b) => (a.close_date ?? '').localeCompare(b.close_date ?? ''))
      .slice(0, 5)
  , [deals]);

  // Pending deals (in negotiation/proposal stage)
  const pendingDeals = useMemo(() =>
    deals.filter((d) => d.stage === 'Negotiation' || d.stage === 'Proposal')
      .sort((a, b) => b.value - a.value)
      .slice(0, 5)
  , [deals]);

  const todayTasks = pendingTasks.slice(0, 5);
  const personById = (id: string | null) => people.find((p) => p.id === id) ?? null;

  const showCopilot = () => { navigate('/assistant'); };
  const greetingName = profile?.full_name?.split(' ')[0] ?? 'Renee';

  const openDealDetail = (deal: Deal) => {
    setDetailDeal(deal);
    detailModal.onOpen();
  };

  return (
    <>
      <PageHeader
        title={`Good morning, ${greetingName} ✦`}
        subtitle="Here's what's happening across your sales team."
        crumb="Dashboard"
        actions={
          <>
            <Button size="sm" borderRadius="9px" variant="outline" borderColor="app.border" fontSize="12px" rightIcon={<ChevronDownIcon size={14} />} onClick={() => setPeriod(period === 'This month' ? 'Last month' : 'This month')}>
              {period}
            </Button>
            <Button size="sm" borderRadius="9px" variant="outline" borderColor="app.border" fontSize="12px" leftIcon={<RefreshCwIcon size={14} />} isLoading={syncing} onClick={syncData}>
              {lastSync ? `Synced ${lastSync}` : 'Sync'}
            </Button>
            <Button size="sm" borderRadius="9px" bg="navy.600" color="white" _hover={{ bg: 'navy.500' }} leftIcon={<BotIcon size={15} />} fontSize="12px" onClick={showCopilot}>
              Ask Copilot
            </Button>
          </>
        } />

      {/* Row 1: 6 metric cards */}
      <Grid templateColumns={{ base: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)', xl: 'repeat(6, 1fr)' }} gap={{ base: '11px', md: '14px' }}>
        <MetricCard label="Revenue (won)" value={`$${wonValue.toLocaleString()}`} trend="18.6%" icon={CircleDollarSignIcon} accent="#242d4b" />
        <MetricCard label="Open pipeline" value={`$${openValue.toLocaleString()}`} trend="8.1%" icon={TrendingUpIcon} accent="#8374d9" />
        <MetricCard label="Project volume" value={`$${projectVolume.toLocaleString()}`} trend="12.3%" icon={TargetIcon} accent="#e9683f" />
        <MetricCard label="Active customers" value={String(activeCustomers)} trend="5.2%" icon={UsersRoundIcon} accent="#2d9c79" />
        <MetricCard label="New leads" value={String(newLeadsCount)} trend="22.4%" icon={FlameIcon} accent="#d85a9a" />
        <MetricCard label="Win rate" value={`${winRate}%`} trend="3.1%" icon={ZapIcon} accent="#3355c9" />
      </Grid>

      {/* Row 2: Revenue chart + AI briefing */}
      <Grid mt="18px" templateColumns={{ base: '1fr', xl: 'minmax(0, 1.62fr) minmax(290px, .9fr)' }} gap="18px">
        <RevenueChart />
        <AiBriefing onAction={showCopilot} />
      </Grid>

      {/* Row 3: Stage distribution bar chart + Pending deals */}
      <Grid mt="18px" templateColumns={{ base: '1fr', xl: 'minmax(0, 1.62fr) minmax(290px, .9fr)' }} gap="18px">
        <Card>
          <CardHeader title="Pipeline by stage" subtitle="Deal distribution across stages" right={<Icon as={TargetIcon} boxSize="18px" color="#e9653c" />} />
          <Box px="20px" py="14px">
            {loading ? (
              <Text fontSize="12px" color="app.faint">Loading...</Text>
            ) : stageDistribution.length === 0 ? (
              <Text fontSize="12px" color="app.faint">No deals in pipeline yet.</Text>
            ) : (
              <Stack spacing="12px">
                {stageDistribution.map((s) => {
                  const maxVal = Math.max(...stageDistribution.map((x) => x.value));
                  return (
                    <Flex key={s.label} align="center" gap="10px">
                      <Box w="8px" h="8px" borderRadius="full" bg={s.color} flexShrink={0} />
                      <Text fontSize="11px" w="80px" color="app.subtle" flexShrink={0}>{s.label}</Text>
                      <Box flex="1" bg="app.surfaceAlt" borderRadius="7px" h="22px" overflow="hidden">
                        <Flex h="full" align="center" justify="end" px="8px" bg={s.color} borderRadius="7px" minW="28px" style={{ width: `${(s.value / maxVal) * 100}%` }}>
                          <Text fontSize="10px" fontWeight="700" color="white">{s.value}</Text>
                        </Flex>
                      </Box>
                    </Flex>
                  );
                })}
              </Stack>
            )}
          </Box>
        </Card>

        <Card>
          <CardHeader title="Pending deals" subtitle="In proposal & negotiation" right={<Badge bg="brand.50" color="brand.600" fontSize="9px" borderRadius="full" px="8px">{pendingDeals.length}</Badge>} />
          <Stack px="19px" py="8px" spacing="0">
            {loading ? (
              <Text py="20px" fontSize="12px" color="app.faint" textAlign="center">Loading...</Text>
            ) : pendingDeals.length === 0 ? (
              <Text py="20px" fontSize="12px" color="app.faint" textAlign="center">No pending deals.</Text>
            ) : pendingDeals.map((deal, i) => (
              <Flex key={deal.id} py="11px" borderBottom={i === pendingDeals.length - 1 ? '0' : '1px solid'} borderColor="app.border" gap="9px" align="center" cursor="pointer" _hover={{ bg: 'app.surfaceAlt' }} borderRadius="8px" px="6px" onClick={() => openDealDetail(deal)}>
                <Box w="6px" h="6px" borderRadius="full" bg={stageColors[deal.stage] ?? '#6b7488'} flexShrink={0} />
                <Box flex="1">
                  <Text fontSize="12px" fontWeight="600" noOfLines={1}>{deal.title}</Text>
                  <Text fontSize="10px" color="app.faint">{deal.stage} · {deal.probability}%</Text>
                </Box>
                <Text fontSize="12px" fontWeight="700">${deal.value.toLocaleString()}</Text>
              </Flex>
            ))}
          </Stack>
        </Card>
      </Grid>

      {/* Row 4: Upcoming deals + Today's tasks */}
      <Grid mt="18px" templateColumns={{ base: '1fr', xl: 'minmax(0, 1.62fr) minmax(290px, .9fr)' }} gap="18px">
        <Card>
          <CardHeader title="Upcoming deals" subtitle="Closing soon — sorted by close date" right={<Icon as={CalendarClockIcon} boxSize="18px" color="#e9653c" />} />
          <Stack px="19px" py="8px" spacing="0">
            {loading ? (
              <Text py="20px" fontSize="12px" color="app.faint" textAlign="center">Loading...</Text>
            ) : upcomingDeals.length === 0 ? (
              <Text py="20px" fontSize="12px" color="app.faint" textAlign="center">No upcoming deal closings.</Text>
            ) : upcomingDeals.map((deal, i) => {
              const person = personById(deal.person_id);
              const daysLeft = deal.close_date ? Math.ceil((new Date(deal.close_date).getTime() - Date.now()) / 86400000) : 0;
              return (
                <Flex key={deal.id} py="11px" borderBottom={i === upcomingDeals.length - 1 ? '0' : '1px solid'} borderColor="app.border" gap="10px" align="center" cursor="pointer" _hover={{ bg: 'app.surfaceAlt' }} borderRadius="8px" px="6px" onClick={() => openDealDetail(deal)}>
                  <Avatar size="xs" name={person?.name ?? '?'} bg={person?.avatar_color ?? '#d8e7ff'} color="#46506a" fontSize="8px" />
                  <Box flex="1">
                    <Text fontSize="12px" fontWeight="600" noOfLines={1}>{deal.title}</Text>
                    <Text fontSize="10px" color="app.faint">{person?.company ?? '—'} · {deal.stage}</Text>
                  </Box>
                  <Box textAlign="right">
                    <Text fontSize="12px" fontWeight="700">${deal.value.toLocaleString()}</Text>
                    <Text fontSize="9px" color={daysLeft < 3 ? '#c23c3c' : 'app.faint'}>{daysLeft > 0 ? `${daysLeft}d left` : 'Due today'}</Text>
                  </Box>
                </Flex>
              );
            })}
          </Stack>
        </Card>

        <Card>
          <CardHeader title="Today's tasks" subtitle="Your next 24 hours" right={<Badge bg={highPriorityTasks.length > 0 ? '#fde8e8' : 'app.surfaceAlt'} color={highPriorityTasks.length > 0 ? '#c23c3c' : 'app.subtle'} fontSize="9px" borderRadius="full" px="8px">{pendingTasks.length} pending</Badge>} />
          <Stack px="19px" py="8px" spacing="0">
            {loading ? (
              <Text py="20px" fontSize="12px" color="app.faint" textAlign="center">Loading...</Text>
            ) : todayTasks.length === 0 ? (
              <Text py="20px" fontSize="12px" color="app.faint" textAlign="center">No pending tasks. You're all caught up!</Text>
            ) : todayTasks.map((task, i) => (
              <Flex key={task.id} py="11px" borderBottom={i === todayTasks.length - 1 ? '0' : '1px solid'} borderColor="app.border" gap="9px" align="center">
                <Box w="6px" h="6px" borderRadius="full" bg={task.priority === 'High' ? '#c23c3c' : task.priority === 'Medium' ? '#b5760f' : '#6b7488'} />
                <Box flex="1">
                  <Text fontSize="12px" fontWeight="600">{task.title}</Text>
                  <Text fontSize="10px" color="app.faint">{task.due_date ?? 'No due date'} · {task.owner_name}</Text>
                </Box>
                {task.priority === 'High' && <Icon as={AlertCircleIcon} boxSize="13px" color="#c23c3c" />}
              </Flex>
            ))}
          </Stack>
        </Card>
      </Grid>

      {/* Row 5: Recent activity + Invoice alerts + Quick stats */}
      <Grid mt="18px" templateColumns={{ base: '1fr', xl: 'minmax(0, 1.62fr) minmax(290px, .9fr)' }} gap="18px">
        <Card>
          <CardHeader title="Recent activity" subtitle="Latest from your team" right={<Icon as={LayoutListIcon} boxSize="16px" color="app.faint" />} />
          <Stack px="19px" py="8px" spacing="0">
            {loading ? (
              <Text py="20px" fontSize="12px" color="app.faint" textAlign="center">Loading...</Text>
            ) : activities.length === 0 ? (
              <Text py="20px" fontSize="12px" color="app.faint" textAlign="center">No recent activity.</Text>
            ) : activities.map((item, i) => (
              <Flex key={item.id} py="11px" borderBottom={i === activities.length - 1 ? '0' : '1px solid'} borderColor="app.border" gap="9px">
                <Box w="28px" h="28px" borderRadius="9px" bg={activityColors[item.type] ?? '#f0f0f0'} display="flex" alignItems="center" justifyContent="center" flexShrink={0}>
                  <Text fontSize="9px" fontWeight="700" color="white">{item.type[0]}</Text>
                </Box>
                <Box flex="1">
                  <Text fontSize="12px"><Text as="span" fontWeight="700">{item.subject}</Text></Text>
                  <Text fontSize="10px" color="app.subtle">{item.type} · {new Date(item.created_at).toLocaleDateString()}</Text>
                </Box>
              </Flex>
            ))}
          </Stack>
        </Card>

        <Stack spacing="18px">
          {/* Invoice alerts */}
          <Card p="19px">
            <Flex align="center">
              <Text fontFamily="'Plus Jakarta Sans', sans-serif" fontWeight="800" fontSize="15px">Invoice alerts</Text>
              <Icon as={AlertCircleIcon} ml="auto" boxSize="16px" color={overdueInvoices.length > 0 ? '#c23c3c' : 'app.faint'} />
            </Flex>
            {overdueInvoices.length > 0 ? (
              <Box mt="12px">
                <Text fontSize="11px" color="#c23c3c" fontWeight="600">{overdueInvoices.length} overdue invoice{overdueInvoices.length > 1 ? 's' : ''}</Text>
                <Text mt="2px" fontSize="18px" fontWeight="800" color="#c23c3c">${overdueAmount.toLocaleString()}</Text>
                <Text fontSize="10px" color="app.faint">Total overdue amount</Text>
              </Box>
            ) : (
              <Text mt="12px" fontSize="12px" color="app.faint">No overdue invoices. All caught up!</Text>
            )}
            {invoices.filter((i) => i.status === 'Pending').length > 0 && (
              <Flex mt="10px" align="center" gap="8px">
                <Box w="6px" h="6px" borderRadius="full" bg="#b5760f" />
                <Text fontSize="11px" color="app.subtle">{invoices.filter((i) => i.status === 'Pending').length} pending invoices</Text>
              </Flex>
            )}
          </Card>

          {/* Quick stats */}
          <Card p="19px">
            <Flex align="center">
              <Text fontFamily="'Plus Jakarta Sans', sans-serif" fontWeight="800" fontSize="15px">Team momentum</Text>
              <Icon as={LayoutListIcon} ml="auto" boxSize="16px" color="app.faint" />
            </Flex>
            <Flex mt="15px" align="center" gap="13px">
              <Box w="66px" h="66px" border="8px solid" borderColor="#f5ded5" borderTopColor="#e9683f" borderRadius="full" display="flex" alignItems="center" justifyContent="center">
                <Text fontSize="12px" fontWeight="800">{avgProb}%</Text>
              </Box>
              <Box>
                <Text fontSize="12px" fontWeight="700">On-track performance</Text>
                <Text mt="3px" fontSize="10px" color="app.subtle">{pendingDeals.length + qualifiedLeads} deals advancing.</Text>
              </Box>
            </Flex>
            <Stack mt="16px" spacing="7px">
              <Button size="sm" variant="outline" borderColor="app.border" borderRadius="9px" fontSize="11px" leftIcon={<PlusIcon size={13} />} onClick={() => navigate('/leads')}>New lead</Button>
              <Button size="sm" variant="outline" borderColor="app.border" borderRadius="9px" fontSize="11px" leftIcon={<PlusIcon size={13} />} onClick={() => navigate('/quotes')}>New quote</Button>
              <Button size="sm" variant="outline" borderColor="app.border" borderRadius="9px" fontSize="11px" leftIcon={<PlusIcon size={13} />} onClick={() => navigate('/tasks')}>New task</Button>
            </Stack>
          </Card>
        </Stack>
      </Grid>

      {/* Deal detail floating modal */}
      <Modal isOpen={detailModal.isOpen} onClose={detailModal.onClose} size="md" isCentered>
        <ModalOverlay backdropFilter="blur(4px)" />
        <ModalContent bg="app.surface" borderRadius="18px" overflow="hidden">
          <ModalHeader borderBottom="1px solid" borderColor="app.border" pb="14px">
            {detailDeal && (
              <Flex align="center" gap="10px">
                <Box w="8px" h="8px" borderRadius="full" bg={stageColors[detailDeal.stage] ?? '#6b7488'} />
                <Text fontFamily="'Plus Jakarta Sans', sans-serif" fontWeight="800" fontSize="16px">{detailDeal.title}</Text>
              </Flex>
            )}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody py="18px">
            {detailDeal && (() => {
              const person = personById(detailDeal.person_id);
              return (
                <Stack spacing="14px">
                  {/* Stage + probability */}
                  <Flex gap="8px" flexWrap="wrap">
                    <StatusBadge status={detailDeal.stage} />
                    <Badge fontSize="9px" borderRadius="full" px="8px" py="2px" bg="brand.50" color="brand.600" textTransform="capitalize">{detailDeal.deal_type ?? 'Project'}</Badge>
                    <Badge fontSize="9px" borderRadius="full" px="8px" py="2px" bg="#f0e8ff" color="#7c3aed" textTransform="capitalize">{detailDeal.sale_type ?? 'New'}</Badge>
                    {detailDeal.quotation_status && detailDeal.quotation_status !== 'None' && (
                      <Badge fontSize="9px" borderRadius="full" px="8px" py="2px" bg="#e8f5ee" color="#1c8a5c" textTransform="capitalize">Quote: {detailDeal.quotation_status}</Badge>
                    )}
                  </Flex>

                  {/* Value grid */}
                  <Grid templateColumns="1fr 1fr" gap="10px">
                    <Box p="14px" bg="app.surfaceAlt" borderRadius="12px">
                      <Text fontSize="10px" color="app.faint">Deal value</Text>
                      <Text mt="4px" fontSize="18px" fontWeight="800">${detailDeal.value.toLocaleString()}</Text>
                    </Box>
                    <Box p="14px" bg="app.surfaceAlt" borderRadius="12px">
                      <Text fontSize="10px" color="app.faint">Project volume</Text>
                      <Text mt="4px" fontSize="18px" fontWeight="800">${(detailDeal.project_volume ?? 0).toLocaleString()}</Text>
                    </Box>
                  </Grid>

                  {/* Probability bar */}
                  <Box>
                    <Flex justify="space-between" mb="6px">
                      <Text fontSize="11px" color="app.subtle">Win probability</Text>
                      <Text fontSize="11px" fontWeight="700">{detailDeal.probability}%</Text>
                    </Flex>
                    <Box w="full" h="8px" bg="app.surfaceAlt" borderRadius="full" overflow="hidden">
                      <Box h="full" bg={stageColors[detailDeal.stage] ?? '#e9683f'} borderRadius="full" style={{ width: `${detailDeal.probability}%` }} />
                    </Box>
                  </Box>

                  {/* Contact info */}
                  {person && (
                    <Box p="14px" bg="app.surfaceAlt" borderRadius="12px">
                      <Text fontSize="10px" color="app.faint" mb="8px">CONTACT</Text>
                      <Flex align="center" gap="10px">
                        <Avatar size="sm" name={person.name} bg={person.avatar_color} color="#46506a" />
                        <Box>
                          <Text fontSize="12px" fontWeight="700">{person.name}</Text>
                          <Text fontSize="10px" color="app.subtle">{person.company}</Text>
                        </Box>
                      </Flex>
                      {person.email && <Flex mt="8px" align="center" gap="6px"><Icon as={MailIcon} boxSize="11px" color="app.faint" /><Text fontSize="11px" color="app.subtle">{person.email}</Text></Flex>}
                      {person.phone && <Flex mt="4px" align="center" gap="6px"><Icon as={PhoneIcon} boxSize="11px" color="app.faint" /><Text fontSize="11px" color="app.subtle">{person.phone}</Text></Flex>}
                    </Box>
                  )}

                  {/* Details */}
                  <Grid templateColumns="1fr 1fr" gap="10px">
                    <Box>
                      <Text fontSize="10px" color="app.faint">Owner</Text>
                      <Text fontSize="12px" fontWeight="600">{detailDeal.owner_name || '—'}</Text>
                    </Box>
                    <Box>
                      <Text fontSize="10px" color="app.faint">Close date</Text>
                      <Text fontSize="12px" fontWeight="600">{detailDeal.close_date ?? '—'}</Text>
                    </Box>
                    <Box>
                      <Text fontSize="10px" color="app.faint">Competitors</Text>
                      <Text fontSize="12px" fontWeight="600">{detailDeal.competitors || '—'}</Text>
                    </Box>
                    <Box>
                      <Text fontSize="10px" color="app.faint">Created</Text>
                      <Text fontSize="12px" fontWeight="600">{new Date(detailDeal.created_at ?? '').toLocaleDateString()}</Text>
                    </Box>
                  </Grid>

                  {detailDeal.notes && (
                    <Box>
                      <Text fontSize="10px" color="app.faint" mb="4px">NOTES</Text>
                      <Text fontSize="12px" color="app.subtle" lineHeight="1.5">{detailDeal.notes}</Text>
                    </Box>
                  )}

                  <Flex gap="8px" pt="4px">
                    <Button size="sm" flex="1" bg="navy.600" color="white" _hover={{ bg: 'navy.500' }} borderRadius="9px" fontSize="12px" onClick={() => { detailModal.onClose(); navigate('/pipeline'); }}>View in pipeline</Button>
                    <Button size="sm" flex="1" variant="outline" borderColor="app.border" borderRadius="9px" fontSize="12px" onClick={() => { detailModal.onClose(); navigate('/quotes'); }}>Create quote</Button>
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
