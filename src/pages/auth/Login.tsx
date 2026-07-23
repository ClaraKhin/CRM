import React, { useState } from 'react';
import {
  Box,
  Button,
  Checkbox,
  Flex,
  HStack,
  Input,
  Link as ChakraLink,
  Text,
  useToast,
} from '@chakra-ui/react';
import { ArrowRightIcon, KeyIcon, LockIcon, MailIcon, ShieldCheckIcon } from 'lucide-react';
import { Link as RouterLink, useNavigate, useLocation } from 'react-router-dom';
import { AuthLayout } from '../../components/auth/AuthLayout';
import { AuthField, AuthFormBox } from '../../components/auth/AuthField';
import { useAuth } from '../../context/AuthContext';

export function Login() {
  const { signIn, complete2FALogin, clearPending2FA } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const from = (location.state as { from?: string })?.from ?? '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [errors, setErrors] = useState<{ email?: string; password?: string; general?: string }>({});
  const [submitting, setSubmitting] = useState(false);
  const [tfaOpen, setTfaOpen] = useState(false);
  const [tfaCode, setTfaCode] = useState('');
  const [tfaError, setTfaError] = useState('');
  const [isBackupCode, setIsBackupCode] = useState(false);

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
    if (tfaOpen) return;
    if (!validate()) return;

    setSubmitting(true);
    setErrors({});
    const result = await signIn(email.trim(), password, remember);
    setSubmitting(false);
    console.log('signIn result:', result);

    if (result.error) {
      setErrors({ general: result.error.message });
      toast({ title: 'Sign in failed', description: result.error.message, status: 'error', duration: 3000, position: 'top-right' });
      return;
    }

    if (!result.twoFactorRequired) {
      toast({ title: 'Signed in successfully', status: 'success', duration: 1800, position: 'top-right' });
      navigate(from, { replace: true });
      return;
    }

    setTfaCode('');
    setTfaError('');
    setIsBackupCode(false);
    setTfaOpen(true);
  };

  const handleVerify2FA = async (e: React.FormEvent) => {
    e.preventDefault();

    let normalizedCode = tfaCode.trim().replace(/\s/g, '');

    if (isBackupCode) {
      normalizedCode = normalizedCode.toUpperCase();
      if (!/^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(normalizedCode)) {
        setTfaError('Enter a valid backup code (XXXX-XXXX-XXXX).');
        return;
      }
    } else {
      if (!/^\d{6}$/.test(normalizedCode)) {
        setTfaError('Enter the 6-digit code from your authenticator app.');
        return;
      }
    }

    setTfaError('');
    setSubmitting(true);

    const result = await complete2FALogin(
      email.trim(),
      password,
      normalizedCode,
      isBackupCode,
      remember
    );

    setSubmitting(false);

    if (result.error) {
      toast({ title: 'Verification failed', description: result.error.message, status: 'error', duration: 3000, position: 'top-right' });
      return;
    }

    toast({ title: 'Signed in successfully', status: 'success', duration: 1800, position: 'top-right' });
    navigate(from, { replace: true });
  };

  const switchToCredentials = () => {
    clearPending2FA();
    setTfaOpen(false);
    setTfaCode('');
    setTfaError('');
    setIsBackupCode(false);
    setPassword('');
  };

  const fillDemo = () => {
    setEmail('demo@1cngcrm.com');
    setPassword('Demo1234!');
  };

  return (
    <AuthLayout
      title={tfaOpen ? 'Verify Your Identity' : 'Welcome back'}
      subtitle={tfaOpen ? 'Enter the 6-digit code from your authenticator app.' : 'Sign in to your 1CNG CRM workspace.'}
      footer={
        !tfaOpen ? (
          <>
            Don&apos;t have an account?{' '}
            <ChakraLink as={RouterLink} to="/signup" color="brand.600" fontWeight="700">Create one</ChakraLink>
          </>
        ) : null
      }>
      {!tfaOpen ? (
        <form onSubmit={handleSubmit}>
          <AuthFormBox>
            {errors.general && (
              <Box w="full" p="10px" bg="red.50" _dark={{ bg: 'red.950', borderColor: 'red.800' }} borderRadius="8px" borderWidth="1px" borderColor="red.200">
                <Text fontSize="12px" color="red.600" textAlign="center">{errors.general}</Text>
              </Box>
            )}
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
      ) : (
        <form onSubmit={handleVerify2FA}>
          <Box
            p="24px"
            bg="app.surface"
            borderRadius="16px"
            border="1px solid"
            borderColor="app.border"
            boxShadow="0 8px 30px rgba(0,0,0,0.12)">
            <Flex direction="column" align="center" mb="24px">
              <Flex
                w="64px"
                h="64px"
                borderRadius="18px"
                bgGradient="linear(135deg, #6366f1, #8b5cf6)"
                align="center"
                justify="center"
                mb="16px"
                boxShadow="0 8px 24px rgba(99,102,241,0.35)">
                <KeyIcon size={28} color="white" />
              </Flex>
              <Text fontSize="13px" color="app.subtle" textAlign="center" mb="8px">
                Enter the code for
              </Text>
              <Box px="12px" py="4px" borderRadius="8px" bg="rgba(99,102,241,0.15)" border="1px solid" borderColor="rgba(99,102,241,0.25)">
                <Text fontSize="12px" color="#a5b4fc" fontWeight="600" textAlign="center">{email}</Text>
              </Box>
            </Flex>

            <AuthFormBox>
              <Box>
                <Text fontSize="12px" fontWeight="600" mb="6px" color="app.text">
                  {isBackupCode ? 'Backup code' : 'Authentication code'}
                </Text>
                <Input
                  id="tfa"
                  name="tfa"
                  type="text"
                  inputMode={isBackupCode ? 'text' : 'numeric'}
                  value={tfaCode}
                  onChange={(e) => {
                    const v = isBackupCode
                      ? e.target.value.toUpperCase().slice(0, 14)
                      : e.target.value.replace(/\D/g, '').slice(0, 6);
                    setTfaCode(v);
                  }}
                  placeholder={isBackupCode ? 'XXXX-XXXX-XXXX' : '000000'}
                  autoComplete={isBackupCode ? 'off' : 'one-time-code'}
                  textAlign="center"
                  fontSize="20px"
                  letterSpacing={isBackupCode ? '0.15em' : '0.5em'}
                  h="56px"
                  borderRadius="12px"
                  bg="app.surfaceAlt"
                  borderColor={tfaError ? '#c23c3c' : 'app.border'}
                  color="app.text"
                  _focus={{ borderColor: 'brand.500', boxShadow: '0 0 0 3px rgba(233,104,63,0.12)' }}
                />
                {!isBackupCode && (
                  <HStack spacing={2} w="full" justify="center" mt="12px">
                    {Array.from({ length: 6 }, (_, i) => (
                      <Box
                        key={i}
                        w="32px"
                        h="6px"
                        borderRadius="full"
                        bg={tfaCode.length > i ? 'brand.500' : 'app.border'}
                        transition="all 0.2s"
                      />
                    ))}
                  </HStack>
                )}
                {tfaError && <Text fontSize="11px" color="#c23c3c" mt="6px">{tfaError}</Text>}
              </Box>

              <Button
                type="submit"
                h="48px"
                borderRadius="12px"
                bg="white"
                color="navy.900"
                _hover={{ bg: 'gray.100' }}
                fontSize="15px"
                fontWeight="700"
                isLoading={submitting}
                loadingText="Verifying">
                Verify & Continue
              </Button>

              <Flex justify="center" align="center" gap="6px" wrap="wrap">
                <Text fontSize="12px" color="app.subtle">Can&apos;t use your app?</Text>
                <Button
                  variant="link"
                  size="sm"
                  fontSize="12px"
                  color="brand.600"
                  onClick={() => {
                    setIsBackupCode((v) => !v);
                    setTfaCode('');
                    setTfaError('');
                  }}>
                  {isBackupCode ? 'Use authenticator code' : 'Use a backup code'}
                </Button>
              </Flex>

              <Button variant="ghost" size="sm" fontSize="12px" color="app.subtle" onClick={switchToCredentials}>
                ← Back to login
              </Button>
            </AuthFormBox>
          </Box>
        </form>
      )}
    </AuthLayout>
  );
}
