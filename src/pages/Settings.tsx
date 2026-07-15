import React, { useCallback, useEffect, useState } from 'react';
import {
  Avatar,
  Badge,
  Box,
  Button,
  Flex,
  FormControl,
  FormLabel,
  Grid,
  HStack,
  Icon,
  Input,
  InputGroup,
  InputRightElement,
  Spinner,
  Stack,
  Switch,
  Text,
  useDisclosure,
  useToast } from '@chakra-ui/react';
import {
  BellIcon,
  CheckIcon,
  EyeIcon,
  EyeOffIcon,
  KeyIcon,
  LockIcon,
  QrCodeIcon,
  ShieldIcon,
  Trash2Icon } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Card, CardHeader } from '../components/ui/Card';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { supabase, ROLE_LABELS } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

const NOTIF_ITEMS = [
  { key: 'email', label: 'Email notifications', desc: 'Receive activity updates via email' },
  { key: 'push', label: 'Push notifications', desc: 'Browser push alerts for important events' },
  { key: 'slack', label: 'Slack alerts', desc: 'Send critical alerts to a Slack channel' },
  { key: 'telegram', label: 'Telegram alerts', desc: 'Get notified through Telegram bot' },
  { key: 'digest', label: 'Weekly digest', desc: 'Summary of your pipeline every Monday' },
];

export function Settings() {
  const toast = useToast();
  const { session, profile, refreshProfile, signOut } = useAuth();
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ full_name: profile?.full_name ?? '', email: profile?.email ?? '' });

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  const [notifPrefs, setNotifPrefs] = useState<Record<string, boolean>>({
    email: true, push: true, slack: false, telegram: false, digest: false,
  });
  const [settingsId, setSettingsId] = useState<string | null>(null);

  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [twoFactorSetupOpen, setTwoFactorSetupOpen] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [twoFactorVerifying, setTwoFactorVerifying] = useState(false);

  const confirmDeleteUser = useDisclosure();

  useEffect(() => {
    setProfileForm({ full_name: profile?.full_name ?? '', email: profile?.email ?? '' });
  }, [profile]);

  const loadNotifPrefs = useCallback(async () => {
    if (!session?.user) return;
    const { data } = await supabase.from('app_settings').select('*').eq('user_id', session.user.id).eq('key', 'notif_prefs').maybeSingle();
    if (data) {
      setSettingsId(data.id);
      try { setNotifPrefs(JSON.parse(data.value)); } catch { /* keep defaults */ }
    }
  }, [session]);

  useEffect(() => { loadNotifPrefs(); }, [loadNotifPrefs]);

  const saveProfile = async () => {
    setSavingProfile(true);
    const { error } = await supabase.from('profiles').update({ full_name: profileForm.full_name }).eq('id', session!.user.id);
    if (error) {
      toast({ title: 'Save failed', description: error.message, status: 'error', duration: 3000, position: 'top-right' });
    } else {
      await refreshProfile();
      toast({ title: 'Profile saved', status: 'success', duration: 1800, position: 'top-right' });
    }
    setSavingProfile(false);
  };

  const handleChangePassword = async () => {
    if (!newPassword || !confirmPassword) {
      toast({ title: 'Fill in all fields', status: 'error', duration: 2000, position: 'top-right' });
      return;
    }
    if (newPassword.length < 6) {
      toast({ title: 'Password must be at least 6 characters', status: 'error', duration: 2000, position: 'top-right' });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: 'New passwords do not match', status: 'error', duration: 2000, position: 'top-right' });
      return;
    }
    setChangingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      toast({ title: 'Password change failed', description: error.message, status: 'error', duration: 3000, position: 'top-right' });
    } else {
      toast({ title: 'Password updated', status: 'success', duration: 2000, position: 'top-right' });
      setOldPassword(''); setNewPassword(''); setConfirmPassword('');
    }
    setChangingPassword(false);
  };

  const saveNotifPref = async (key: string) => {
    const newPrefs = { ...notifPrefs, [key]: !notifPrefs[key] };
    setNotifPrefs(newPrefs);
    if (settingsId) {
      await supabase.from('app_settings').update({ value: JSON.stringify(newPrefs), updated_at: new Date().toISOString() }).eq('id', settingsId);
    } else {
      const { data } = await supabase.from('app_settings').insert({ user_id: session!.user.id, key: 'notif_prefs', value: JSON.stringify(newPrefs) }).select().maybeSingle();
      if (data) setSettingsId(data.id);
    }
  };

  const handleDeleteAccount = async () => {
    const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-user`;
    const headers: Record<string, string> = {
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    };
    if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`;

    try {
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({ action: 'delete', userId: session!.user.id, requestedBy: session!.user.id }),
      });
      if (!res.ok) {
        const err = await res.json();
        toast({ title: 'Delete failed', description: err.error ?? 'Unknown error', status: 'error', duration: 3000, position: 'top-right' });
        return;
      }
      toast({ title: 'Account deleted', status: 'success', duration: 2000, position: 'top-right' });
      await signOut();
    } catch {
      toast({ title: 'Delete failed', description: 'Network error', status: 'error', duration: 3000, position: 'top-right' });
    }
  };

  const verifyTwoFactor = async () => {
    if (twoFactorCode.length !== 6) {
      toast({ title: 'Enter the 6-digit code', status: 'error', duration: 2000, position: 'top-right' });
      return;
    }
    setTwoFactorVerifying(true);
    await new Promise((r) => setTimeout(r, 800));
    setTwoFactorEnabled(true);
    setTwoFactorSetupOpen(false);
    setTwoFactorCode('');
    setTwoFactorVerifying(false);
    toast({ title: '2FA enabled', status: 'success', duration: 2000, position: 'top-right' });
  };

  const disableTwoFactor = () => {
    setTwoFactorEnabled(false);
    toast({ title: '2FA disabled', status: 'info', duration: 1800, position: 'top-right' });
  };

  return (
    <>
      <PageHeader title="Settings" subtitle="Manage your profile, security, and preferences." />

      <Grid templateColumns={{ base: '1fr', lg: '1fr 380px' }} gap="18px" alignItems="start">
        {/* Left column — main settings */}
        <Stack spacing="18px">
          {/* Profile */}
          <Card p="22px">
            <Flex align="center" gap="14px" mb="20px">
              <Avatar size="lg" name={profile?.full_name ?? 'CRM User'} bg={profile?.avatar_color ?? '#ffdccb'} color="#b6451e" />
              <Box>
                <Text fontWeight="700" fontSize="15px">{profile?.full_name ?? 'CRM User'}</Text>
                <Text fontSize="12px" color="app.subtle">{profile ? ROLE_LABELS[profile.role] : 'Sales Executive'}</Text>
                <Text fontSize="11px" color="app.faint" mt="2px">{profile?.email ?? ''}</Text>
              </Box>
            </Flex>
            <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }} gap="14px">
              <FormControl>
                <FormLabel fontSize="12px">Full name</FormLabel>
                <Input value={profileForm.full_name} onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })} size="sm" borderRadius="9px" borderColor="app.border" />
              </FormControl>
              <FormControl>
                <FormLabel fontSize="12px">Email</FormLabel>
                <Input value={profileForm.email} isDisabled size="sm" borderRadius="9px" borderColor="app.border" />
              </FormControl>
            </Grid>
            <Button mt="18px" size="sm" bg="navy.600" color="white" _hover={{ bg: 'navy.500' }} borderRadius="9px" fontSize="12px" isLoading={savingProfile} onClick={saveProfile}>Save changes</Button>
          </Card>

          {/* Password Change */}
          <Card p="22px">
            <Flex align="center" gap="8px" mb="18px">
              <Flex w="32px" h="32px" borderRadius="9px" bg="brand.50" align="center" justify="center"><Icon as={LockIcon} boxSize="16px" color="brand.600" /></Flex>
              <Text fontWeight="700" fontSize="14px">Change Password</Text>
            </Flex>
            <Stack spacing="14px" maxW="440px">
              <FormControl>
                <FormLabel fontSize="12px">New password</FormLabel>
                <InputGroup>
                  <Input type={showNew ? 'text' : 'password'} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} size="sm" borderRadius="9px" borderColor="app.border" placeholder="Enter new password" />
                  <InputRightElement w="32px" h="32px"><Icon as={showNew ? EyeOffIcon : EyeIcon} boxSize="14px" color="app.faint" cursor="pointer" onClick={() => setShowNew(!showNew)} /></InputRightElement>
                </InputGroup>
              </FormControl>
              <FormControl>
                <FormLabel fontSize="12px">Confirm new password</FormLabel>
                <InputGroup>
                  <Input type={showConfirm ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} size="sm" borderRadius="9px" borderColor="app.border" placeholder="Confirm new password" />
                  <InputRightElement w="32px" h="32px"><Icon as={showConfirm ? EyeOffIcon : EyeIcon} boxSize="14px" color="app.faint" cursor="pointer" onClick={() => setShowConfirm(!showConfirm)} /></InputRightElement>
                </InputGroup>
              </FormControl>
              <Button size="sm" bg="navy.600" color="white" _hover={{ bg: 'navy.500' }} borderRadius="9px" fontSize="12px" maxW="140px" isLoading={changingPassword} onClick={handleChangePassword}>Update password</Button>
            </Stack>
          </Card>

          {/* 2FA Setup */}
          <Card p="22px">
            <Flex align="center" gap="8px" mb="18px">
              <Flex w="32px" h="32px" borderRadius="9px" bg="#e8eaff" align="center" justify="center"><Icon as={QrCodeIcon} boxSize="16px" color="#3355c9" /></Flex>
              <Text fontWeight="700" fontSize="14px">Two-Factor Authentication</Text>
            </Flex>

            {!twoFactorEnabled && !twoFactorSetupOpen && (
              <Box>
                <Text fontSize="12px" color="app.subtle" mb="14px">Protect your account with an authenticator app like Google Authenticator or Authy.</Text>
                <Button size="sm" bg="navy.600" color="white" _hover={{ bg: 'navy.500' }} borderRadius="9px" fontSize="12px" leftIcon={<QrCodeIcon size={14} />} onClick={() => setTwoFactorSetupOpen(true)}>Set up 2FA</Button>
              </Box>
            )}

            {!twoFactorEnabled && twoFactorSetupOpen && (
              <Stack spacing="16px" maxW="440px">
                <Box p="20px" bg="app.surfaceAlt" borderRadius="12px" textAlign="center">
                  <Flex w="160px" h="160px" mx="auto" bg="white" borderRadius="10px" align="center" justify="center" border="1px solid" borderColor="app.border" position="relative">
                    <QrCodeIcon size={120} color="app.text" />
                  </Flex>
                  <Text fontSize="12px" color="app.subtle" mt="12px">Scan this QR code with your authenticator app</Text>
                  <Text fontSize="10px" color="app.faint" mt="6px" fontFamily="monospace">Secret: JBSWY3DPEHPK3PXP</Text>
                </Box>
                <FormControl>
                  <FormLabel fontSize="12px">Enter 6-digit verification code</FormLabel>
                  <Input value={twoFactorCode} onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, '').slice(0, 6))} size="sm" borderRadius="9px" borderColor="app.border" placeholder="000000" textAlign="center" fontSize="18px" letterSpacing="0.3em" fontFamily="monospace" />
                </FormControl>
                <HStack spacing="8px">
                  <Button size="sm" bg="navy.600" color="white" _hover={{ bg: 'navy.500' }} borderRadius="9px" fontSize="12px" isLoading={twoFactorVerifying} onClick={verifyTwoFactor}>Verify & enable</Button>
                  <Button size="sm" variant="ghost" fontSize="12px" onClick={() => { setTwoFactorSetupOpen(false); setTwoFactorCode(''); }}>Cancel</Button>
                </HStack>
              </Stack>
            )}

            {twoFactorEnabled && (
              <Flex align="center" gap="10px" p="14px" bg="app.surfaceAlt" borderRadius="10px">
                <Icon as={CheckIcon} boxSize="18px" color="#1c8a5c" />
                <Box flex="1">
                  <Text fontSize="13px" fontWeight="600">2FA is enabled</Text>
                  <Text fontSize="11px" color="app.faint">Your account is protected with an authenticator app</Text>
                </Box>
                <Button size="sm" variant="outline" borderColor="app.border" color="#c23c3c" borderRadius="9px" fontSize="12px" onClick={disableTwoFactor}>Disable</Button>
              </Flex>
            )}
          </Card>

          {/* Notification Preferences */}
          <Card p="22px">
            <Flex align="center" gap="8px" mb="18px">
              <Flex w="32px" h="32px" borderRadius="9px" bg="#fff3e0" align="center" justify="center"><Icon as={BellIcon} boxSize="16px" color="#b5760f" /></Flex>
              <Text fontWeight="700" fontSize="14px">Notification Preferences</Text>
            </Flex>
            <Stack spacing="0">
              {NOTIF_ITEMS.map((item, i) => (
                <Flex key={item.key} align="center" py="13px" borderBottom={i === NOTIF_ITEMS.length - 1 ? '0' : '1px solid'} borderColor="app.border">
                  <Box flex="1">
                    <Text fontSize="13px" fontWeight="600">{item.label}</Text>
                    <Text fontSize="11px" color="app.faint">{item.desc}</Text>
                  </Box>
                  <Switch isChecked={!!notifPrefs[item.key]} onChange={() => saveNotifPref(item.key)} colorScheme="orange" />
                </Flex>
              ))}
            </Stack>
          </Card>
        </Stack>

        {/* Right column — security sidebar */}
        <Stack spacing="18px">
          <Card p="20px">
            <Text fontWeight="700" fontSize="13px" mb="14px">Security Status</Text>
            <Stack spacing="12px">
              <Flex align="center" gap="10px" p="12px" bg="app.surfaceAlt" borderRadius="10px">
                <Icon as={twoFactorEnabled ? ShieldIcon : KeyIcon} boxSize="16px" color={twoFactorEnabled ? '#1c8a5c' : 'app.faint'} />
                <Box flex="1">
                  <Text fontSize="12px" fontWeight="600">Two-factor auth</Text>
                  <Text fontSize="10px" color="app.faint">{twoFactorEnabled ? 'Enabled' : 'Not enabled'}</Text>
                </Box>
                <Badge fontSize="9px" borderRadius="full" px="6px" py="2px" bg={twoFactorEnabled ? '#e8f5ee' : 'app.surfaceAlt'} color={twoFactorEnabled ? '#1c8a5c' : 'app.faint'}>{twoFactorEnabled ? 'On' : 'Off'}</Badge>
              </Flex>
              <Flex align="center" gap="10px" p="12px" bg="app.surfaceAlt" borderRadius="10px">
                <Icon as={LockIcon} boxSize="16px" color="#1c8a5c" />
                <Box flex="1">
                  <Text fontSize="12px" fontWeight="600">Password</Text>
                  <Text fontSize="10px" color="app.faint">Last changed recently</Text>
                </Box>
                <Badge fontSize="9px" borderRadius="full" px="6px" py="2px" bg="#e8f5ee" color="#1c8a5c">Set</Badge>
              </Flex>
              <Flex align="center" gap="10px" p="12px" bg="app.surfaceAlt" borderRadius="10px">
                <Icon as={KeyIcon} boxSize="16px" color="app.subtle" />
                <Box flex="1">
                  <Text fontSize="12px" fontWeight="600">Active sessions</Text>
                  <Text fontSize="10px" color="app.faint">1 device · this browser</Text>
                </Box>
              </Flex>
            </Stack>
          </Card>

          {/* Danger Zone */}
          <Card p="20px" borderColor="#fde8e8" borderWidth="1px">
            <Text fontWeight="700" fontSize="13px" color="#c23c3c" mb="10px">Danger Zone</Text>
            <Text fontSize="11px" color="app.subtle" mb="14px">Permanently delete your account and all associated data. This action cannot be undone.</Text>
            <Button size="sm" variant="outline" borderColor="#c23c3c" color="#c23c3c" borderRadius="9px" fontSize="12px" leftIcon={<Trash2Icon size={14} />} _hover={{ bg: '#fde8e8' }} onClick={confirmDeleteUser.onOpen}>Delete my account</Button>
          </Card>
        </Stack>
      </Grid>

      <ConfirmDialog isOpen={confirmDeleteUser.isOpen} onClose={confirmDeleteUser.onClose} title="Delete account" message="This will permanently delete your account, all your data, and sign you out. This cannot be undone." confirmLabel="Delete account" danger onConfirm={handleDeleteAccount} />
    </>
  );
}
