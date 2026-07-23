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
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
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
  ShieldCheckIcon,
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
  const [twoFactorSetupLoading, setTwoFactorSetupLoading] = useState(false);
  const [twoFactorQrCode, setTwoFactorQrCode] = useState('');
  const [twoFactorSecret, setTwoFactorSecret] = useState('');
  const [twoFactorSetupToken, setTwoFactorSetupToken] = useState('');
  const [twoFactorBackupCodes, setTwoFactorBackupCodes] = useState<string[] | null>(null);
  const [twoFactorDisabling, setTwoFactorDisabling] = useState(false);
  const [twoFactorDisableOpen, setTwoFactorDisableOpen] = useState(false);
  const [twoFactorDisablePassword, setTwoFactorDisablePassword] = useState('');
  const [twoFactorDisableError, setTwoFactorDisableError] = useState('');
  const [backupCodesCopied, setBackupCodesCopied] = useState(false);

  const confirmDeleteUser = useDisclosure();

  useEffect(() => {
    setProfileForm({ full_name: profile?.full_name ?? '', email: profile?.email ?? '' });
  }, [profile]);

  // Load 2FA status from profile
  const loadTwoFactorStatus = useCallback(async () => {
    if (!session?.user) return;
    const { data } = await supabase
      .from('profiles')
      .select('two_factor_enabled')
      .eq('id', session.user.id)
      .maybeSingle();
    setTwoFactorEnabled(!!data?.two_factor_enabled);
  }, [session]);

  useEffect(() => { loadTwoFactorStatus(); }, [loadTwoFactorStatus]);

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

  const startTwoFactorSetup = async () => {
    setTwoFactorSetupLoading(true);
    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/two-factor`;
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session!.access_token}`,
        },
        body: JSON.stringify({ action: 'setup' }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: 'Setup failed', description: data.error, status: 'error', duration: 3000, position: 'top-right' });
        setTwoFactorSetupLoading(false);
        return;
      }
      setTwoFactorSecret(data.secret);
      setTwoFactorSetupToken(data.setupToken);
      // Generate QR code via Google Charts API (no npm dependency needed)
      setTwoFactorQrCode(`https://chart.googleapis.com/chart?cht=qr&chs=200x200&chl=${encodeURIComponent(data.otpauthUri)}`);
      setTwoFactorSetupOpen(true);
    } catch (err: any) {
      toast({ title: 'Setup failed', description: err?.message ?? 'Network error', status: 'error', duration: 3000, position: 'top-right' });
    }
    setTwoFactorSetupLoading(false);
  };

  const verifyTwoFactor = async () => {
    if (twoFactorCode.length !== 6) {
      toast({ title: 'Enter the 6-digit code', status: 'error', duration: 2000, position: 'top-right' });
      return;
    }
    setTwoFactorVerifying(true);
    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/two-factor`;
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session!.access_token}`,
        },
        body: JSON.stringify({ action: 'verify', code: twoFactorCode, setupToken: twoFactorSetupToken }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: 'Verification failed', description: data.error, status: 'error', duration: 3000, position: 'top-right' });
        setTwoFactorVerifying(false);
        return;
      }
      setTwoFactorBackupCodes(data.backupCodes);
      setTwoFactorEnabled(true);
      setTwoFactorCode('');
      setTwoFactorVerifying(false);
      toast({ title: '2FA enabled', status: 'success', duration: 2000, position: 'top-right' });
    } catch {
      toast({ title: 'Verification failed', description: 'Network error', status: 'error', duration: 3000, position: 'top-right' });
      setTwoFactorVerifying(false);
    }
  };

  const disableTwoFactor = async () => {
    if (!twoFactorDisablePassword) {
      setTwoFactorDisableError('Enter your password to disable 2FA.');
      return;
    }
    setTwoFactorDisabling(true);
    setTwoFactorDisableError('');
    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/two-factor`;
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session!.access_token}`,
        },
        body: JSON.stringify({ action: 'disable', password: twoFactorDisablePassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setTwoFactorDisableError(data.error ?? 'Failed to disable 2FA.');
        setTwoFactorDisabling(false);
        return;
      }
      setTwoFactorEnabled(false);
      setTwoFactorDisableOpen(false);
      setTwoFactorDisablePassword('');
      setTwoFactorDisabling(false);
      toast({ title: '2FA disabled', status: 'info', duration: 1800, position: 'top-right' });
    } catch {
      setTwoFactorDisableError('Network error. Try again.');
      setTwoFactorDisabling(false);
    }
  };

  const copyBackupCodes = () => {
    if (!twoFactorBackupCodes) return;
    navigator.clipboard.writeText(twoFactorBackupCodes.join('\n'));
    setBackupCodesCopied(true);
    setTimeout(() => setBackupCodesCopied(false), 2000);
  };

  const closeBackupCodes = () => {
    setTwoFactorBackupCodes(null);
    setTwoFactorSetupOpen(false);
    setTwoFactorQrCode('');
    setTwoFactorSecret('');
    setTwoFactorSetupToken('');
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

            {/* Backup codes display (shown once after enabling) */}
            {twoFactorBackupCodes && (
              <Box mb="16px" p="18px" bg="#fff8e8" borderRadius="12px" border="1px solid" borderColor="#e8c84a">
                <Flex align="center" gap="8px" mb="10px">
                  <ShieldCheckIcon size={16} color="#b5760f" />
                  <Text fontSize="13px" fontWeight="700" color="#b5760f">Save your backup codes</Text>
                </Flex>
                <Text fontSize="11px" color="app.subtle" mb="12px">Store these one-time codes in a safe place. Each can be used once if you lose access to your authenticator app.</Text>
                <Box bg="white" p="12px" borderRadius="8px" border="1px solid" borderColor="app.border" mb="12px">
                  <Grid templateColumns="repeat(2, 1fr)" gap="6px">
                    {twoFactorBackupCodes.map((c) => (
                      <Text key={c} fontSize="12px" fontFamily="monospace" fontWeight="600" color="app.text">{c}</Text>
                    ))}
                  </Grid>
                </Box>
                <HStack spacing="8px">
                  <Button size="sm" bg="navy.600" color="white" borderRadius="8px" fontSize="12px" onClick={copyBackupCodes} leftIcon={backupCodesCopied ? <CheckIcon size={13} /> : undefined}>
                    {backupCodesCopied ? 'Copied' : 'Copy codes'}
                  </Button>
                  <Button size="sm" variant="outline" borderColor="app.border" borderRadius="8px" fontSize="12px" onClick={closeBackupCodes}>I&apos;ve saved them</Button>
                </HStack>
              </Box>
            )}

            {!twoFactorEnabled && !twoFactorSetupOpen && !twoFactorBackupCodes && (
              <Box>
                <Text fontSize="12px" color="app.subtle" mb="14px">Protect your account with an authenticator app like Google Authenticator or Authy.</Text>
                <Button size="sm" bg="navy.600" color="white" _hover={{ bg: 'navy.500' }} borderRadius="9px" fontSize="12px" leftIcon={<QrCodeIcon size={14} />} onClick={startTwoFactorSetup} isLoading={twoFactorSetupLoading}>Set up 2FA</Button>
              </Box>
            )}

            {!twoFactorEnabled && twoFactorSetupOpen && !twoFactorBackupCodes && (
              <Stack spacing="16px" maxW="440px">
                <Box p="20px" bg="app.surfaceAlt" borderRadius="12px" textAlign="center">
                  <Flex w="160px" h="160px" mx="auto" bg="white" borderRadius="10px" align="center" justify="center" border="1px solid" borderColor="app.border" position="relative" overflow="hidden">
                    {twoFactorQrCode ? (
                      <img src={twoFactorQrCode} alt="2FA QR code" style={{ width: '160px', height: '160px' }} />
                    ) : (
                      <Spinner color="brand.500" />
                    )}
                  </Flex>
                  <Text fontSize="12px" color="app.subtle" mt="12px">Scan this QR code with your authenticator app</Text>
                  <Text fontSize="10px" color="app.faint" mt="6px" fontFamily="monospace">Secret: {twoFactorSecret}</Text>
                </Box>
                <FormControl>
                  <FormLabel fontSize="12px">Enter 6-digit verification code</FormLabel>
                  <Input value={twoFactorCode} onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, '').slice(0, 6))} size="sm" borderRadius="9px" borderColor="app.border" placeholder="000000" textAlign="center" fontSize="18px" letterSpacing="0.3em" fontFamily="monospace" />
                </FormControl>
                <HStack spacing="8px">
                  <Button size="sm" bg="navy.600" color="white" _hover={{ bg: 'navy.500' }} borderRadius="9px" fontSize="12px" isLoading={twoFactorVerifying} onClick={verifyTwoFactor}>Verify & enable</Button>
                  <Button size="sm" variant="ghost" fontSize="12px" onClick={() => { setTwoFactorSetupOpen(false); setTwoFactorCode(''); setTwoFactorQrCode(''); setTwoFactorSecret(''); setTwoFactorSetupToken(''); }}>Cancel</Button>
                </HStack>
              </Stack>
            )}

            {twoFactorEnabled && !twoFactorBackupCodes && (
              <Flex align="center" gap="10px" p="14px" bg="app.surfaceAlt" borderRadius="10px">
                <Icon as={CheckIcon} boxSize="18px" color="#1c8a5c" />
                <Box flex="1">
                  <Text fontSize="13px" fontWeight="600">2FA is enabled</Text>
                  <Text fontSize="11px" color="app.faint">Your account is protected with an authenticator app</Text>
                </Box>
                <Button size="sm" variant="outline" borderColor="app.border" color="#c23c3c" borderRadius="9px" fontSize="12px" onClick={() => setTwoFactorDisableOpen(true)}>Disable</Button>
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

      {/* Disable 2FA Modal */}
      <Modal isOpen={twoFactorDisableOpen} onClose={() => { setTwoFactorDisableOpen(false); setTwoFactorDisablePassword(''); setTwoFactorDisableError(''); }} size="sm" isCentered>
        <ModalOverlay backdropFilter="blur(4px)" />
        <ModalContent bg="app.surface" borderRadius="16px">
          <ModalHeader borderBottom="1px solid" borderColor="app.border" pb="14px">
            <Flex align="center" gap="10px">
              <Flex w="34px" h="34px" borderRadius="10px" bg="#fde8e8" align="center" justify="center"><LockIcon size={16} color="#c23c3c" /></Flex>
              <Box><Text fontSize="15px" fontWeight="800">Disable 2FA</Text><Text fontSize="11px" color="app.subtle">Enter your password to confirm</Text></Box>
            </Flex>
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody py="18px">
            <Text fontSize="12px" color="app.subtle" mb="14px">Disabling 2FA reduces your account security. This will remove your authenticator app and backup codes.</Text>
            <FormControl>
              <FormLabel fontSize="12px">Password</FormLabel>
              <Input type="password" value={twoFactorDisablePassword} onChange={(e) => setTwoFactorDisablePassword(e.target.value)} size="sm" borderRadius="9px" borderColor="app.border" placeholder="Enter your password" />
            </FormControl>
            {twoFactorDisableError && <Text fontSize="11px" color="#c23c3c" mt="8px">{twoFactorDisableError}</Text>}
          </ModalBody>
          <ModalFooter borderTop="1px solid" borderColor="app.border" pt="14px">
            <Button mr="8px" variant="outline" borderColor="app.border" borderRadius="9px" fontSize="12px" onClick={() => { setTwoFactorDisableOpen(false); setTwoFactorDisablePassword(''); setTwoFactorDisableError(''); }}>Cancel</Button>
            <Button bg="#c23c3c" color="white" _hover={{ bg: '#a52e2e' }} borderRadius="9px" fontSize="12px" fontWeight="600" onClick={disableTwoFactor} isLoading={twoFactorDisabling}>Disable 2FA</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}
