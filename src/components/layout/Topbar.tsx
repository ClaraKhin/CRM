import React, { useEffect, useState } from 'react';
import {
  Avatar,
  Box,
  Flex,
  HStack,
  IconButton,
  Input,
  InputGroup,
  InputLeftElement,
  Menu,
  MenuButton,
  MenuDivider,
  MenuItem,
  MenuList,
  Popover,
  PopoverArrow,
  PopoverBody,
  PopoverContent,
  PopoverHeader,
  PopoverTrigger,
  Spinner,
  Text,
  useColorMode } from
'@chakra-ui/react';
import {
  BellIcon,
  LogOutIcon,
  MenuIcon,
  MoonIcon,
  SearchIcon,
  SettingsIcon,
  SunIcon,
  UserIcon } from
'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ROLE_LABELS, supabase } from '../../lib/supabase';

type Notification = { id: string; title: string; body: string; type: string; read: boolean; priority: string; created_at: string };

export function Topbar({ onOpenPalette, onOpenDrawer }: { onOpenPalette: () => void; onOpenDrawer: () => void; }) {
  const { colorMode, toggleColorMode } = useColorMode();
  const navigate = useNavigate();
  const { profile, signOut, session } = useAuth();
  const displayName = profile?.full_name ?? 'CRM User';
  const roleLabel = profile ? ROLE_LABELS[profile.role] : 'Sales Executive';
  const avatarColor = profile?.avatar_color ?? '#ffdccb';
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loadingNotifs, setLoadingNotifs] = useState(true);

  useEffect(() => {
    if (!session?.user) return;
    (async () => {
      const { data } = await supabase.from('notifications').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false }).limit(20);
      setNotifications((data ?? []) as Notification[]);
      setLoadingNotifs(false);
    })();
  }, [session]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllRead = async () => {
    if (!session?.user) return;
    await supabase.from('notifications').update({ read: true }).eq('user_id', session.user.id).eq('read', false);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const markRead = async (id: string) => {
    await supabase.from('notifications').update({ read: true }).eq('id', id);
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  return (
    <Flex as="header" h="66px" px={{ base: '14px', md: '26px' }} align="center" gap="12px" bg="app.surface" borderBottom="1px solid" borderColor="app.border" position="sticky" top="0" zIndex="sticky" backdropFilter="blur(14px)">
      <IconButton display={{ base: 'flex', lg: 'none' }} aria-label="Open navigation" icon={<MenuIcon size={19} />} variant="ghost" onClick={onOpenDrawer} />

      <InputGroup display={{ base: 'none', md: 'block' }} maxW="420px" onClick={onOpenPalette} cursor="pointer">
        <InputLeftElement pointerEvents="none"><SearchIcon size={16} color="#8a93a6" /></InputLeftElement>
        <Input readOnly aria-label="Open command palette" placeholder="Search anything..." size="sm" bg="app.surfaceAlt" borderColor="app.border" borderRadius="10px" fontSize="12px" cursor="pointer" />
        <Box position="absolute" right="9px" top="6px" border="1px solid" borderColor="app.border" borderRadius="4px" px="4px" color="app.faint" fontSize="9px">⌘ K</Box>
      </InputGroup>

      <HStack ml="auto" spacing="4px">
        <IconButton aria-label="Search" display={{ base: 'flex', md: 'none' }} icon={<SearchIcon size={17} />} variant="ghost" size="sm" onClick={onOpenPalette} />
        <IconButton aria-label="Toggle color mode" icon={colorMode === 'dark' ? <SunIcon size={17} /> : <MoonIcon size={17} />} variant="ghost" size="sm" onClick={toggleColorMode} />

        <Popover placement="bottom-end">
          <PopoverTrigger>
            <Box position="relative">
              <IconButton aria-label="Notifications" icon={<BellIcon size={17} />} variant="ghost" size="sm" />
              {unreadCount > 0 && (
                <Flex position="absolute" top="2px" right="2px" minW="16px" h="16px" px="4px" align="center" justify="center" bg="#e9683f" borderRadius="full">
                  <Text fontSize="9px" fontWeight="800" color="white">{unreadCount > 9 ? '9+' : unreadCount}</Text>
                </Flex>
              )}
            </Box>
          </PopoverTrigger>
          <PopoverContent bg="app.surface" borderColor="app.border" w="340px" maxH="480px" overflowY="auto">
            <PopoverArrow bg="app.surface" />
            <PopoverHeader border="none" fontWeight="700" fontSize="13px" display="flex" alignItems="center" justifyContent="space-between">
              Notifications
              {unreadCount > 0 && <Text fontSize="11px" color="brand.600" cursor="pointer" fontWeight="600" onClick={markAllRead}>Mark all read</Text>}
            </PopoverHeader>
            <PopoverBody px="0" pb="8px">
              {loadingNotifs ? (
                <Flex py="20px" justify="center"><Spinner size="sm" color="brand.500" /></Flex>
              ) : notifications.length === 0 ? (
                <Text px="16px" py="20px" fontSize="12px" color="app.faint" textAlign="center">No notifications yet.</Text>
              ) : notifications.map((n) => {
                const dotColor = n.priority === 'high' ? '#c23c3c' : n.priority === 'urgent' ? '#e9683f' : n.type === 'deal' ? '#6b3fd1' : n.type === 'task' ? '#1c8a5c' : '#3355c9';
                return (
                  <Flex key={n.id} px="16px" py="10px" gap="10px" _hover={{ bg: 'app.surfaceAlt' }} cursor="pointer" onClick={() => markRead(n.id)} bg={n.read ? 'transparent' : 'rgba(233,104,63,0.03)'}>
                    <Box mt="5px" w="7px" h="7px" borderRadius="full" bg={dotColor} flexShrink={0} opacity={n.read ? 0.4 : 1} />
                    <Box flex="1">
                      <Text fontSize="12px" fontWeight={n.read ? '500' : '700'}>{n.title}</Text>
                      {n.body && <Text fontSize="10px" color="app.subtle" mt="2px">{n.body}</Text>}
                      <Text fontSize="9px" color="app.faint" mt="3px">{new Date(n.created_at).toLocaleString()}</Text>
                    </Box>
                    {!n.read && <Box w="6px" h="6px" borderRadius="full" bg="brand.500" mt="6px" flexShrink={0} />}
                  </Flex>
                );
              })}
            </PopoverBody>
          </PopoverContent>
        </Popover>

        <Menu placement="bottom-end">
          <MenuButton ml="2px">
            <Avatar size="sm" name={displayName} bg={avatarColor} color="#46506a" fontSize="11px" cursor="pointer" />
          </MenuButton>
          <MenuList bg="app.surface" borderColor="app.border">
            <Box px="12px" py="6px">
              <Text fontSize="13px" fontWeight="700">{displayName}</Text>
              <Text fontSize="11px" color="app.subtle">{roleLabel}</Text>
            </Box>
            <MenuDivider />
            <MenuItem bg="app.surface" icon={<UserIcon size={15} />} fontSize="13px" onClick={() => navigate('/settings')}>Profile</MenuItem>
            <MenuItem bg="app.surface" icon={<SettingsIcon size={15} />} fontSize="13px" onClick={() => navigate('/settings')}>Settings</MenuItem>
            <MenuDivider />
            <MenuItem bg="app.surface" icon={<LogOutIcon size={15} />} fontSize="13px" color="#c23c3c" onClick={handleSignOut}>Sign out</MenuItem>
          </MenuList>
        </Menu>
      </HStack>
    </Flex>
  );
}
