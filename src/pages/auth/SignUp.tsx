import React, { useState } from 'react';
import {
  Box,
  Button,
  Checkbox,
  HStack,
  Link as ChakraLink,
  Text,
  useToast } from '@chakra-ui/react';
import { ArrowRightIcon, CheckCircleIcon, LockIcon, MailIcon, UserIcon } from 'lucide-react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { AuthLayout } from '../../components/auth/AuthLayout';
import { AuthField, AuthFormBox } from '../../components/auth/AuthField';
import { useAuth } from '../../context/AuthContext';

type Errors = { fullName?: string; email?: string; password?: string; confirm?: string; terms?: string };

export function SignUp() {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [agree, setAgree] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);

  const validate = () => {
    const e: Errors = {};
    if (!fullName.trim()) e.fullName = 'Full name is required.';
    else if (fullName.trim().length < 2) e.fullName = 'Name must be at least 2 characters.';
    if (!email) e.email = 'Email is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Enter a valid email address.';
    if (!password) e.password = 'Password is required.';
    else if (password.length < 6) e.password = 'Password must be at least 6 characters.';
    if (!confirm) e.confirm = 'Please confirm your password.';
    else if (confirm !== password) e.confirm = 'Passwords do not match.';
    if (!agree) e.terms = 'You must accept the terms to continue.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    const { error, needsVerify } = await signUp({
      email: email.trim(),
      password,
      fullName: fullName.trim()
    });
    setSubmitting(false);
    if (error) {
      toast({ title: 'Sign up failed', description: error.message, status: 'error', duration: 3000, position: 'top-right' });
      return;
    }
    if (needsVerify) {
      toast({ title: 'Account created', description: 'Please verify your email to continue.', status: 'success', duration: 3000, position: 'top-right' });
      navigate('/verify-email', { state: { email: email.trim() } });
    } else {
      toast({ title: 'Welcome to 1CNG CRM', status: 'success', duration: 2000, position: 'top-right' });
      navigate('/', { replace: true });
    }
  };

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Start your 14-day trial. No credit card required."
      footer={
        <>
          Already have an account?{' '}
          <ChakraLink as={RouterLink} to="/login" color="brand.600" fontWeight="700">
            Sign in
          </ChakraLink>
        </>
      }>
      <form onSubmit={handleSubmit}>
        <AuthFormBox>
          <AuthField
            label="Full name"
            name="fullName"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Renee Walker"
            icon={UserIcon}
            error={errors.fullName}
            isRequired
            autoComplete="name"
          />
          <AuthField
            label="Work email"
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
            placeholder="At least 6 characters"
            icon={LockIcon}
            error={errors.password}
            isRequired
            autoComplete="new-password"
          />
          <AuthField
            label="Confirm password"
            name="confirm"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Re-enter your password"
            icon={LockIcon}
            error={errors.confirm}
            isRequired
            autoComplete="new-password"
          />
          <Box>
            <Checkbox size="sm" colorScheme="orange" isChecked={agree} onChange={(e) => setAgree(e.target.checked)}>
              <Text fontSize="11px" color="app.subtle" lineHeight="1.5">
                I agree to the{' '}
                <ChakraLink color="brand.600" fontWeight="600">Terms of Service</ChakraLink> and{' '}
                <ChakraLink color="brand.600" fontWeight="600">Privacy Policy</ChakraLink>.
              </Text>
            </Checkbox>
            {errors.terms && <Text fontSize="11px" color="#c23c3c" mt="4px">{errors.terms}</Text>}
          </Box>
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
            loadingText="Creating account"
            rightIcon={<ArrowRightIcon size={15} />}>
            Create account
          </Button>
          <HStack spacing="6px" justify="center" mt="4px">
            <CheckCircleIcon size={13} color="#2d9c79" />
            <Text fontSize="11px" color="app.faint">Free 14-day trial · No credit card required</Text>
          </HStack>
        </AuthFormBox>
      </form>
    </AuthLayout>
  );
}
