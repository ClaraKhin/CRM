import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Avatar,
  Badge,
  Box,
  Button,
  Flex,
  Grid,
  Icon,
  IconButton,
  Input,
  InputGroup,
  InputRightElement,
  Spinner,
  Stack,
  Switch,
  Text,
  Tooltip,
  useToast } from
'@chakra-ui/react';
import {
  BotIcon,
  CalendarPlusIcon,
  CheckCircleIcon,
  ChevronDownIcon,
  ClockIcon,
  DatabaseIcon,
  FileTextIcon,
  MailIcon,
  RefreshCwIcon,
  SendIcon,
  SparklesIcon,
  Trash2Icon,
  ZapIcon } from
'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Card, CardHeader } from '../components/ui/Card';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

type ChatMessage = {
  id: string;
  role: 'user' | 'ai';
  content: string;
  tool_used: string | null;
  tool_status: string | null;
  created_at: string;
};

type McpServer = { id: string; name: string; category: string; connected: boolean };
type ToolLog = { id: string; tool_name: string; action: string; status: string; latency_ms: number; created_at: string };

const categoryIcon: Record<string, React.ElementType> = {
  Email: MailIcon,
  Calendar: CalendarPlusIcon,
  Messaging: SendIcon,
  Payments: DatabaseIcon,
  Database: DatabaseIcon,
  Storage: DatabaseIcon,
  CRM: DatabaseIcon
};

const suggestions = [
  { label: 'Summarize today\'s meetings', tool: 'Google Calendar', icon: CalendarPlusIcon },
  { label: 'Which deals are at risk?', tool: 'CRM Database', icon: DatabaseIcon },
  { label: 'Generate a Q2 forecast', tool: 'CRM Database', icon: ZapIcon },
  { label: 'Show overdue invoices', tool: 'CRM Database', icon: FileTextIcon },
  { label: 'Search customer records', tool: 'CRM Database', icon: DatabaseIcon },
  { label: 'Summarize latest email conversation', tool: 'Gmail', icon: MailIcon }
];

const actionChips = [
  { label: 'Schedule meeting', icon: CalendarPlusIcon, tool: 'Google Calendar' },
  { label: 'Draft email', icon: MailIcon, tool: 'Gmail' },
  { label: 'Generate quote', icon: FileTextIcon, tool: 'CRM Database' }
];

export function Assistant() {
  const { session, profile } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [servers, setServers] = useState<McpServer[]>([]);
  const [toolLogs, setToolLogs] = useState<ToolLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [thinking, setThinking] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [clearChat, setClearChat] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  const loadServers = useCallback(async () => {
    if (!session?.user) return;
    const { data } = await supabase.from('mcp_servers').select('*').eq('user_id', session.user.id).order('created_at', { ascending: true });
    setServers((data ?? []) as McpServer[]);
    setLoading(false);
  }, [session]);

  const loadMessages = useCallback(async () => {
    if (!session?.user) return;
    setLoadingHistory(true);
    const { data } = await supabase.from('chat_messages').select('*').eq('user_id', session.user.id).order('created_at', { ascending: true }).limit(50);
    const msgs = (data ?? []) as ChatMessage[];
    if (msgs.length === 0) {
      const welcome = await supabase.from('chat_messages').insert({
        user_id: session.user.id, role: 'ai',
        content: `Hi ${profile?.full_name?.split(' ')[0] ?? 'there'}! I'm your AI sales copilot. I can search your CRM, draft emails, schedule meetings, and analyze your pipeline. How can I help you today?`
      }).select().maybeSingle();
      if (welcome.data) setMessages([welcome.data as ChatMessage]);
    } else {
      setMessages(msgs);
    }
    setLoadingHistory(false);
  }, [session, profile]);

  const loadToolLogs = useCallback(async () => {
    if (!session?.user) return;
    const { data } = await supabase.from('mcp_tool_logs').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false }).limit(15);
    setToolLogs((data ?? []) as ToolLog[]);
  }, [session]);

  useEffect(() => { loadServers(); loadMessages(); loadToolLogs(); }, [loadServers, loadMessages, loadToolLogs]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, thinking]);

  const persistMessage = async (role: 'user' | 'ai', content: string, tool_used: string | null = null, tool_status: string | null = null): Promise<ChatMessage | null> => {
    if (!session?.user) return null;
    const { data } = await supabase.from('chat_messages').insert({
      user_id: session.user.id, role, content, tool_used, tool_status
    }).select().maybeSingle();
    return data as ChatMessage | null;
  };

  const logToolExecution = async (toolName: string, action: string, input: Record<string, unknown>, output: Record<string, unknown> | null, status: 'success' | 'error', latencyMs: number) => {
    if (!session?.user) return;
    await supabase.from('mcp_tool_logs').insert({
      user_id: session.user.id, tool_name: toolName, action,
      input, output, status, latency_ms: latencyMs
    });
    loadToolLogs();
  };

  const executeTool = async (tool: string, action: string, input: Record<string, unknown> = {}): Promise<{ text: string; status: 'success' | 'error' }> => {
    const start = Date.now();
    try {
      if (!session?.user) return { text: 'Not authenticated', status: 'error' };

      const { data, error } = await supabase.functions.invoke('ai-assistant', {
        body: { query: input.query ?? action, userId: session.user.id },
      });

      const latency = Date.now() - start;
      if (error || data?.error) {
        await logToolExecution('AI Assistant', action, input, null, 'error', latency);
        return { text: data?.answer ?? `Something went wrong: ${error?.message ?? 'Unknown error'}`, status: 'error' };
      }

      const toolsUsed = (data.toolsUsed ?? ['CRM Database']) as string[];
      await logToolExecution(toolsUsed.join(', '), action, input, { answer: data.answer }, 'success', latency);
      return { text: data.answer, status: 'success' };
    } catch (err: any) {
      const latency = Date.now() - start;
      await logToolExecution('AI Assistant', action, input, null, 'error', latency);
      return { text: `Something went wrong: ${err.message}`, status: 'error' };
    }
  };

  const resolveAction = (text: string): { tool: string; action: string } => {
    return { tool: 'AI Assistant', action: text.toLowerCase().replace(/\s+/g, '_').slice(0, 50) };
  };

  const send = async (text: string) => {
    const value = text.trim();
    if (!value || thinking) return;

    const userMsg = await persistMessage('user', value);
    if (userMsg) setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setThinking(true);

    const { tool, action } = resolveAction(value);

    const result = await executeTool(tool, action, { query: value });
    setThinking(false);
    const toolLabel = result.status === 'success' ? 'AI Assistant' : tool;
    const aiMsg = await persistMessage('ai', result.text, toolLabel, result.status);
    if (aiMsg) setMessages((prev) => [...prev, aiMsg]);
  };

  const toggleServer = async (id: string) => {
    const server = servers.find((s) => s.id === id);
    if (!server) return;
    setServers((prev) => prev.map((s) => s.id === id ? { ...s, connected: !s.connected } : s));
    await supabase.from('mcp_servers').update({ connected: !server.connected }).eq('id', id).eq('user_id', session!.user.id);
    toast({ title: `${server.name} ${server.connected ? 'disconnected' : 'connected'}`, status: 'info', duration: 1600, position: 'top-right' });
    await logToolExecution(server.name, 'toggle_connection', { connected: !server.connected }, { connected: !server.connected }, 'success', 0);
  };

  const handleClearChat = async () => {
    if (!session?.user) return;
    await supabase.from('chat_messages').delete().eq('user_id', session.user.id);
    setMessages([]);
    setClearChat(false);
    loadMessages();
    toast({ title: 'Chat cleared', status: 'success', duration: 1600, position: 'top-right' });
  };

  const connectedCount = servers.filter((s) => s.connected).length;
  const displayName = profile?.full_name ?? 'CRM User';
  const avatarColor = profile?.avatar_color ?? '#ffdccb';

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  };

  // Group servers by category
  const serverCategories = servers.reduce((acc, s) => {
    (acc[s.category] ??= []).push(s);
    return acc;
  }, {} as Record<string, McpServer[]>);

  return (
    <>
      <PageHeader
        title="AI Assistant"
        subtitle="Your MCP-powered sales copilot."
        actions={
          <Button size="sm" variant="outline" borderColor="app.border" borderRadius="9px" fontSize="12px" leftIcon={<Trash2Icon size={14} />} onClick={() => setClearChat(true)}>Clear chat</Button>
        } />

      <Grid templateColumns={{ base: '1fr', xl: 'minmax(0, 1.6fr) minmax(300px, 1fr)' }} gap="18px">
        {/* Chat panel */}
        <Card display="flex" flexDirection="column" h={{ base: 'auto', xl: '660px' }} overflow="hidden">
          {/* Header bar */}
          <Flex align="center" gap="11px" px="20px" py="16px" borderBottom="1px solid" borderColor="app.border" bg="app.surfaceAlt">
            <Flex w="36px" h="36px" borderRadius="11px" bg="navy.600" align="center" justify="center" flexShrink={0}>
              <Icon as={BotIcon} boxSize="18px" color="white" />
            </Flex>
            <Box flex="1">
              <Text fontFamily="'Plus Jakarta Sans', sans-serif" fontWeight="800" fontSize="15px">Copilot chat</Text>
              <Flex align="center" gap="5px" mt="1px">
                <Box w="6px" h="6px" borderRadius="full" bg={connectedCount > 0 ? 'green.400' : 'app.faint'} />
                <Text fontSize="11px" color="app.subtle">{connectedCount} tool{connectedCount !== 1 ? 's' : ''} connected</Text>
              </Flex>
            </Box>
            <Icon as={SparklesIcon} boxSize="18px" color="brand.500" />
          </Flex>

          {/* Messages */}
          <Box ref={scrollRef} flex="1" overflowY="auto" px={{ base: '14px', md: '20px' }} py="18px" sx={{ scrollbarWidth: 'thin' }}>
            {loadingHistory ? (
              <Flex py="60px" justify="center" direction="column" align="center" gap="10px">
                <Spinner color="brand.500" size="sm" />
                <Text fontSize="11px" color="app.faint">Loading conversation...</Text>
              </Flex>
            ) : (
              <Stack spacing="16px">
                {messages.map((msg) => (
                  <Flex key={msg.id} gap="10px" flexDirection={msg.role === 'user' ? 'row-reverse' : 'row'}>
                    {msg.role === 'ai' ? (
                      <Flex w="32px" h="32px" borderRadius="10px" bg="navy.600" color="white" align="center" justify="center" flexShrink={0}>
                        <Icon as={BotIcon} boxSize="16px" />
                      </Flex>
                    ) : (
                      <Avatar size="sm" name={displayName} bg={avatarColor} color="app.subtle" fontSize="10px" flexShrink={0} w="32px" h="32px" />
                    )}
                    <Box maxW="82%">
                      {msg.tool_used && (
                        <Flex align="center" gap="5px" mb="5px" flexDirection={msg.role === 'user' ? 'row-reverse' : 'row'}>
                          <Badge fontSize="8px" borderRadius="full" px="7px" py="2px" bg={msg.tool_status === 'error' ? 'red.50' : 'green.50'} color={msg.tool_status === 'error' ? 'red.500' : 'green.600'} textTransform="none" fontWeight="700">
                            <Flex align="center" gap="3px">
                              <Icon as={ZapIcon} boxSize="8px" />
                              {msg.tool_used}
                            </Flex>
                          </Badge>
                          {msg.tool_status === 'success' && <Icon as={CheckCircleIcon} boxSize="10px" color="green.500" />}
                        </Flex>
                      )}
                      <Box
                        bg={msg.role === 'user' ? 'brand.500' : 'app.surfaceAlt'}
                        color={msg.role === 'user' ? 'white' : 'app.text'}
                        px="14px"
                        py="11px"
                        borderRadius={msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px'}
                        boxShadow={msg.role === 'user' ? '0 2px 8px rgba(233,104,63,0.15)' : 'none'}
                      >
                        <Text fontSize="12.5px" lineHeight="1.6" whiteSpace="pre-wrap">{msg.content}</Text>
                      </Box>
                      <Text fontSize="9px" color="app.faint" mt="4px" textAlign={msg.role === 'user' ? 'right' : 'left'}>
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </Box>
                  </Flex>
                ))}
                {thinking && (
                  <Flex gap="10px">
                    <Flex w="32px" h="32px" borderRadius="10px" bg="navy.600" color="white" align="center" justify="center" flexShrink={0}>
                      <Icon as={BotIcon} boxSize="16px" />
                    </Flex>
                    <Box bg="app.surfaceAlt" px="14px" py="12px" borderRadius="16px 16px 16px 4px">
                      <Flex align="center" gap="10px">
                        <Flex gap="4px">
                          <Box w="7px" h="7px" borderRadius="full" bg="app.subtle" opacity={0.5} animation="pulsethink 1.4s ease-in-out infinite" />
                          <Box w="7px" h="7px" borderRadius="full" bg="app.subtle" opacity={0.5} animation="pulsethink 1.4s ease-in-out 0.2s infinite" />
                          <Box w="7px" h="7px" borderRadius="full" bg="app.subtle" opacity={0.5} animation="pulsethink 1.4s ease-in-out 0.4s infinite" />
                        </Flex>
                        <Text fontSize="11px" color="app.subtle">Querying MCP tools...</Text>
                      </Flex>
                    </Box>
                  </Flex>
                )}
              </Stack>
            )}
          </Box>

          {/* Quick actions */}
          <Box px={{ base: '14px', md: '20px' }} pt="10px" pb="6px">
            <Flex gap="7px" flexWrap="wrap">
              {actionChips.map((chip) => {
                const ChipIcon = chip.icon;
                return (
                  <Button
                    key={chip.label}
                    size="xs"
                    h="30px"
                    variant="outline"
                    borderColor="app.border"
                    borderRadius="full"
                    fontSize="11px"
                    fontWeight="600"
                    leftIcon={<ChipIcon size={12} />}
                    _hover={{ bg: 'brand.50', borderColor: 'brand.200', color: 'brand.600' }}
                    onClick={() => send(chip.label)}
                    isDisabled={thinking}>
                    {chip.label}
                  </Button>
                );
              })}
            </Flex>
          </Box>

          {/* Input */}
          <Box px={{ base: '14px', md: '20px' }} pb="16px">
            <InputGroup>
              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask your copilot anything..."
                bg="app.surfaceAlt"
                borderColor="app.border"
                borderRadius="14px"
                fontSize="13px"
                h="46px"
                isDisabled={thinking}
                _focus={{ borderColor: 'brand.400', boxShadow: '0 0 0 3px rgba(233,104,63,0.12)' }}
                aria-label="Chat message input"
              />
              <InputRightElement h="46px">
                <Button
                  size="sm"
                  h="34px"
                  w="34px"
                  borderRadius="10px"
                  bg={input.trim() && !thinking ? 'brand.500' : 'app.surfaceAlt'}
                  color={input.trim() && !thinking ? 'white' : 'app.faint'}
                  _hover={input.trim() && !thinking ? { bg: 'brand.600' } : {}}
                  onClick={() => send(input)}
                  aria-label="Send message"
                  isDisabled={thinking || !input.trim()}
                  p="0">
                  <SendIcon size={16} />
                </Button>
              </InputRightElement>
            </InputGroup>
          </Box>
        </Card>

        {/* Right panel */}
        <Stack spacing="18px">
          {/* Suggested prompts */}
          <Card p="18px">
            <Flex align="center" gap="8px" mb="12px">
              <Icon as={SparklesIcon} boxSize="15px" color="brand.500" />
              <Text fontFamily="'Plus Jakarta Sans', sans-serif" fontWeight="800" fontSize="14px">Suggested prompts</Text>
            </Flex>
            <Stack spacing="7px">
              {suggestions.map((s) => {
                const SIcon = s.icon;
                return (
                  <Button
                    key={s.label}
                    variant="unstyled"
                    display="flex"
                    align="center"
                    gap="10px"
                    p="11px"
                    borderRadius="11px"
                    bg="app.surfaceAlt"
                    _hover={{ bg: 'brand.50', transform: 'translateX(2px)' }}
                    transition="all .15s ease"
                    onClick={() => send(s.label)}
                    textAlign="left"
                    isDisabled={thinking}
                    w="full">
                    <Flex w="28px" h="28px" borderRadius="8px" bg="app.surface" align="center" justify="center" flexShrink={0}>
                      <SIcon size={14} color="brand.500" />
                    </Flex>
                    <Box flex="1">
                      <Text fontSize="12px" fontWeight="600">{s.label}</Text>
                      <Text fontSize="9px" color="app.faint">{s.tool}</Text>
                    </Box>
                  </Button>
                );
              })}
            </Stack>
          </Card>

          {/* MCP connections */}
          <Card>
            <CardHeader
              title="MCP connections"
              subtitle={`${connectedCount} connected`}
              right={
                <Tooltip label="Refresh connections">
                  <IconButton aria-label="Refresh connections" icon={<RefreshCwIcon size={14} />} size="xs" variant="ghost" onClick={loadServers} />
                </Tooltip>
              }
            />
            {loading ? (
              <Flex py="40px" justify="center"><Spinner color="brand.500" /></Flex>
            ) : (
              <Box px="18px" py="10px">
                {Object.entries(serverCategories).map(([category, catServers], catIdx) => (
                  <Box key={category} mb={catIdx < Object.keys(serverCategories).length - 1 ? '12px' : '0'}>
                    <Text fontSize="10px" fontWeight="700" color="app.faint" letterSpacing="0.08em" mb="6px" px="2px">{category.toUpperCase()}</Text>
                    {catServers.map((server, i) => {
                      const CatIcon = categoryIcon[server.category] ?? DatabaseIcon;
                      return (
                        <Flex
                          key={server.id}
                          align="center"
                          gap="10px"
                          py="10px"
                          px="8px"
                          borderRadius="10px"
                          _hover={{ bg: 'app.surfaceAlt' }}
                          transition="background .12s ease"
                          borderBottom={i === catServers.length - 1 ? '0' : '1px solid'}
                          borderColor="app.border">
                          <Flex w="30px" h="30px" borderRadius="9px" bg={server.connected ? 'brand.50' : 'app.surfaceAlt'} align="center" justify="center" flexShrink={0}>
                            <Icon as={CatIcon} boxSize="14px" color={server.connected ? 'brand.500' : 'app.faint'} />
                          </Flex>
                          <Box flex="1" minW="0">
                            <Text fontSize="12px" fontWeight="600" noOfLines={1}>{server.name}</Text>
                          </Box>
                          <Box w="7px" h="7px" borderRadius="full" bg={server.connected ? 'green.400' : 'app.faint'} flexShrink={0} />
                          <Switch isChecked={server.connected} onChange={() => toggleServer(server.id)} colorScheme="orange" size="sm" aria-label={`Toggle ${server.name} connection`} />
                        </Flex>
                      );
                    })}
                  </Box>
                ))}
              </Box>
            )}
          </Card>

          {/* Tool execution logs */}
          <Card>
            <CardHeader
              title="Tool execution logs"
              subtitle={`${toolLogs.length} recent`}
              right={
                <Button size="xs" variant="ghost" rightIcon={<ChevronDownIcon size={14} />} onClick={() => setShowLogs(!showLogs)}>
                  {showLogs ? 'Hide' : 'Show'}
                </Button>
              }
            />
            {showLogs && (
              <Box px="18px" py="10px" maxH="220px" overflowY="auto" sx={{ scrollbarWidth: 'thin' }}>
                {toolLogs.length === 0 ? (
                  <Flex py="20px" direction="column" align="center" gap="6px">
                    <Icon as={ClockIcon} boxSize="20px" color="app.faint" />
                    <Text fontSize="11px" color="app.faint">No tool executions yet.</Text>
                  </Flex>
                ) : (
                  <Stack spacing="0">
                    {toolLogs.map((log, i) => (
                      <Flex key={log.id} align="center" gap="8px" py="9px" borderBottom={i === toolLogs.length - 1 ? '0' : '1px solid'} borderColor="app.border">
                        <Icon as={log.status === 'success' ? CheckCircleIcon : ZapIcon} boxSize="12px" color={log.status === 'success' ? 'green.500' : 'red.500'} flexShrink={0} />
                        <Box flex="1" minW="0">
                          <Text fontSize="11px" fontWeight="600" noOfLines={1}>{log.tool_name} · {log.action}</Text>
                          <Text fontSize="9px" color="app.faint">{new Date(log.created_at).toLocaleTimeString()} · {log.latency_ms}ms</Text>
                        </Box>
                        <Badge fontSize="8px" borderRadius="full" px="5px" py="1px" bg={log.status === 'success' ? 'green.50' : 'red.50'} color={log.status === 'success' ? 'green.600' : 'red.500'} textTransform="none" fontWeight="700">{log.status}</Badge>
                      </Flex>
                    ))}
                  </Stack>
                )}
              </Box>
            )}
          </Card>
        </Stack>
      </Grid>

      <ConfirmDialog isOpen={clearChat} onClose={() => setClearChat(false)} title="Clear chat history" message="This will permanently delete all your conversation history. Are you sure?" confirmLabel="Clear all" danger onConfirm={handleClearChat} />
    </>
  );
}
