import React, { useCallback, useEffect, useState } from 'react';
import {
  Box,
  Button,
  Flex,
  HStack,
  Icon,
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
  useToast } from '@chakra-ui/react';
import {
  CalendarIcon,
  FileTextIcon,
  MailIcon,
  MessageCircleIcon,
  PhoneIcon,
  SendIcon,
  TrendingUpIcon } from 'lucide-react';
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
};
type Deal = { id: string; title: string };
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

export function ActivityTimelinePage() {
  const { session } = useAuth();
  const toast = useToast();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [scope, setScope] = useState<string>('all');
  const [selected, setSelected] = useState<Activity | null>(null);
  const detailModal = useDisclosure();

  const load = useCallback(async () => {
    if (!session?.user) return;
    setLoading(true);
    const [aRes, dRes, cRes, pRes] = await Promise.all([
      supabase.from('activities').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false }).limit(100),
      supabase.from('deals').select('id, title').eq('user_id', session.user.id),
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

  const personById = (id: string | null) => people.find((p) => p.id === id) ?? null;
  const dealById = (id: string | null) => deals.find((d) => d.id === id) ?? null;
  const customerById = (id: string | null) => customers.find((c) => c.id === id) ?? null;

  const filtered = scope === 'all' ? activities : activities.filter((a) =>
    scope === 'deals' ? !!a.deal_id : scope === 'customers' ? !!a.customer_id : true
  );

  const dealOptions = deals.map((d) => ({ id: d.id, label: d.title }));

  return (
    <>
      <PageHeader
        title="Activity Timeline"
        subtitle="Complete activity history synchronized with your pipeline and deals."
        actions={
          <Select size="sm" maxW="180px" value={scope} onChange={(e) => setScope(e.target.value)} borderRadius="9px" borderColor="app.border" fontSize="12px">
            <option value="all">All activity</option>
            <option value="deals">Deals only</option>
            <option value="customers">Customers only</option>
          </Select>
        } />

      {loading ? (
        <Flex py="60px" justify="center"><Spinner color="brand.500" /></Flex>
      ) : filtered.length === 0 ? (
        <Card><EmptyState icon={CalendarIcon} title="No activity yet" description="Activities from deals, customers, leads, and tasks will appear here." /></Card>
      ) : (
        <Card>
          <CardHeader title="Timeline" subtitle={`${filtered.length} events`} />
          <Box position="relative" maxH="600px" overflowY="auto" px="20px" py="20px" sx={{
            '::-webkit-scrollbar': { width: '6px' },
            '::-webkit-scrollbar-track': { bg: 'transparent' },
            '::-webkit-scrollbar-thumb': { bg: 'app.border', borderRadius: 'full' },
          }}>
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
                      zIndex={1}>
                      <AIcon size={15} color={color} />
                    </Box>
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
                        {deal && <Text fontSize="10px" color="brand.600" fontWeight="600">{deal.title}</Text>}
                        {customer && person && <Text fontSize="10px" color="app.faint">{person.company}</Text>}
                        <Text fontSize="9px" color="app.faint" ml="auto">{new Date(item.created_at).toLocaleString()}</Text>
                      </Flex>
                    </Box>
                  </Flex>
                );
              })}
            </Stack>
          </Box>
        </Card>
      )}

      <Modal isOpen={detailModal.isOpen} onClose={detailModal.onClose} size="sm" isCentered>
        <ModalOverlay backdropFilter="blur(4px)" />
        <ModalContent bg="app.surface" borderRadius="16px" overflow="hidden">
          {selected && (() => {
            const AIcon = typeIcon[selected.type] ?? FileTextIcon;
            const color = typeColor[selected.type] ?? '#6b7488';
            const deal = dealById(selected.deal_id);
            const person = personById(selected.person_id);
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
                        {deal && <Flex align="center" gap="8px"><Icon as={TrendingUpIcon} boxSize="13px" color="#8374d9" /><Text fontSize="12px" fontWeight="600">Deal: {deal.title}</Text></Flex>}
                        {person && <Flex align="center" gap="8px"><Icon as={MailIcon} boxSize="13px" color="app.faint" /><Text fontSize="12px">{person.name} · {person.company}</Text></Flex>}
                        {!deal && !person && <Text fontSize="12px" color="app.faint">No linked entities.</Text>}
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
