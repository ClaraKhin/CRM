import React, { useCallback, useEffect, useState } from 'react';
import {
  Avatar,
  Box,
  Button,
  Flex,
  Icon,
  Input,
  InputGroup,
  InputRightElement,
  Spinner,
  Stack,
  Switch,
  Text,
  useToast } from
'@chakra-ui/react';
import {
  BotIcon,
  CalendarPlusIcon,
  FileTextIcon,
  MailIcon,
  SendIcon,
  SparklesIcon } from
'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Card, CardHeader } from '../components/ui/Card';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

type Message = { from: 'ai' | 'user'; text: string };
type McpServer = { id: string; name: string; category: string; connected: boolean };

const initialMessages: Message[] = [
  { from: 'ai', text: 'Good morning Renee! You have 3 deals in negotiation worth $81,900. Nimbus Health has an 82% win probability — want me to draft a follow-up?' },
  { from: 'user', text: 'Yes, draft a follow-up for Maya Patel.' },
  { from: 'ai', text: 'Done. I drafted a warm follow-up referencing your last call and the pricing question. It\'s ready in your Gmail drafts via the MCP connection.' }
];

const suggestions = [
  'Summarize today\'s meetings',
  'Which deals are at risk?',
  'Generate a Q2 forecast',
  'Show overdue invoices',
  'Search customer records'
];

const actionChips = [
  { label: 'Schedule meeting', icon: CalendarPlusIcon },
  { label: 'Draft email', icon: MailIcon },
  { label: 'Generate quote', icon: FileTextIcon }
];

export function Assistant() {
  const { session } = useAuth();
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState('');
  const [servers, setServers] = useState<McpServer[]>([]);
  const [loading, setLoading] = useState(true);
  const [thinking, setThinking] = useState(false);
  const toast = useToast();

  const load = useCallback(async () => {
    if (!session?.user) return;
    setLoading(true);
    const { data } = await supabase.from('mcp_servers').select('*').eq('user_id', session.user.id).order('created_at', { ascending: true });
    setServers((data ?? []) as McpServer[]);
    setLoading(false);
  }, [session]);

  useEffect(() => { load(); }, [load]);

  const send = (text: string) => {
    const value = text.trim();
    if (!value) return;
    setMessages((prev) => [...prev, { from: 'user', text: value }]);
    setInput('');
    setThinking(true);
    setTimeout(() => {
      const replies: Record<string, string> = {
        'Summarize today\'s meetings': 'You have 2 meetings today: Sakura demo at 10:00 AM and Maya Patel call at 2:00 PM. Both are synced from Google Calendar.',
        'Which deals are at risk?': '2 deals are at risk: Nimbus Health ($27,100) — no activity in 48h, and Harbor expansion ($24,200) — close date approaching in 5 days.',
        'Generate a Q2 forecast': 'Based on your pipeline, Q2 forecast is $186,420 with 78% confidence. Top contributors: Meridian upgrade ($41,200, Won), Nimbus Health ($27,100, 82% probability).',
        'Show overdue invoices': 'Invoice INV-2203 for Nimbus Health is overdue by 23 days. Outstanding: $27,100. Would you like me to send a reminder?',
        'Search customer records': 'Found 6 customers matching your query. Top match: Meridian Group (VIP, $184k lifetime value). Want to see their full profile?'
      };
      const reply = replies[value] ?? 'On it — analyzing your CRM data and connected tools to complete that request. I\'ll use the MCP connections to pull the relevant information.';
      setMessages((prev) => [...prev, { from: 'ai', text: reply }]);
      setThinking(false);
    }, 800);
  };

  const toggleServer = async (id: string) => {
    const server = servers.find((s) => s.id === id);
    if (!server) return;
    setServers((prev) => prev.map((s) => s.id === id ? { ...s, connected: !s.connected } : s));
    await supabase.from('mcp_servers').update({ connected: !server.connected }).eq('id', id).eq('user_id', session!.user.id);
    toast({ title: `${server.name} ${server.connected ? 'disconnected' : 'connected'}`, status: 'info', duration: 1600, position: 'top-right' });
  };

  return (
    <>
      <PageHeader title="AI Assistant" subtitle="Your MCP-powered sales copilot." />

      <Flex templateColumns={{ base: '1fr', xl: 'minmax(0, 1.6fr) minmax(300px, 1fr)' }} gap="18px" as={Grid}>
        <Card display="flex" flexDirection="column" h={{ base: 'auto', xl: '620px' }}>
          <CardHeader title="Copilot chat" subtitle={`Connected to ${servers.filter((s) => s.connected).length} tools`} right={<Icon as={SparklesIcon} boxSize="16px" color="#e9683f" />} />
          <Stack flex="1" overflowY="auto" px="18px" py="16px" spacing="14px">
            {messages.map((msg, i) => (
              <Flex key={i} gap="10px" flexDirection={msg.from === 'user' ? 'row-reverse' : 'row'}>
                {msg.from === 'ai' ? (
                  <Flex w="30px" h="30px" borderRadius="9px" bg="navy.600" color="white" align="center" justify="center" flexShrink={0}>
                    <Icon as={BotIcon} boxSize="15px" />
                  </Flex>
                ) : (
                  <Avatar size="sm" name="Renee Walker" bg="#ffdccb" color="#b6451e" fontSize="10px" flexShrink={0} />
                )}
                <Box maxW="78%" bg={msg.from === 'user' ? 'brand.500' : 'app.surfaceAlt'} color={msg.from === 'user' ? 'white' : 'app.text'} px="13px" py="10px" borderRadius="13px">
                  <Text fontSize="12px" lineHeight="1.55">{msg.text}</Text>
                </Box>
              </Flex>
            ))}
            {thinking && (
              <Flex gap="10px">
                <Flex w="30px" h="30px" borderRadius="9px" bg="navy.600" color="white" align="center" justify="center" flexShrink={0}>
                  <Icon as={BotIcon} boxSize="15px" />
                </Flex>
                <Box bg="app.surfaceAlt" px="13px" py="10px" borderRadius="13px">
                  <Spinner size="xs" color="app.faint" />
                </Box>
              </Flex>
            )}
          </Stack>
          <Box px="18px" pt="10px">
            <Flex gap="7px" flexWrap="wrap" mb="10px">
              {actionChips.map((chip) => (
                <Button key={chip.label} size="xs" variant="outline" borderColor="app.border" borderRadius="full" fontSize="11px" leftIcon={<Icon as={chip.icon} boxSize="12px" />} onClick={() => send(chip.label)}>
                  {chip.label}
                </Button>
              ))}
            </Flex>
          </Box>
          <Box px="18px" pb="16px">
            <InputGroup>
              <Input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send(input)} placeholder="Ask your copilot anything..." bg="app.surfaceAlt" borderColor="app.border" borderRadius="12px" fontSize="13px" />
              <InputRightElement>
                <Button size="sm" variant="ghost" onClick={() => send(input)} aria-label="Send"><Icon as={SendIcon} boxSize="16px" color="#e9683f" /></Button>
              </InputRightElement>
            </InputGroup>
          </Box>
        </Card>

        <Stack spacing="18px">
          <Card p="18px">
            <Text fontFamily="'Plus Jakarta Sans', sans-serif" fontWeight="800" fontSize="14px" mb="10px">Suggested prompts</Text>
            <Stack spacing="7px">
              {suggestions.map((s) => (
                <Flex key={s} as="button" align="center" gap="8px" p="10px" borderRadius="10px" bg="app.surfaceAlt" _hover={{ bg: 'brand.50' }} onClick={() => send(s)} textAlign="left">
                  <Icon as={SparklesIcon} boxSize="13px" color="#e9683f" />
                  <Text fontSize="12px">{s}</Text>
                </Flex>
              ))}
            </Stack>
          </Card>

          <Card>
            <CardHeader title="MCP connections" subtitle={`${servers.filter((s) => s.connected).length} connected`} />
            {loading ? (
              <Flex py="40px" justify="center"><Spinner color="brand.500" /></Flex>
            ) : (
              <Stack px="18px" py="10px" spacing="0">
                {servers.map((server, i) => (
                  <Flex key={server.id} align="center" gap="10px" py="11px" borderBottom={i === servers.length - 1 ? '0' : '1px solid'} borderColor="app.border">
                    <Box w="8px" h="8px" borderRadius="full" bg={server.connected ? '#2d9c79' : '#c7ccd6'} />
                    <Box flex="1">
                      <Text fontSize="12px" fontWeight="600">{server.name}</Text>
                      <Text fontSize="10px" color="app.subtle">{server.category}</Text>
                    </Box>
                    <Switch isChecked={server.connected} onChange={() => toggleServer(server.id)} colorScheme="orange" size="sm" />
                  </Flex>
                ))}
              </Stack>
            )}
          </Card>
        </Stack>
      </Flex>
    </>
  );
}
