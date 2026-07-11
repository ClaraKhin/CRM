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
  SearchIcon,
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
  { label: 'Summarize today\'s meetings', tool: 'Google Calendar' },
  { label: 'Which deals are at risk?', tool: 'CRM Database' },
  { label: 'Generate a Q2 forecast', tool: 'CRM Database' },
  { label: 'Show overdue invoices', tool: 'CRM Database' },
  { label: 'Search customer records', tool: 'CRM Database' },
  { label: 'Summarize latest email conversation', tool: 'Gmail' }
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
      // Seed a welcome message
      const welcome = await supabase.from('chat_messages').insert({
        user_id: session.user.id, role: 'ai',
        content: `Good morning ${profile?.full_name?.split(' ')[0] ?? 'there'}! I'm your AI sales copilot. I can search your CRM, draft emails, schedule meetings, and analyze your pipeline. Try one of the suggestions below or ask me anything.`
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

  // Auto-scroll to bottom on new messages
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

  // Real CRM data queries — the AI "executes MCP tools" by querying the database
  const executeTool = async (tool: string, action: string, input: Record<string, unknown> = {}): Promise<{ text: string; status: 'success' | 'error' }> => {
    const start = Date.now();
    try {
      if (!session?.user) return { text: 'Not authenticated', status: 'error' };

      let resultText = '';
      let outputData: Record<string, unknown> = {};

      if (action === 'summarize_meetings') {
        const today = new Date().toISOString().split('T')[0];
        const { data } = await supabase.from('events').select('*').eq('user_id', session.user.id).gte('event_date', today).order('event_date', { ascending: true }).limit(10);
        const events = data ?? [];
        if (events.length === 0) {
          resultText = 'You have no upcoming meetings scheduled. Want me to create one?';
        } else {
          resultText = `You have ${events.length} upcoming meeting${events.length > 1 ? 's' : ''}:\n` + events.map((e: any) => `• ${e.title} — ${e.event_date} at ${e.time}${e.sync ? ` (${e.sync} sync)` : ''}`).join('\n');
        }
        outputData = { count: events.length };
      } else if (action === 'deals_at_risk') {
        const { data } = await supabase.from('deals').select('*').eq('user_id', session.user.id).neq('stage', 'Won').neq('stage', 'Lost').order('close_date', { ascending: true });
        const deals = (data ?? []).filter((d: any) => {
          if (!d.close_date) return false;
          const days = (new Date(d.close_date).getTime() - Date.now()) / 86400000;
          return days <= 7 && days >= -30;
        });
        if (deals.length === 0) {
          resultText = 'No deals are currently at risk. Your pipeline looks healthy!';
        } else {
          resultText = `${deals.length} deal${deals.length > 1 ? 's are' : ' is'} at risk:\n` + deals.map((d: any) => `• ${d.title} — $${d.value.toLocaleString()} (${d.stage}, ${d.probability}% — close date: ${d.close_date})`).join('\n');
        }
        outputData = { count: deals.length };
      } else if (action === 'generate_forecast') {
        const { data } = await supabase.from('deals').select('*').eq('user_id', session.user.id).neq('stage', 'Lost');
        const deals = data ?? [];
        const won = deals.filter((d: any) => d.stage === 'Won').reduce((s: number, d: any) => s + d.value, 0);
        const weighted = deals.reduce((s: number, d: any) => s + d.value * d.probability / 100, 0);
        const open = deals.filter((d: any) => d.stage !== 'Won').reduce((s: number, d: any) => s + d.value, 0);
        resultText = `Q2 Forecast:\n• Won revenue: $${won.toLocaleString()}\n• Weighted pipeline: $${Math.round(weighted).toLocaleString()}\n• Open pipeline: $${open.toLocaleString()}\n• Total projected: $${Math.round(won + weighted).toLocaleString()}\n• Confidence: ${deals.length > 0 ? Math.round(deals.reduce((s: number, d: any) => s + d.probability, 0) / deals.length) : 0}%`;
        outputData = { won, weighted, open };
      } else if (action === 'overdue_invoices') {
        const today = new Date().toISOString().split('T')[0];
        const { data } = await supabase.from('invoices').select('*').eq('user_id', session.user.id).neq('status', 'Paid').lt('due_date', today);
        const invoices = data ?? [];
        if (invoices.length === 0) {
          resultText = 'No overdue invoices. All payments are up to date!';
        } else {
          resultText = `${invoices.length} overdue invoice${invoices.length > 1 ? 's' : ''}:\n` + invoices.map((i: any) => `• ${i.number} — $${i.amount.toLocaleString()} (due: ${i.due_date})`).join('\n');
        }
        outputData = { count: invoices.length };
      } else if (action === 'search_customers') {
        const { data } = await supabase.from('customers').select('*, people(*)').eq('user_id', session.user.id).limit(10);
        const customers = data ?? [];
        if (customers.length === 0) {
          resultText = 'No customers found in your CRM yet.';
        } else {
          resultText = `Found ${customers.length} customer${customers.length > 1 ? 's' : ''}:\n` + customers.map((c: any) => `• ${c.people?.company ?? 'Unknown'} — ${c.status} ($${(c.lifetime_value ?? 0).toLocaleString()} LTV)`).join('\n');
        }
        outputData = { count: customers.length };
      } else if (action === 'summarize_email') {
        const { data } = await supabase.from('activities').select('*').eq('user_id', session.user.id).eq('type', 'Email').order('created_at', { ascending: false }).limit(3);
        const emails = data ?? [];
        if (emails.length === 0) {
          resultText = 'No recent email conversations found. Connect Gmail via MCP to sync your inbox.';
        } else {
          resultText = `Latest ${emails.length} email${emails.length > 1 ? 's' : ''}:\n` + emails.map((e: any) => `• ${e.subject} — ${e.description ?? 'No preview'} (${new Date(e.created_at).toLocaleDateString()})`).join('\n');
        }
        outputData = { count: emails.length };
      } else if (action === 'schedule_meeting') {
        resultText = 'I can help you schedule a meeting. What date, time, and title would you like? You can also create events directly from the Calendar page.';
        outputData = {};
      } else if (action === 'draft_email') {
        resultText = 'I\'ll draft an email for you. Who is the recipient and what is the topic? I can use your last activity notes to personalize it.';
        outputData = {};
      } else if (action === 'generate_quote') {
        const { data: people } = await supabase.from('people').select('*').eq('user_id', session.user.id).limit(5);
        const count = people?.length ?? 0;
        resultText = `I can generate a quote for you. You have ${count} contacts available. Navigate to the Quotes page and click "New quote" to create one, or tell me which customer and amount.`;
        outputData = { contacts: count };
      } else {
        resultText = 'I\'m not sure how to handle that request yet, but I can search customers, summarize meetings, check overdue invoices, forecast revenue, and analyze your pipeline. Try one of the suggestions!';
      }

      const latency = Date.now() - start;
      await logToolExecution(tool, action, input, outputData, 'success', latency);
      return { text: resultText, status: 'success' };
    } catch (err: any) {
      const latency = Date.now() - start;
      await logToolExecution(tool, action, input, null, 'error', latency);
      return { text: `Something went wrong: ${err.message}`, status: 'error' };
    }
  };

  // Map natural language to tool actions
  const resolveAction = (text: string): { tool: string; action: string } => {
    const lower = text.toLowerCase();
    if (lower.includes('meeting') && (lower.includes('today') || lower.includes('summar'))) return { tool: 'Google Calendar', action: 'summarize_meetings' };
    if (lower.includes('at risk') || (lower.includes('deal') && lower.includes('risk'))) return { tool: 'CRM Database', action: 'deals_at_risk' };
    if (lower.includes('forecast') || lower.includes('q2') || lower.includes('project')) return { tool: 'CRM Database', action: 'generate_forecast' };
    if (lower.includes('overdue') || lower.includes('invoice')) return { tool: 'CRM Database', action: 'overdue_invoices' };
    if (lower.includes('search') && lower.includes('customer')) return { tool: 'CRM Database', action: 'search_customers' };
    if (lower.includes('email') && (lower.includes('summar') || lower.includes('latest'))) return { tool: 'Gmail', action: 'summarize_email' };
    if (lower.includes('schedule') || lower.includes('meeting') && lower.includes('create')) return { tool: 'Google Calendar', action: 'schedule_meeting' };
    if (lower.includes('draft') && lower.includes('email')) return { tool: 'Gmail', action: 'draft_email' };
    if (lower.includes('quote') || lower.includes('quotation')) return { tool: 'CRM Database', action: 'generate_quote' };
    return { tool: 'CRM Database', action: 'general' };
  };

  const send = async (text: string) => {
    const value = text.trim();
    if (!value || thinking) return;

    // Persist user message
    const userMsg = await persistMessage('user', value);
    if (userMsg) setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setThinking(true);

    // Resolve which MCP tool to use
    const { tool, action } = resolveAction(value);

    // Check if the required MCP server is connected
    const server = servers.find((s) => s.name === tool || s.category === tool);
    const serverConnected = server?.connected ?? (tool === 'CRM Database'); // CRM DB is always available

    if (!serverConnected) {
      setThinking(false);
      const reply = `${tool} is not connected. Toggle it on in the MCP connections panel to enable this capability.`;
      const aiMsg = await persistMessage('ai', reply, tool, 'error');
      if (aiMsg) setMessages((prev) => [...prev, aiMsg]);
      return;
    }

    // Execute the tool
    const result = await executeTool(tool, action, { query: value });

    setThinking(false);
    const aiMsg = await persistMessage('ai', result.text, tool, result.status);
    if (aiMsg) setMessages((prev) => [...prev, aiMsg]);
  };

  const toggleServer = async (id: string) => {
    const server = servers.find((s) => s.id === id);
    if (!server) return;
    setServers((prev) => prev.map((s) => s.id === id ? { ...s, connected: !s.connected } : s));
    await supabase.from('mcp_servers').update({ connected: !server.connected }).eq('id', id).eq('user_id', session!.user.id);
    toast({ title: `${server.name} ${server.connected ? 'disconnected' : 'connected'}`, status: 'info', duration: 1600, position: 'top-right' });
    // Log the toggle as an MCP tool execution
    await logToolExecution(server.name, 'toggle_connection', { connected: !server.connected }, { connected: !server.connected }, 'success', 0);
  };

  const handleClearChat = async () => {
    if (!session?.user) return;
    await supabase.from('chat_messages').delete().eq('user_id', session.user.id);
    setMessages([]);
    setClearChat(false);
    // Re-seed welcome
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
        <Card display="flex" flexDirection="column" h={{ base: 'auto', xl: '640px' }}>
          <CardHeader
            title="Copilot chat"
            subtitle={`Connected to ${connectedCount} tool${connectedCount !== 1 ? 's' : ''}`}
            right={
              <Flex align="center" gap="8px">
                <Box w="7px" h="7px" borderRadius="full" bg={connectedCount > 0 ? '#2d9c79' : '#c7ccd6'} />
                <Icon as={SparklesIcon} boxSize="16px" color="#e9683f" />
              </Flex>
            }
          />

          {/* Messages */}
          <Box ref={scrollRef} flex="1" overflowY="auto" px="18px" py="16px">
            {loadingHistory ? (
              <Flex py="40px" justify="center"><Spinner color="brand.500" size="sm" /></Flex>
            ) : (
              <Stack spacing="14px">
                {messages.map((msg) => (
                  <Flex key={msg.id} gap="10px" flexDirection={msg.role === 'user' ? 'row-reverse' : 'row'}>
                    {msg.role === 'ai' ? (
                      <Flex w="30px" h="30px" borderRadius="9px" bg="navy.600" color="white" align="center" justify="center" flexShrink={0}>
                        <Icon as={BotIcon} boxSize="15px" />
                      </Flex>
                    ) : (
                      <Avatar size="sm" name={displayName} bg={avatarColor} color="#46506a" fontSize="10px" flexShrink={0} />
                    )}
                    <Box maxW="80%">
                      {msg.tool_used && (
                        <Flex align="center" gap="5px" mb="4px" flexDirection={msg.role === 'user' ? 'row-reverse' : 'row'}>
                          <Badge fontSize="8px" borderRadius="full" px="6px" py="1px" bg={msg.tool_status === 'error' ? '#fbe0e0' : '#dcf3e8'} color={msg.tool_status === 'error' ? '#c23c3c' : '#1c8a5c'} textTransform="none">
                            <Flex align="center" gap="3px">
                              <Icon as={ZapIcon} boxSize="8px" />
                              {msg.tool_used}
                            </Flex>
                          </Badge>
                          {msg.tool_status === 'success' && <Icon as={CheckCircleIcon} boxSize="10px" color="#1c8a5c" />}
                        </Flex>
                      )}
                      <Box bg={msg.role === 'user' ? 'brand.500' : 'app.surfaceAlt'} color={msg.role === 'user' ? 'white' : 'app.text'} px="13px" py="10px" borderRadius="13px">
                        <Text fontSize="12px" lineHeight="1.55" whiteSpace="pre-wrap">{msg.content}</Text>
                      </Box>
                      <Text fontSize="9px" color="app.faint" mt="3px" textAlign={msg.role === 'user' ? 'right' : 'left'}>
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </Box>
                  </Flex>
                ))}
                {thinking && (
                  <Flex gap="10px">
                    <Flex w="30px" h="30px" borderRadius="9px" bg="navy.600" color="white" align="center" justify="center" flexShrink={0}>
                      <Icon as={BotIcon} boxSize="15px" />
                    </Flex>
                    <Box bg="app.surfaceAlt" px="13px" py="10px" borderRadius="13px">
                      <Flex align="center" gap="8px">
                        <Spinner size="xs" color="app.faint" />
                        <Text fontSize="11px" color="app.subtle">Querying MCP tools...</Text>
                      </Flex>
                    </Box>
                  </Flex>
                )}
              </Stack>
            )}
          </Box>

          {/* Action chips */}
          <Box px="18px" pt="10px">
            <Flex gap="7px" flexWrap="wrap" mb="10px">
              {actionChips.map((chip) => (
                <Button key={chip.label} size="xs" variant="outline" borderColor="app.border" borderRadius="full" fontSize="11px" leftIcon={<Icon as={chip.icon} boxSize="12px" />} onClick={() => send(chip.label)} isDisabled={thinking}>
                  {chip.label}
                </Button>
              ))}
            </Flex>
          </Box>

          {/* Input */}
          <Box px="18px" pb="16px">
            <InputGroup>
              <Input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown} placeholder="Ask your copilot anything..." bg="app.surfaceAlt" borderColor="app.border" borderRadius="12px" fontSize="13px" isDisabled={thinking} />
              <InputRightElement>
                <Button size="sm" variant="ghost" onClick={() => send(input)} aria-label="Send" isDisabled={thinking || !input.trim()}>
                  <Icon as={SendIcon} boxSize="16px" color="#e9683f" />
                </Button>
              </InputRightElement>
            </InputGroup>
          </Box>
        </Card>

        {/* Right panel */}
        <Stack spacing="18px">
          {/* Suggested prompts */}
          <Card p="18px">
            <Text fontFamily="'Plus Jakarta Sans', sans-serif" fontWeight="800" fontSize="14px" mb="10px">Suggested prompts</Text>
            <Stack spacing="7px">
              {suggestions.map((s) => (
                <Button key={s.label} variant="unstyled" display="flex" align="center" gap="8px" p="10px" borderRadius="10px" bg="app.surfaceAlt" _hover={{ bg: 'brand.50' }} onClick={() => send(s.label)} textAlign="left" isDisabled={thinking} w="full">
                  <Icon as={SparklesIcon} boxSize="13px" color="#e9683f" />
                  <Box flex="1">
                    <Text fontSize="12px">{s.label}</Text>
                    <Text fontSize="9px" color="app.faint">{s.tool}</Text>
                  </Box>
                </Button>
              ))}
            </Stack>
          </Card>

          {/* MCP connections */}
          <Card>
            <CardHeader
              title="MCP connections"
              subtitle={`${connectedCount} connected`}
              right={
                <Tooltip label="Refresh">
                  <IconButton aria-label="Refresh" icon={<RefreshCwIcon size={14} />} size="xs" variant="ghost" onClick={loadServers} />
                </Tooltip>
              }
            />
            {loading ? (
              <Flex py="40px" justify="center"><Spinner color="brand.500" /></Flex>
            ) : (
              <Stack px="18px" py="10px" spacing="0">
                {servers.map((server, i) => {
                  const CatIcon = categoryIcon[server.category] ?? DatabaseIcon;
                  return (
                    <Flex key={server.id} align="center" gap="10px" py="11px" borderBottom={i === servers.length - 1 ? '0' : '1px solid'} borderColor="app.border">
                      <Flex w="30px" h="30px" borderRadius="9px" bg={server.connected ? 'brand.50' : 'app.surfaceAlt'} align="center" justify="center">
                        <Icon as={CatIcon} boxSize="14px" color={server.connected ? '#e9683f' : 'app.faint'} />
                      </Flex>
                      <Box flex="1">
                        <Text fontSize="12px" fontWeight="600">{server.name}</Text>
                        <Text fontSize="10px" color="app.subtle">{server.category}</Text>
                      </Box>
                      <Box w="8px" h="8px" borderRadius="full" bg={server.connected ? '#2d9c79' : '#c7ccd6'} />
                      <Switch isChecked={server.connected} onChange={() => toggleServer(server.id)} colorScheme="orange" size="sm" />
                    </Flex>
                  );
                })}
              </Stack>
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
              <Stack px="18px" py="10px" spacing="0" maxH="200px" overflowY="auto">
                {toolLogs.length === 0 ? (
                  <Text py="14px" fontSize="11px" color="app.faint">No tool executions yet.</Text>
                ) : toolLogs.map((log, i) => (
                  <Flex key={log.id} align="center" gap="8px" py="9px" borderBottom={i === toolLogs.length - 1 ? '0' : '1px solid'} borderColor="app.border">
                    <Icon as={log.status === 'success' ? CheckCircleIcon : ZapIcon} boxSize="12px" color={log.status === 'success' ? '#1c8a5c' : '#c23c3c'} />
                    <Box flex="1">
                      <Text fontSize="11px" fontWeight="600">{log.tool_name} · {log.action}</Text>
                      <Text fontSize="9px" color="app.faint">{new Date(log.created_at).toLocaleTimeString()} · {log.latency_ms}ms</Text>
                    </Box>
                    <Badge fontSize="8px" borderRadius="full" px="5px" bg={log.status === 'success' ? '#dcf3e8' : '#fbe0e0'} color={log.status === 'success' ? '#1c8a5c' : '#c23c3c'} textTransform="none">{log.status}</Badge>
                  </Flex>
                ))}
              </Stack>
            )}
          </Card>
        </Stack>
      </Grid>

      <ConfirmDialog isOpen={clearChat} onClose={() => setClearChat(false)} title="Clear chat history" message="This will permanently delete all your conversation history. Are you sure?" confirmLabel="Clear all" danger onConfirm={handleClearChat} />
    </>
  );
}
