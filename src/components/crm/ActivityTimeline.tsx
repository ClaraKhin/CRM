import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Flex,
  FormControl,
  FormLabel,
  Input,
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
  Textarea,
  useDisclosure,
  useToast } from '@chakra-ui/react';
import {
  CalendarIcon,
  FileTextIcon,
  MailIcon,
  PhoneIcon,
  PlusIcon,
  TrendingUpIcon,
  MessageCircleIcon,
  SendIcon } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

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

const typeIcon: Record<string, React.ElementType> = {
  call: PhoneIcon, email: MailIcon, meeting: CalendarIcon, note: FileTextIcon,
  task: FileTextIcon, deal: TrendingUpIcon, whatsapp: MessageCircleIcon,
  sms: SendIcon, telegram: SendIcon,
};
const typeColor: Record<string, string> = {
  call: '#3355c9', email: '#e9683f', meeting: '#8374d9', note: '#6b7488',
  task: '#1c8a5c', deal: '#e9683f', whatsapp: '#2d9c79', sms: '#f0a13c', telegram: '#3355c9',
};

export function ActivityTimeline({ entityType, entityId }: { entityType: 'customer' | 'deal'; entityId: string }) {
  const toast = useToast();
  const { session } = useAuth();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newAct, setNewAct] = useState({ type: 'note', subject: '', description: '' });
  const [selected, setSelected] = useState<Activity | null>(null);
  const detailModal = useDisclosure();

  const filterCol = entityType === 'customer' ? 'customer_id' : 'deal_id';

  const loadActivities = async () => {
    if (!session?.user || !entityId) return;
    setLoading(true);
    const { data } = await supabase.from('activities').select('*').eq('user_id', session.user.id).eq(filterCol, entityId).order('created_at', { ascending: false }).limit(30);
    setActivities((data ?? []) as Activity[]);
    setLoading(false);
  };

  useEffect(() => { loadActivities(); }, [session, entityId, filterCol]);

  const addActivity = async () => {
    if (!newAct.subject.trim()) { toast({ title: 'Subject is required', status: 'error', duration: 2000, position: 'top-right' }); return; }
    setAdding(true);
    const { data } = await supabase.from('activities').insert({
      user_id: session!.user.id, type: newAct.type, subject: newAct.subject, description: newAct.description, [filterCol]: entityId
    }).select().maybeSingle();
    if (data) setActivities((prev) => [data as Activity, ...prev]);
    setNewAct({ type: 'note', subject: '', description: '' });
    setAdding(false);
    toast({ title: 'Activity logged', status: 'success', duration: 1800, position: 'top-right' });
  };

  if (loading) return <Flex py="20px" justify="center"><Spinner size="sm" color="brand.500" /></Flex>;

  return (
    <>
      <Stack spacing="12px">
        <Box p="12px" bg="app.surfaceAlt" borderRadius="10px">
          <Flex gap="8px" align="flex-end">
            <FormControl flex="0 0 100px">
              <FormLabel fontSize="10px" color="app.subtle" mb="4px">Type</FormLabel>
              <Select size="xs" value={newAct.type} onChange={(e) => setNewAct({ ...newAct, type: e.target.value })} borderRadius="7px" borderColor="app.border" fontSize="11px">
                <option value="note">Note</option><option value="call">Call</option><option value="email">Email</option><option value="meeting">Meeting</option>
              </Select>
            </FormControl>
            <FormControl flex="1">
              <FormLabel fontSize="10px" color="app.subtle" mb="4px">Subject</FormLabel>
              <Input size="xs" value={newAct.subject} onChange={(e) => setNewAct({ ...newAct, subject: e.target.value })} placeholder="What happened?" borderRadius="7px" borderColor="app.border" fontSize="11px" />
            </FormControl>
            <Button size="xs" h="28px" borderRadius="7px" bg="navy.600" color="white" fontSize="11px" isLoading={adding} onClick={addActivity} leftIcon={<PlusIcon size={12} />}>Log</Button>
          </Flex>
          <Textarea mt="8px" size="xs" value={newAct.description} onChange={(e) => setNewAct({ ...newAct, description: e.target.value })} placeholder="Add details (optional)..." borderRadius="7px" borderColor="app.border" fontSize="11px" rows={2} />
        </Box>

        {activities.length === 0 ? (
          <Text fontSize="12px" color="app.faint" py="16px" textAlign="center">No activities recorded yet.</Text>
        ) : (
          <Box position="relative" maxH="400px" overflowY="auto" px="4px" sx={{
            '::-webkit-scrollbar': { width: '5px' },
            '::-webkit-scrollbar-track': { bg: 'transparent' },
            '::-webkit-scrollbar-thumb': { bg: 'app.border', borderRadius: 'full' },
          }}>
            {/* Center line */}
            <Box position="absolute" left="50%" top="0" bottom="0" width="2px" bg="app.border" transform="translateX(-50%)" />
            {activities.map((item, i) => {
              const AIcon = typeIcon[item.type] ?? FileTextIcon;
              const color = typeColor[item.type] ?? '#6b7488';
              const isLeft = i % 2 === 0;
              return (
                <Flex
                  key={item.id}
                  position="relative"
                  justify={isLeft ? 'flex-start' : 'flex-end'}
                  mb="14px"
                  pl={isLeft ? '0' : '52%'}
                  pr={isLeft ? '52%' : '0'}>
                  <Box
                    position="absolute"
                    left="50%"
                    top="12px"
                    transform="translateX(-50%)"
                    w="28px" h="28px"
                    borderRadius="full"
                    bg={`${color}1a`}
                    border="2px solid"
                    borderColor={color}
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    zIndex={1}>
                    <AIcon size={13} color={color} />
                  </Box>
                  <Box
                    p="12px"
                    bg="app.surface"
                    border="1px solid"
                    borderColor="app.border"
                    borderRadius="12px"
                    cursor="pointer"
                    transition="all .15s ease"
                    _hover={{ borderColor: color, transform: 'translateY(-1px)', boxShadow: '0 4px 12px rgba(0,0,0,0.06)' }}
                    onClick={() => { setSelected(item); detailModal.onOpen(); }}
                    w="full">
                    <Text fontSize="12px" fontWeight="700" color="app.text">{item.subject}</Text>
                    <Text fontSize="10px" color={color} textTransform="capitalize" fontWeight="600">{item.type}</Text>
                    {item.description && <Text fontSize="11px" color="app.subtle" mt="4px" noOfLines={2}>{item.description}</Text>}
                    <Text fontSize="9px" color="app.faint" mt="6px">{new Date(item.created_at).toLocaleString()}</Text>
                  </Box>
                </Flex>
              );
            })}
          </Box>
        )}
      </Stack>

      <Modal isOpen={detailModal.isOpen} onClose={detailModal.onClose} size="sm" isCentered>
        <ModalOverlay backdropFilter="blur(4px)" />
        <ModalContent bg="app.surface" borderRadius="16px" overflow="hidden">
          {selected && (() => {
            const AIcon = typeIcon[selected.type] ?? FileTextIcon;
            const color = typeColor[selected.type] ?? '#6b7488';
            return (
              <>
                <ModalHeader borderBottom="1px solid" borderColor="app.border" pb="14px">
                  <Flex align="center" gap="10px">
                    <Flex w="32px" h="32px" borderRadius="10px" bg={`${color}1a`} align="center" justify="center">
                      <AIcon size={16} color={color} />
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
