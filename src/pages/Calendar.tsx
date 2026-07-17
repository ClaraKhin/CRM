import React, { useCallback, useEffect, useState } from 'react';
import {
  Badge,
  Box,
  Button,
  Flex,
  FormControl,
  FormLabel,
  Grid,
  HStack,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Popover,
  PopoverArrow,
  PopoverBody,
  PopoverContent,
  PopoverTrigger,
  Select,
  Spinner,
  Stack,
  Text,
  useDisclosure,
  useToast } from
'@chakra-ui/react';
import { CalendarIcon, ClockIcon, PlusIcon, RefreshCwIcon, Trash2Icon } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { FormModal } from '../components/ui/FormModal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

type Event = {
  id: string;
  title: string;
  type: string;
  event_date: string;
  time: string;
  sync: string | null;
  description: string;
};

const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const typeColor: Record<string, string> = {
  Meeting: '#e9683f', Call: '#6b3fd1', Demo: '#2d9c79', Event: '#3355c9'
};
const TYPE_OPTIONS = ['Meeting', 'Call', 'Demo', 'Event'];
const SYNC_OPTIONS = ['', 'Google', 'Outlook'];

export function Calendar() {
  const toast = useToast();
  const { session } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'Month' | 'Week' | 'Day'>('Month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const formDrawer = useDisclosure();
  const confirmDel = useDisclosure();
  const [editing, setEditing] = useState<Event | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [dragEventId, setDragEventId] = useState<string | null>(null);
  const [dragOverDay, setDragOverDay] = useState<number | null>(null);
  const [openPopoverId, setOpenPopoverId] = useState<string | null>(null);
  const [form, setForm] = useState({ title: '', type: 'Meeting', event_date: '', time: '09:00', sync: '', description: '' });

  const load = useCallback(async () => {
    if (!session?.user) return;
    setLoading(true);
    const { data } = await supabase.from('events').select('*').eq('user_id', session.user.id).order('event_date', { ascending: true });
    setEvents((data ?? []) as Event[]);
    setLoading(false);
  }, [session]);

  useEffect(() => { load(); }, [load]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const offset = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  const isToday = (day: number) => day === today.getDate() && month === today.getMonth() && year === today.getFullYear();

  const eventsForDay = (day: number) => events.filter((e) => {
    const d = new Date(e.event_date);
    return d.getDate() === day && d.getMonth() === month && d.getFullYear() === year;
  });

  const formatDate = (day: number) => `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  const openCreate = (day?: number) => {
    setEditing(null);
    const defaultDate = day ? formatDate(day) : '';
    setForm({ title: '', type: 'Meeting', event_date: defaultDate, time: '09:00', sync: '', description: '' });
    formDrawer.onOpen();
  };

  const openEdit = (event: Event) => {
    setOpenPopoverId(null);
    setEditing(event);
    setForm({ title: event.title, type: event.type, event_date: event.event_date, time: event.time, sync: event.sync ?? '', description: event.description });
    formDrawer.onOpen();
  };

  const handleSubmit = async () => {
    if (!form.title.trim()) { toast({ title: 'Title is required', status: 'error', duration: 2000, position: 'top-right' }); return; }
    if (!form.event_date) { toast({ title: 'Date is required', status: 'error', duration: 2000, position: 'top-right' }); return; }
    setSaving(true);
    if (editing) {
      const { error } = await supabase.from('events').update({
        title: form.title, type: form.type, event_date: form.event_date, time: form.time,
        sync: form.sync || null, description: form.description
      }).eq('id', editing.id).eq('user_id', session!.user.id);
      if (!error) toast({ title: 'Event updated', status: 'success', duration: 2000, position: 'top-right' });
    } else {
      const { error } = await supabase.from('events').insert({
        user_id: session!.user.id, title: form.title, type: form.type, event_date: form.event_date,
        time: form.time, sync: form.sync || null, description: form.description
      });
      if (!error) toast({ title: 'Event created', status: 'success', duration: 2000, position: 'top-right' });
    }
    setSaving(false);
    formDrawer.onClose();
    load();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from('events').delete().eq('id', deleteId).eq('user_id', session!.user.id);
    if (!error) { toast({ title: 'Event deleted', status: 'success', duration: 1800, position: 'top-right' }); load(); }
    confirmDel.onClose();
    setDeleteId(null);
  };

  const onEventDrop = async (targetDay: number) => {
    if (!dragEventId) return;
    const newDate = formatDate(targetDay);
    setEvents((prev) => prev.map((e) => e.id === dragEventId ? { ...e, event_date: newDate } : e));
    await supabase.from('events').update({ event_date: newDate }).eq('id', dragEventId).eq('user_id', session!.user.id);
    toast({ title: `Event moved to ${newDate}`, status: 'success', duration: 1600, position: 'top-right' });
    setDragEventId(null);
    setDragOverDay(null);
  };

  const cells = Array.from({ length: offset + daysInMonth }, (_, i) => i < offset ? null : i - offset + 1);
  const monthName = currentDate.toLocaleString('en-US', { month: 'long', year: 'numeric' });

  // Hover popup content for an event
  const EventPopup = ({ event }: { event: Event }) => (
    <Stack spacing="8px">
      <Flex align="center" gap="6px">
        <Box w="6px" h="6px" borderRadius="full" bg={typeColor[event.type] ?? '#6b7488'} />
        <Text fontSize="12px" fontWeight="700">{event.title}</Text>
      </Flex>
      <Flex gap="6px" flexWrap="wrap">
        <Badge fontSize="9px" borderRadius="full" px="6px" py="2px" bg={`${typeColor[event.type]}1a`} color={typeColor[event.type]} textTransform="capitalize">{event.type}</Badge>
        {event.sync && <Badge fontSize="9px" borderRadius="full" px="6px" py="2px" bg="#e8f0ff" color="#3355c9" textTransform="capitalize">{event.sync}</Badge>}
      </Flex>
      <Flex align="center" gap="6px"><CalendarIcon size={12} color="#8a93a6" /><Text fontSize="11px" color="app.subtle">{new Date(event.event_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</Text></Flex>
      <Flex align="center" gap="6px"><ClockIcon size={12} color="#8a93a6" /><Text fontSize="11px" color="app.subtle">{event.time}</Text></Flex>
      {event.description && <Text fontSize="11px" color="app.subtle" lineHeight="1.4">{event.description}</Text>}
      <Flex gap="6px" mt="4px">
        <Button size="xs" bg="navy.600" color="white" borderRadius="7px" fontSize="10px" onClick={() => openEdit(event)}>Edit</Button>
        <Button size="xs" variant="outline" borderColor="#c23c3c" color="#c23c3c" borderRadius="7px" fontSize="10px" onClick={() => { setDeleteId(event.id); confirmDel.onOpen(); }}>Delete</Button>
      </Flex>
    </Stack>
  );

  return (
    <>
      <PageHeader
        title="Calendar"
        subtitle={monthName}
        actions={
          <HStack spacing="6px">
            <HStack spacing="2px" bg="app.surfaceAlt" borderRadius="9px" p="2px">
              {(['Month', 'Week', 'Day'] as const).map((v) => (
                <Button key={v} size="xs" borderRadius="7px" fontSize="11px" fontWeight="600"
                  bg={view === v ? 'navy.600' : 'transparent'} color={view === v ? 'white' : 'app.subtle'}
                  _hover={{ bg: view === v ? 'navy.500' : 'app.surface' }}
                  onClick={() => setView(v)}>{v}</Button>
              ))}
            </HStack>
            <Button size="sm" borderRadius="9px" bg="navy.600" color="white" _hover={{ bg: 'navy.500' }} leftIcon={<PlusIcon size={15} />} fontSize="12px" onClick={() => openCreate()}>New event</Button>
          </HStack>
        } />

      <Card p={{ base: '10px', md: '16px' }}>
        <Flex align="center" gap="10px" mb="12px">
          <Button size="xs" variant="ghost" onClick={() => setCurrentDate(new Date(year, month - 1, 1))}>‹</Button>
          <Text fontSize="13px" fontWeight="700" flex="1" textAlign="center">{monthName}</Text>
          <Button size="xs" variant="ghost" onClick={() => setCurrentDate(new Date(year, month + 1, 1))}>›</Button>
          <Button size="xs" variant="outline" borderColor="app.border" fontSize="11px" onClick={() => setCurrentDate(new Date())}>Today</Button>
        </Flex>

        {loading ? (
          <Flex py="60px" justify="center"><Spinner color="brand.500" /></Flex>
        ) : view === 'Month' ? (
          <>
            <Flex gap="6px" mb="8px">
              {weekdays.map((day) => <Text key={day} flex="1" textAlign="center" fontSize="10px" fontWeight="700" color="app.faint">{day}</Text>)}
            </Flex>
            <Box display="grid" gridTemplateColumns="repeat(7, 1fr)" gap="6px">
              {cells.map((day, i) => {
                const dayEvents = day ? eventsForDay(day) : [];
                const isDragOver = dragOverDay === day;
                return (
                  <Box
                    key={i}
                    minH={{ base: '64px', md: '92px' }}
                    borderRadius="10px"
                    border={isDragOver ? '2px dashed' : '1px solid'}
                    borderColor={isDragOver ? '#e9683f' : day && isToday(day) ? '#e9683f' : 'app.border'}
                    bg={isDragOver ? 'rgba(233,104,63,0.05)' : day ? 'app.surface' : 'rgba(0,0,0,0.015)'}
                    p="6px"
                    cursor={day ? 'pointer' : 'default'}
                    onClick={() => day && openCreate(day)}
                    onDragOver={(e) => { if (day) { e.preventDefault(); setDragOverDay(day); } }}
                    onDragLeave={() => setDragOverDay(null)}
                    onDrop={() => day && onEventDrop(day)}>
                    {day && (
                      <>
                        <Text fontSize="11px" fontWeight={isToday(day) ? '800' : '600'} color={isToday(day) ? '#e9683f' : 'app.subtle'} mb="4px">{day}</Text>
                        {dayEvents.map((event) => (
                          <Popover key={event.id} trigger="click" placement="top" gutter={8} isOpen={openPopoverId === event.id} onOpen={() => setOpenPopoverId(event.id)} onClose={() => setOpenPopoverId(null)}>
                            <PopoverTrigger>
                              <Box
                                draggable
                                onDragStart={() => setDragEventId(event.id)}
                                mb="3px"
                                px="5px"
                                py="3px"
                                borderRadius="6px"
                                bg={`${typeColor[event.type]}1a`}
                                borderLeft="2px solid"
                                borderColor={typeColor[event.type]}
                                cursor="grab"
                                _active={{ cursor: 'grabbing' }}
                                transition="transform .1s ease"
                                _hover={{ transform: 'translateX(2px)' }}
                                onClick={(e) => e.stopPropagation()}>
                                <Text fontSize="9px" fontWeight="700" noOfLines={1} color={typeColor[event.type]}>{event.time} {event.title}</Text>
                              </Box>
                            </PopoverTrigger>
                            <PopoverContent bg="app.surface" borderColor="app.border" borderRadius="14px" boxShadow="0 8px 30px rgba(0,0,0,0.12)" maxW="280px" zIndex={9999} onClick={(e) => e.stopPropagation()}>
                              <PopoverArrow bg="app.surface" />
                              <PopoverBody p="14px">
                                <EventPopup event={event} />
                              </PopoverBody>
                            </PopoverContent>
                          </Popover>
                        ))}
                      </>
                    )}
                  </Box>
                );
              })}
            </Box>
          </>
        ) : view === 'Week' ? (
          <Box>
            {weekdays.map((day, i) => {
              const dayDate = new Date(year, month, i - offset + 1);
              const dayNum = dayDate.getDate();
              const dayEvents = events.filter((e) => new Date(e.event_date).toDateString() === dayDate.toDateString());
              return (
                <Flex key={day} py="10px" borderBottom="1px solid" borderColor="app.border" gap="14px" align="start"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => onEventDrop(dayNum)}>
                  <Box w="60px">
                    <Text fontSize="11px" fontWeight="700" color="app.subtle">{day}</Text>
                    <Text fontSize="18px" fontWeight="800">{dayNum}</Text>
                  </Box>
                  <Box flex="1">
                    {dayEvents.length === 0 ? (
                      <Text fontSize="11px" color="app.faint">No events</Text>
                    ) : dayEvents.map((event) => (
                      <Popover key={event.id} trigger="click" placement="right" gutter={8} isOpen={openPopoverId === event.id} onOpen={() => setOpenPopoverId(event.id)} onClose={() => setOpenPopoverId(null)}>
                        <PopoverTrigger>
                          <Flex
                            align="center"
                            gap="8px"
                            py="4px"
                            draggable
                            onDragStart={() => setDragEventId(event.id)}
                            cursor="pointer">
                            <Text fontSize="11px" fontWeight="600" color={typeColor[event.type]} w="44px">{event.time}</Text>
                            <Box px="8px" py="4px" borderRadius="6px" bg={`${typeColor[event.type]}1a`} flex="1"><Text fontSize="12px" fontWeight="600">{event.title}</Text></Box>
                          </Flex>
                        </PopoverTrigger>
                        <PopoverContent bg="app.surface" borderColor="app.border" borderRadius="14px" boxShadow="0 8px 30px rgba(0,0,0,0.12)" maxW="280px" zIndex={9999} onClick={(e) => e.stopPropagation()}>
                          <PopoverArrow bg="app.surface" />
                          <PopoverBody p="14px">
                            <EventPopup event={event} />
                          </PopoverBody>
                        </PopoverContent>
                      </Popover>
                    ))}
                  </Box>
                </Flex>
              );
            })}
          </Box>
        ) : (
          <Box>
            {events.filter((e) => new Date(e.event_date).toDateString() === today.toDateString()).length === 0 ? (
              <Text py="40px" textAlign="center" fontSize="13px" color="app.faint">No events today. Click "New event" to add one.</Text>
            ) : events.filter((e) => new Date(e.event_date).toDateString() === today.toDateString()).map((event) => (
              <Popover key={event.id} trigger="click" placement="right" gutter={8} isOpen={openPopoverId === event.id} onOpen={() => setOpenPopoverId(event.id)} onClose={() => setOpenPopoverId(null)}>
                <PopoverTrigger>
                  <Flex align="center" gap="10px" py="12px" borderBottom="1px solid" borderColor="app.border" cursor="pointer">
                    <Text fontSize="11px" fontWeight="600" color={typeColor[event.type]} w="50px">{event.time}</Text>
                    <Box px="8px" py="6px" borderRadius="6px" bg={`${typeColor[event.type]}1a`} borderLeft="2px solid" borderColor={typeColor[event.type]} flex="1">
                      <Text fontSize="13px" fontWeight="600">{event.title}</Text>
                      <Text fontSize="10px" color="app.subtle">{event.type}{event.sync ? ` · ${event.sync}` : ''}</Text>
                    </Box>
                  </Flex>
                </PopoverTrigger>
                <PopoverContent bg="app.surface" borderColor="app.border" borderRadius="14px" boxShadow="0 8px 30px rgba(0,0,0,0.12)" maxW="280px" zIndex={9999} onClick={(e) => e.stopPropagation()}>
                  <PopoverArrow bg="app.surface" />
                  <PopoverBody p="14px">
                    <EventPopup event={event} />
                  </PopoverBody>
                </PopoverContent>
              </Popover>
            ))}
          </Box>
        )}
      </Card>

      <FormModal isOpen={formDrawer.isOpen} onClose={formDrawer.onClose} title={editing ? 'Edit event' : 'New event'} subtitle={editing ? 'Update event details' : 'Schedule a new event'} loading={saving} onSubmit={handleSubmit} submitLabel={editing ? 'Update' : 'Create'}>
        <FormControl>
          <FormLabel fontSize="12px">Title</FormLabel>
          <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Sakura demo" size="sm" borderRadius="9px" borderColor="app.border" fontSize="13px" />
        </FormControl>
        <FormControl>
          <FormLabel fontSize="12px">Type</FormLabel>
          <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} size="sm" borderRadius="9px" borderColor="app.border" fontSize="13px">
            {TYPE_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
          </Select>
        </FormControl>
        <FormControl>
          <FormLabel fontSize="12px">Date</FormLabel>
          <Input type="date" value={form.event_date} onChange={(e) => setForm({ ...form, event_date: e.target.value })} size="sm" borderRadius="9px" borderColor="app.border" fontSize="13px" />
        </FormControl>
        <FormControl>
          <FormLabel fontSize="12px">Time</FormLabel>
          <Input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} size="sm" borderRadius="9px" borderColor="app.border" fontSize="13px" />
        </FormControl>
        <FormControl>
          <FormLabel fontSize="12px">Calendar sync</FormLabel>
          <Select value={form.sync} onChange={(e) => setForm({ ...form, sync: e.target.value })} size="sm" borderRadius="9px" borderColor="app.border" fontSize="13px">
            {SYNC_OPTIONS.map((s) => <option key={s} value={s}>{s || 'None'}</option>)}
          </Select>
        </FormControl>
        <FormControl>
          <FormLabel fontSize="12px">Description</FormLabel>
          <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Event details..." size="sm" borderRadius="9px" borderColor="app.border" fontSize="13px" />
        </FormControl>
      </FormModal>

      <ConfirmDialog isOpen={confirmDel.isOpen} onClose={confirmDel.onClose} title="Delete event" message="Are you sure you want to delete this event?" confirmLabel="Delete" danger onConfirm={handleDelete} />
    </>
    
  );
}
