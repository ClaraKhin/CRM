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
import { ArrowRightIcon, LockIcon, MailIcon } from 'lucide-react';
import { Link as RouterLink, useNavigate, useLocation } from 'react-router-dom';
import { AuthLayout } from '../../components/auth/AuthLayout';
import { AuthField, AuthFormBox } from '../../components/auth/AuthField';
import { useAuth } from '../../context/AuthContext';

export function Login() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const from = (location.state as { from?: string })?.from ?? '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [submitting, setSubmitting] = useState(false);

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
    const { error } = await signIn(email.trim(), password, remember);
    setSubmitting(false);
    if (error) {
      toast({ title: 'Sign in failed', description: error.message, status: 'error', duration: 3000, position: 'top-right' });
      return;
    }
    toast({ title: 'Signed in successfully', status: 'success', duration: 1800, position: 'top-right' });
    navigate(from, { replace: true });
  };

  const fillDemo = () => {
    setEmail('demo@1cngcrm.com');
    setPassword('Demo1234!');
  };

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
