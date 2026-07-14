import React, { useEffect, useState } from 'react';
import { Box, Button, Flex, FormControl, FormLabel, Input, Select, Spinner, Stack, Text, Textarea, useToast } from '@chakra-ui/react';
import { CalendarIcon, FileTextIcon, MailIcon, PhoneIcon, PlusIcon, TrendingUpIcon } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

type Activity = { id: string; type: string; subject: string; description: string; created_at: string };

const typeIcon: Record<string, React.ElementType> = { call: PhoneIcon, email: MailIcon, meeting: CalendarIcon, note: FileTextIcon, task: FileTextIcon, deal: TrendingUpIcon };
const typeColor: Record<string, string> = { call: '#3355c9', email: '#6b35a8', meeting: '#b5760f', note: '#6b7488', task: '#1c8a5c', deal: '#e9683f' };

export function ActivityTimeline({ entityType, entityId }: { entityType: 'customer' | 'deal'; entityId: string }) {
  const toast = useToast();
  const { session } = useAuth();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newAct, setNewAct] = useState({ type: 'note', subject: '', description: '' });

  const filterCol = entityType === 'customer' ? 'customer_id' : 'deal_id';

  useEffect(() => {
    if (!session?.user || !entityId) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase.from('activities').select('*').eq('user_id', session.user.id).eq(filterCol, entityId).order('created_at', { ascending: false }).limit(20);
      setActivities((data ?? []) as Activity[]);
      setLoading(false);
    })();
  }, [session, entityId, filterCol]);

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
      ) : activities.map((item, i) => {
        const AIcon = typeIcon[item.type] ?? FileTextIcon;
        const color = typeColor[item.type] ?? '#6b7488';
        return (
          <Flex key={item.id} gap="11px" pb={i < activities.length - 1 ? '14px' : '0'}>
            <Flex direction="column" align="center" flexShrink={0}>
              <Flex w="26px" h="26px" align="center" justify="center" borderRadius="full" bg={`${color}1a`}><AIcon size={13} color={color} /></Flex>
              {i < activities.length - 1 && <Box w="2px" flex="1" bg="app.border" mt="4px" />}
            </Flex>
            <Box flex="1" pt="2px">
              <Text fontSize="12px" fontWeight="600" color="app.text">{item.subject}</Text>
              <Text fontSize="10px" color="app.subtle" textTransform="capitalize">{item.type} · {new Date(item.created_at).toLocaleString()}</Text>
              {item.description && <Text fontSize="11px" color="app.subtle" mt="3px" lineHeight="1.4">{item.description}</Text>}
            </Box>
          </Flex>
        );
      })}
    </Stack>
  );
}
