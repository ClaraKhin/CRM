import React, { useState } from 'react';
import {
  Box,
  Button,
  Checkbox,
  Flex,
  HStack,
  Link as ChakraLink,
  Text,
  useToast } from '@chakra-ui/react';
import { ArrowRightIcon, LockIcon, MailIcon, ShieldCheckIcon, KeyIcon } from 'lucide-react';
import { Link as RouterLink, useNavigate, useLocation } from 'react-router-dom';
import { AuthLayout } from '../../components/auth/AuthLayout';
import { AuthField, AuthFormBox } from '../../components/auth/AuthField';
import { useAuth } from '../../context/AuthContext';

export function Login() {
  const { signIn, complete2FALogin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const from = (location.state as { from?: string })?.from ?? '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [submitting, setSubmitting] = useState(false);

  // 2FA step state
  const [tfaOpen, setTfaOpen] = useState(false);
  const [tfaCode, setTfaCode] = useState('');
  const [tfaError, setTfaError] = useState('');
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [pendingEmail, setPendingEmail] = useState('');
  const [pendingPassword, setPendingPassword] = useState('');

  const validate = () => {
    const e: { email?: string; password?: string } = {};
    if (!email) e.email = 'Email is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Enter a valid email address.';
    if (!password) e.password = 'Password is required.';
    else if (password.length < 6) e.password = 'Password must be at least 6 characters.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    const result = await signIn(email.trim(), password, remember);
    setSubmitting(false);
    if (result.error) {
      toast({ title: 'Sign in failed', description: result.error.message, status: 'error', duration: 3000, position: 'top-right' });
      return;
    }
    if (result.twoFactorRequired) {
      setPendingEmail(result.pendingEmail ?? email);
      setPendingPassword(result.pendingPassword ?? password);
      setTfaOpen(true);
      return;
    }
    // No 2FA — logged in
    toast({ title: 'Signed in successfully', status: 'success', duration: 1800, position: 'top-right' });
    navigate(from, { replace: true });
  };

  const verifyTfa = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = tfaCode.replace(/\s/g, '');
    if (useBackupCode) {
      if (code.length < 8) {
        setTfaError('Enter a valid backup code (e.g. ABCD-1234-EF56).');
        return;
      }
    } else {
      if (code.length !== 6) {
        setTfaError('Enter the 6-digit code from your authenticator app.');
        return;
      }
    }
    setTfaError('');
    setSubmitting(true);
    const result = await complete2FALogin(
      pendingEmail,
      pendingPassword,
      tfaCode,
      useBackupCode,
      remember
    );
    setSubmitting(false);
    if (result.error) {
      setTfaError(result.error.message);
      return;
    }
    toast({ title: 'Signed in successfully', status: 'success', duration: 1800, position: 'top-right' });
    navigate(from, { replace: true });
  };

  const fillDemo = () => {
    setEmail('demo@1cngcrm.com');
    setPassword('Demo1234!');
  };

  if (tfaOpen) {
    return (
      <AuthLayout title="Two-factor authentication" subtitle="Enter the 6-digit code from your authenticator app.">
        <AuthFormBox>
          <Box display="flex" justifyContent="center" mb="6px">
            <Flex w="52px" h="52px" borderRadius="15px" bg="brand.50" align="center" justify="center">
              <ShieldCheckIcon size={26} color="#e9683f" />
            </Flex>
          </Box>
          <AuthField
            label={useBackupCode ? "Backup recovery code" : "Authentication code"}
            name="tfa"
            type="text"
            value={tfaCode}
            onChange={(e) => setTfaCode(e.target.value)}
            placeholder={useBackupCode ? "ABCD-1234-EF56" : "123 456"}
            icon={useBackupCode ? KeyIcon : LockIcon}
            error={tfaError}
            autoComplete="one-time-code"
          />
          <Button
            type="button"
            h="44px"
            borderRadius="11px"
            bg="navy.600"
            color="white"
            _hover={{ bg: 'navy.500' }}
            fontSize="13px"
            fontWeight="700"
            isLoading={submitting}
            loadingText="Verifying"
            onClick={verifyTfa}
            rightIcon={<ArrowRightIcon size={15} />}>
            Verify and continue
          </Button>
          <Flex justify="center" align="center" gap="6px">
            <Checkbox size="sm" colorScheme="orange" isChecked={useBackupCode} onChange={(e) => { setUseBackupCode(e.target.checked); setTfaCode(''); setTfaError(''); }}>
              <Text fontSize="12px" color="app.subtle">Use a backup code instead</Text>
            </Checkbox>
          </Flex>
          <Button variant="ghost" size="sm" fontSize="12px" color="app.subtle" onClick={() => { setTfaOpen(false); setTfaCode(''); setTfaError(''); }}>
            Use a different account
          </Button>
        </AuthFormBox>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to your 1CNG CRM workspace."
      footer={
        <>
          Don&apos;t have an account?{' '}
          <ChakraLink as={RouterLink} to="/signup" color="brand.600" fontWeight="700">Create one</ChakraLink>
        </>
      }>
      <form onSubmit={handleSubmit}>
        <AuthFormBox>
          <AuthField
            label="Email"
            name="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            icon={MailIcon}
            error={errors.email}
            isRequired
            autoComplete="email"
          />
          <AuthField
            label="Password"
            name="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            icon={LockIcon}
            error={errors.password}
            isRequired
            autoComplete="current-password"
          />
          <Flex justify="space-between" align="center">
            <Checkbox size="sm" colorScheme="orange" isChecked={remember} onChange={(e) => setRemember(e.target.checked)}>
              <Text fontSize="12px" color="app.subtle">Remember me</Text>
            </Checkbox>
            <ChakraLink as={RouterLink} to="/forgot-password" color="brand.600" fontSize="12px" fontWeight="600">
              Forgot password?
            </ChakraLink>
          </Flex>
          <Button
            type="submit"
            h="44px"
            borderRadius="11px"
            bg="navy.600"
            color="white"
            _hover={{ bg: 'navy.500' }}
            fontSize="13px"
            fontWeight="700"
            isLoading={submitting}
            loadingText="Signing in"
            rightIcon={<ArrowRightIcon size={15} />}>
            Sign in
          </Button>
          <Box>
            <Button size="sm" variant="outline" borderColor="app.border" borderRadius="10px" fontSize="12px" w="full" onClick={fillDemo}>
              Use demo account
            </Button>
          </Box>
        </AuthFormBox>
      </form>
    </AuthLayout>
  );
}
