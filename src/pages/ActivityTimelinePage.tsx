import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Badge,
  Box,
  Button,
  Flex,
  Grid,
  HStack,
  Icon,
  Input,
  InputGroup,
  InputLeftElement,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Select,
  Spinner,
  Stack,
  Text,
  useDisclosure,
  useToast } from '@chakra-ui/react';
import {
  CalendarIcon,
  FileTextIcon,
  FilterIcon,
  MailIcon,
  MessageCircleIcon,
  PhoneIcon,
  SendIcon,
  TrendingUpIcon,
  UsersIcon,
  DollarSignIcon } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Card, CardHeader } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

type Activity = {
  id: string;
  type: string;
  subject: string;
  description: string;
  created_at: string;
  customer_id: string | null;
  deal_id: string | null;
  person_id: string | null;
  lead_id: string | null;
};
type Deal = { id: string; title: string; stage: string; value: number };
type Customer = { id: string; person_id: string | null };
type Person = { id: string; name: string; company: string; avatar_color: string };

const typeIcon: Record<string, React.ElementType> = {
  call: PhoneIcon, email: MailIcon, meeting: CalendarIcon, note: FileTextIcon,
  task: FileTextIcon, deal: TrendingUpIcon, whatsapp: MessageCircleIcon,
  sms: SendIcon, telegram: SendIcon,
};
const typeColor: Record<string, string> = {
  call: '#3355c9', email: '#e9683f', meeting: '#8374d9', note: '#6b7488',
  task: '#1c8a5c', deal: '#e9683f', whatsapp: '#2d9c79', sms: '#f0a13c', telegram: '#3355c9',
};

const SCOPE_OPTIONS = [
  { value: 'all', label: 'All activity' },
  { value: 'deals', label: 'Pipeline & Deals' },
  { value: 'customers', label: 'Customers' },
] as const;

export function ActivityTimelinePage() {
  const { session } = useAuth();
  const toast = useToast();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [scope, setScope] = useState<string>('all');
  const [dealFilter, setDealFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Activity | null>(null);
  const detailModal = useDisclosure();

  const load = useCallback(async () => {
    if (!session?.user) return;
    setLoading(true);
    const [aRes, dRes, cRes, pRes] = await Promise.all([
      supabase.from('activities').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false }).limit(200),
      supabase.from('deals').select('id, title, stage, value').eq('user_id', session.user.id).order('created_at', { ascending: false }),
      supabase.from('customers').select('id, person_id').eq('user_id', session.user.id),
      supabase.from('people').select('id, name, company, avatar_color').eq('user_id', session.user.id),
    ]);
    setActivities((aRes.data ?? []) as Activity[]);
    setDeals((dRes.data ?? []) as Deal[]);
    setCustomers((cRes.data ?? []) as Customer[]);
    setPeople((pRes.data ?? []) as Person[]);
    setLoading(false);
  }, [session]);

  useEffect(() => { load(); }, [load]);

  const personById = useCallback((id: string | null) => people.find((p) => p.id === id) ?? null, [people]);
  const dealById = useCallback((id: string | null) => deals.find((d) => d.id === id) ?? null, [deals]);
  const customerById = useCallback((id: string | null) => customers.find((c) => c.id === id) ?? null, [customers]);

  const filtered = useMemo(() => {
    let result = activities;
    if (scope === 'deals') result = result.filter((a) => !!a.deal_id);
    else if (scope === 'customers') result = result.filter((a) => !!a.customer_id);
    if (dealFilter !== 'all') result = result.filter((a) => a.deal_id === dealFilter);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((a) =>
        a.subject.toLowerCase().includes(q) ||
        (a.description ?? '').toLowerCase().includes(q) ||
        (a.type ?? '').toLowerCase().includes(q)
      );
    }
    return result;
  }, [activities, scope, dealFilter, search]);

  const dealStageColor: Record<string, string> = {
    prospecting: '#3355c9', qualification: '#8374d9', proposal: '#b5760f',
    negotiation: '#e9683f', closed_won: '#1c8a5c', closed_lost: '#c23c3c',
  };

  const pipelineStages = useMemo(() => {
    const stages = [...new Set(deals.map((d) => d.stage))].filter(Boolean);
    return stages;
  }, [deals]);

  const stats = useMemo(() => ({
    total: activities.length,
    dealActivity: activities.filter((a) => !!a.deal_id).length,
    customerActivity: activities.filter((a) => !!a.customer_id).length,
    todayCount: activities.filter((a) => {
      const today = new Date().toDateString();
      return new Date(a.created_at).toDateString() === today;
    }).length,
  }), [activities]);

  return (
    <>
      <PageHeader
        title="Activity Timeline"
        subtitle="Complete activity history synchronized with your pipeline and deals."
        actions={
          <Button size="sm" variant="outline" borderColor="app.border" borderRadius="9px" fontSize="12px" onClick={() => load()} leftIcon={<CalendarIcon size={14} />}>Refresh</Button>
        } />

      <Grid templateColumns={{ base: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }} gap="12px" mb="18px">
        <Card p="15px">
          <Flex align="center" gap="8px">
            <Flex w="30px" h="30px" borderRadius="9px" bg="brand.50" align="center" justify="center"><Icon as={CalendarIcon} boxSize="15px" color="brand.600" /></Flex>
            <Box><Text fontSize="10px" color="app.subtle">Total Events</Text><Text fontSize="20px" fontWeight="800">{stats.total}</Text></Box>
          </Flex>
        </Card>
        <Card p="15px">
          <Flex align="center" gap="8px">
            <Flex w="30px" h="30px" borderRadius="9px" bg="#e8eaff" align="center" justify="center"><Icon as={TrendingUpIcon} boxSize="15px" color="#3355c9" /></Flex>
            <Box><Text fontSize="10px" color="app.subtle">Deal Activity</Text><Text fontSize="20px" fontWeight="800">{stats.dealActivity}</Text></Box>
          </Flex>
        </Card>
        <Card p="15px">
          <Flex align="center" gap="8px">
            <Flex w="30px" h="30px" borderRadius="9px" bg="#e0f5ee" align="center" justify="center"><Icon as={UsersIcon} boxSize="15px" color="#2d9c79" /></Flex>
            <Box><Text fontSize="10px" color="app.subtle">Customer Activity</Text><Text fontSize="20px" fontWeight="800">{stats.customerActivity}</Text></Box>
          </Flex>
        </Card>
        <Card p="15px">
          <Flex align="center" gap="8px">
            <Flex w="30px" h="30px" borderRadius="9px" bg="#fff3e0" align="center" justify="center"><Icon as={DollarSignIcon} boxSize="15px" color="#b5760f" /></Flex>
            <Box><Text fontSize="10px" color="app.subtle">Today</Text><Text fontSize="20px" fontWeight="800">{stats.todayCount}</Text></Box>
          </Flex>
        </Card>
      </Grid>

      {/* Pipeline stage overview — synchronized with deals */}
      {pipelineStages.length > 0 && (
        <Card mb="18px" p="16px">
          <Text fontSize="11px" fontWeight="700" color="app.faint" letterSpacing="0.06em" mb="10px">PIPELINE STAGES</Text>
          <Flex gap="10px" flexWrap="wrap">
            {pipelineStages.map((stage) => {
              const stageDeals = deals.filter((d) => d.stage === stage);
              const stageActivities = activities.filter((a) => a.deal_id && stageDeals.some((d) => d.id === a.deal_id)).length;
              const color = dealStageColor[stage] ?? '#6b7488';
              return (
                <Flex key={stage} align="center" gap="8px" px="12px" py="8px" bg="app.surfaceAlt" borderRadius="10px" border="1px solid" borderColor="app.border" cursor="pointer"
                  _hover={{ borderColor: color }} transition="border-color .15s ease" onClick={() => { setScope('deals'); setDealFilter('all'); }}>
                  <Box w="8px" h="8px" borderRadius="full" bg={color} />
                  <Text fontSize="11px" fontWeight="600" color="app.text" textTransform="capitalize">{stage}</Text>
                  <Badge fontSize="9px" borderRadius="full" px="6px" py="1px" bg={`${color}1a`} color={color}>{stageDeals.length} deals</Badge>
                  <Text fontSize="10px" color="app.faint">{stageActivities} events</Text>
                </Flex>
              );
            })}
          </Flex>
        </Card>
      )}

      <Card>
        <Flex px={{ base: '14px', md: '20px' }} py="14px" gap="10px" align="center" flexWrap="wrap" borderBottom="1px solid" borderColor="app.border">
          <InputGroup maxW="220px" size="sm">
            <InputLeftElement pointerEvents="none"><FilterIcon size={14} color="app.faint" /></InputLeftElement>
            <Input placeholder="Search activity..." value={search} onChange={(e) => setSearch(e.target.value)} borderRadius="9px" bg="app.surfaceAlt" borderColor="app.border" fontSize="12px" />
          </InputGroup>
          <Select size="sm" maxW="160px" value={scope} onChange={(e) => { setScope(e.target.value); setDealFilter('all'); }} borderRadius="9px" borderColor="app.border" fontSize="12px">
            {SCOPE_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </Select>
          {scope === 'deals' && (
            <Select size="sm" maxW="200px" value={dealFilter} onChange={(e) => setDealFilter(e.target.value)} borderRadius="9px" borderColor="app.border" fontSize="12px">
              <option value="all">All deals</option>
              {deals.map((d) => <option key={d.id} value={d.id}>{d.title}</option>)}
            </Select>
          )}
          <Text ml="auto" fontSize="12px" color="app.subtle">{filtered.length} events</Text>
        </Flex>

        {loading ? (
          <Flex py="60px" justify="center"><Spinner color="brand.500" /></Flex>
        ) : filtered.length === 0 ? (
          <EmptyState icon={CalendarIcon} title="No activity yet" description="Activities from deals, customers, leads, and tasks will appear here." />
        ) : (
          <Box position="relative" maxH="640px" overflowY="auto" px="20px" py="20px" sx={{
            scrollBehavior: 'smooth',
            '::-webkit-scrollbar': { width: '6px' },
            '::-webkit-scrollbar-track': { bg: 'transparent' },
            '::-webkit-scrollbar-thumb': { bg: 'app.border', borderRadius: 'full' },
            '::-webkit-scrollbar-thumb:hover': { bg: 'app.faint' },
          }}>
            {/* Center spine */}
            <Box position="absolute" left="50%" top="20px" bottom="20px" width="2px" bg="app.border" transform="translateX(-50%)" />
            <Stack spacing="0">
              {filtered.map((item, i) => {
                const AIcon = typeIcon[item.type] ?? FileTextIcon;
                const color = typeColor[item.type] ?? '#6b7488';
                const isLeft = i % 2 === 0;
                const person = personById(item.person_id);
                const deal = dealById(item.deal_id);
                const customer = customerById(item.customer_id);
                return (
                  <Flex
                    key={item.id}
                    position="relative"
                    justify={isLeft ? 'flex-start' : 'flex-end'}
                    mb="18px"
                    pl={isLeft ? '0' : '52%'}
                    pr={isLeft ? '52%' : '0'}>
                    {/* Center node */}
                    <Box
                      position="absolute"
                      left="50%"
                      top="14px"
                      transform="translateX(-50%)"
                      w="32px" h="32px"
                      borderRadius="full"
                      bg={`${color}1a`}
                      border="2px solid"
                      borderColor={color}
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                      zIndex={1}
                      transition="transform .18s ease"
                      _hover={{ transform: 'translateX(-50%) scale(1.15)' }}>
                      <AIcon size={15} color={color} />
                    </Box>
                    {/* Card */}
                    <Box
                      p="14px"
                      bg="app.surface"
                      border="1px solid"
                      borderColor="app.border"
                      borderRadius="13px"
                      cursor="pointer"
                      transition="all .18s ease"
                      _hover={{ borderColor: color, transform: 'translateY(-2px)', boxShadow: '0 6px 16px rgba(0,0,0,0.08)' }}
                      onClick={() => { setSelected(item); detailModal.onOpen(); }}
                      w="full">
                      <Flex align="center" gap="8px" mb="4px">
                        <Text fontSize="13px" fontWeight="700" color="app.text" flex="1" noOfLines={1}>{item.subject}</Text>
                        <Text fontSize="9px" fontWeight="700" color={color} textTransform="uppercase" letterSpacing="0.05em">{item.type}</Text>
                      </Flex>
                      {item.description && <Text fontSize="11px" color="app.subtle" noOfLines={2} mb="6px">{item.description}</Text>}
                      <Flex align="center" gap="8px" flexWrap="wrap">
                        {deal && (
                          <Flex align="center" gap="4px">
                            <Box w="6px" h="6px" borderRadius="full" bg={dealStageColor[deal.stage] ?? '#6b7488'} />
                            <Text fontSize="10px" color="brand.600" fontWeight="600" noOfLines={1}>{deal.title}</Text>
                          </Flex>
                        )}
                        {customer && person && <Text fontSize="10px" color="app.faint">{person.company}</Text>}
                        <Text fontSize="9px" color="app.faint" ml="auto">{new Date(item.created_at).toLocaleString()}</Text>
                      </Flex>
                    </Box>
                  </Flex>
                );
              })}
            </Stack>
          </Box>
        )}
      </Card>

      {/* Detail Modal */}
      <Modal isOpen={detailModal.isOpen} onClose={detailModal.onClose} size="sm" isCentered>
        <ModalOverlay backdropFilter="blur(4px)" />
        <ModalContent bg="app.surface" borderRadius="16px" overflow="hidden">
          {selected && (() => {
            const AIcon = typeIcon[selected.type] ?? FileTextIcon;
            const color = typeColor[selected.type] ?? '#6b7488';
            const deal = dealById(selected.deal_id);
            const person = personById(selected.person_id);
            const customer = customerById(selected.customer_id);
            return (
              <>
                <ModalHeader borderBottom="1px solid" borderColor="app.border" pb="14px">
                  <Flex align="center" gap="10px">
                    <Flex w="34px" h="34px" borderRadius="10px" bg={`${color}1a`} align="center" justify="center">
                      <AIcon size={17} color={color} />
                    </Flex>
                    <Box>
                      <Text fontSize="15px" fontWeight="800">{selected.subject}</Text>
                      <Text fontSize="10px" color={color} textTransform="capitalize" fontWeight="600">{selected.type}</Text>
                    </Box>
                  </Flex>
                </ModalHeader>
                <ModalCloseButton />
                <ModalBody py="16px">
                  <Stack spacing="12px">
                    {selected.description && (
                      <Box p="14px" bg="app.surfaceAlt" borderRadius="10px">
                        <Text fontSize="10px" color="app.faint" mb="5px" letterSpacing="0.06em">DETAILS</Text>
                        <Text fontSize="12px" color="app.subtle" lineHeight="1.5">{selected.description}</Text>
                      </Box>
                    )}
                    <Box p="14px" bg="app.surfaceAlt" borderRadius="10px">
                      <Text fontSize="10px" color="app.faint" mb="8px" letterSpacing="0.06em">LINKED ENTITIES</Text>
                      <Stack spacing="6px">
                        {deal && (
                          <Flex align="center" gap="8px">
                            <Icon as={TrendingUpIcon} boxSize="13px" color={dealStageColor[deal.stage] ?? '#8374d9'} />
                            <Box>
                              <Text fontSize="12px" fontWeight="600">Deal: {deal.title}</Text>
                              <Text fontSize="10px" color="app.faint">Stage: {deal.stage} · ${deal.value?.toLocaleString() ?? '—'}</Text>
                            </Box>
                          </Flex>
                        )}
                        {person && (
                          <Flex align="center" gap="8px">
                            <Icon as={UsersIcon} boxSize="13px" color="app.faint" />
                            <Text fontSize="12px">{person.name} · {person.company}</Text>
                          </Flex>
                        )}
                        {customer && !person && (
                          <Flex align="center" gap="8px">
                            <Icon as={UsersIcon} boxSize="13px" color="app.faint" />
                            <Text fontSize="12px">Customer: {customer.id.slice(0, 8)}</Text>
                          </Flex>
                        )}
                        {!deal && !person && !customer && <Text fontSize="12px" color="app.faint">No linked entities.</Text>}
                      </Stack>
                    </Box>
                    <Flex justify="space-between" align="center">
                      <Text fontSize="11px" color="app.faint">Logged at</Text>
                      <Text fontSize="11px" fontWeight="600">{new Date(selected.created_at).toLocaleString()}</Text>
                    </Flex>
                  </Stack>
                </ModalBody>
              </>
            );
          })()}
        </ModalContent>
      </Modal>
    </>
  );
}
