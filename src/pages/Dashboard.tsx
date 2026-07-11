import React, { useCallback, useEffect, useState } from 'react';
import {
  Avatar,
  Box,
  Button,
  Flex,
  Grid,
  Icon,
  Stack,
  Text,
  useToast } from
'@chakra-ui/react';
import {
  BotIcon,
  CalendarClockIcon,
  ChevronDownIcon,
  CircleDollarSignIcon,
  Clock3Icon,
  LayoutListIcon,
  PlusIcon,
  TargetIcon,
  TrendingUpIcon,
  UsersRoundIcon } from
'lucide-react';
import { useNavigate } from 'react-router-dom';
import { MetricCard } from '../components/dashboard/MetricCard';
import { RevenueChart } from '../components/dashboard/RevenueChart';
import { AiBriefing } from '../components/dashboard/AiBriefing';
import { Card, CardHeader } from '../components/ui/Card';
import { PageHeader } from '../components/ui/PageHeader';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

type Deal = { id: string; title: string; value: number; stage: string; probability: number; owner_name: string; close_date: string | null };
type Task = { id: string; title: string; done: boolean; due_date: string | null; priority: string; owner_name: string };
type Activity = { id: string; type: string; subject: string; description: string; created_at: string };

export function Dashboard() {
  const [period, setPeriod] = useState('This month');
  const [deals, setDeals] = useState<Deal[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const { session, profile } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const load = useCallback(async () => {
    if (!session?.user) return;
    setLoading(true);
    const [dRes, tRes, aRes] = await Promise.all([
      supabase.from('deals').select('*').eq('user_id', session.user.id),
      supabase.from('tasks').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false }).limit(6),
      supabase.from('activities').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false }).limit(5)
    ]);
    setDeals((dRes.data ?? []) as Deal[]);
    setTasks((tRes.data ?? []) as Task[]);
    setActivities((aRes.data ?? []) as Activity[]);
    setLoading(false);
  }, [session]);

  useEffect(() => { load(); }, [load]);

  const wonValue = deals.filter((d) => d.stage === 'Won').reduce((s, d) => s + d.value, 0);
  const openValue = deals.filter((d) => d.stage !== 'Won' && d.stage !== 'Lost').reduce((s, d) => s + d.value, 0);
  const qualifiedCount = deals.filter((d) => d.stage === 'Qualified' || d.stage === 'Meeting' || d.stage === 'Proposal' || d.stage === 'Negotiation').length;
  const avgProb = deals.length ? Math.round(deals.reduce((s, d) => s + d.probability, 0) / deals.length) : 0;

  const todayTasks = tasks.filter((t) => !t.done).slice(0, 4);
  const upcomingFollowups = deals.filter((d) => d.close_date && d.stage !== 'Won' && d.stage !== 'Lost').slice(0, 4);

  const showCopilot = () => {
    navigate('/assistant');
  };

  const greetingName = profile?.full_name?.split(' ')[0] ?? 'Renee';

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
            <Button size="sm" borderRadius="9px" bg="navy.600" color="white" _hover={{ bg: 'navy.500' }} leftIcon={<BotIcon size={15} />} fontSize="12px" onClick={showCopilot}>
              Ask Copilot
            </Button>
          </>
        } />

      <Grid templateColumns={{ base: 'repeat(2, 1fr)', xl: 'repeat(4, 1fr)' }} gap={{ base: '11px', md: '16px' }}>
        <MetricCard label="Revenue this month" value={`$${wonValue.toLocaleString()}`} trend="18.6%" icon={CircleDollarSignIcon} accent="#242d4b" />
        <MetricCard label="Open pipeline" value={`$${openValue.toLocaleString()}`} trend="8.1%" icon={TrendingUpIcon} accent="#8374d9" />
        <MetricCard label="Qualified deals" value={String(qualifiedCount)} trend="12.3%" icon={UsersRoundIcon} accent="#e9683f" />
        <MetricCard label="Avg win probability" value={`${avgProb}%`} trend="5.2%" icon={TargetIcon} accent="#2d9c79" />
      </Grid>

      <Grid mt="18px" templateColumns={{ base: '1fr', xl: 'minmax(0, 1.62fr) minmax(290px, .9fr)' }} gap="18px">
        <RevenueChart />
        <AiBriefing onAction={showCopilot} />
      </Grid>

      <Grid mt="18px" templateColumns={{ base: '1fr', xl: 'minmax(0, 1.62fr) minmax(290px, .9fr)' }} gap="18px">
        <Card>
          <CardHeader title="Today's tasks" subtitle="Your next 24 hours" right={<Icon as={CalendarClockIcon} boxSize="18px" color="#e9653c" />} />
          <Stack px="19px" py="8px" spacing="0">
            {todayTasks.length === 0 ? (
              <Text py="20px" fontSize="12px" color="app.faint" textAlign="center">No pending tasks. You're all caught up!</Text>
            ) : todayTasks.map((task, i) => (
              <Flex key={task.id} py="11px" borderBottom={i === todayTasks.length - 1 ? '0' : '1px solid'} borderColor="app.border" gap="9px" align="center">
                <Box w="6px" h="6px" borderRadius="full" bg={task.priority === 'High' ? '#c23c3c' : task.priority === 'Medium' ? '#b5760f' : '#6b7488'} />
                <Box flex="1">
                  <Text fontSize="12px" fontWeight="600">{task.title}</Text>
                  <Text fontSize="10px" color="app.faint">{task.due_date ?? 'No due date'} · {task.owner_name}</Text>
                </Box>
              </Flex>
            ))}
          </Stack>
        </Card>

        <Card>
          <CardHeader title="Upcoming follow-ups" subtitle="Closing soon" />
          <Stack px="19px" py="8px" spacing="0">
            {upcomingFollowups.length === 0 ? (
              <Text py="20px" fontSize="12px" color="app.faint" textAlign="center">No upcoming follow-ups.</Text>
            ) : upcomingFollowups.map((deal, i) => (
              <Flex key={deal.id} py="11px" borderBottom={i === upcomingFollowups.length - 1 ? '0' : '1px solid'} borderColor="app.border" gap="9px" align="center">
                <Box flex="1">
                  <Text fontSize="12px" fontWeight="600">{deal.title}</Text>
                  <Text fontSize="10px" color="app.faint">Close: {deal.close_date} · {deal.probability}%</Text>
                </Box>
                <Text fontSize="12px" fontWeight="700">${deal.value.toLocaleString()}</Text>
              </Flex>
            ))}
          </Stack>
        </Card>
      </Grid>

      <Grid mt="18px" templateColumns={{ base: '1fr', xl: 'minmax(0, 1.62fr) minmax(290px, .9fr)' }} gap="18px">
        <Card>
          <CardHeader title="Recent activity" subtitle="Latest from your team" right={<Icon as={LayoutListIcon} boxSize="16px" color="app.faint" />} />
          <Stack px="19px" py="8px" spacing="0">
            {activities.length === 0 ? (
              <Text py="20px" fontSize="12px" color="app.faint" textAlign="center">No recent activity.</Text>
            ) : activities.map((item, i) => (
              <Flex key={item.id} py="11px" borderBottom={i === activities.length - 1 ? '0' : '1px solid'} borderColor="app.border" gap="9px">
                <Box w="28px" h="28px" borderRadius="9px" bg="app.surfaceAlt" align="center" justify="center" display="flex" alignItems="center" justifyContent="center">
                  <Text fontSize="9px" fontWeight="700" color="app.subtle">{item.type[0]}</Text>
                </Box>
                <Box flex="1">
                  <Text fontSize="12px"><Text as="span" fontWeight="700">{item.subject}</Text></Text>
                  <Text fontSize="10px" color="app.subtle">{item.type} · {new Date(item.created_at).toLocaleDateString()}</Text>
                </Box>
              </Flex>
            ))}
          </Stack>
        </Card>

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
              <Text mt="3px" fontSize="10px" color="app.subtle">{qualifiedCount} deals advancing toward close.</Text>
            </Box>
          </Flex>
          <Stack mt="16px" spacing="7px">
            <Button size="sm" variant="outline" borderColor="app.border" borderRadius="9px" fontSize="11px" leftIcon={<PlusIcon size={13} />} onClick={() => navigate('/leads')}>New lead</Button>
            <Button size="sm" variant="outline" borderColor="app.border" borderRadius="9px" fontSize="11px" leftIcon={<PlusIcon size={13} />} onClick={() => navigate('/quotes')}>New quote</Button>
            <Button size="sm" variant="outline" borderColor="app.border" borderRadius="9px" fontSize="11px" leftIcon={<PlusIcon size={13} />} onClick={() => navigate('/tasks')}>New task</Button>
          </Stack>
        </Card>
      </Grid>
    </>
  );
}
