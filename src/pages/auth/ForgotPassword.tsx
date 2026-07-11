import React, { useState } from 'react';
import {
  Box,
  Button,
  Link as ChakraLink,
  Text,
  useToast
} from '@chakra-ui/react';
import { ArrowRightIcon, MailIcon } from 'lucide-react';
import { Link as RouterLink } from 'react-router-dom';
import { AuthLayout } from '../../components/auth/AuthLayout';
import { AuthField, AuthFormBox } from '../../components/auth/AuthField';
import { useAuth } from '../../context/AuthContext';

export function ForgotPassword() {
  const { sendPasswordReset } = useAuth();
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const validate = () => {
    if (!email) { setError('Email is required.'); return false; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('Enter a valid email address.'); return false; }
    setError('');
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    const { error } = await sendPasswordReset(email.trim());
    setSubmitting(false);
    if (error) {
      toast({ title: 'Request failed', description: error.message, status: 'error', duration: 3000, position: 'top-right' });
      return;
    }
    setSent(true);
    toast({ title: 'Reset link sent', status: 'success', duration: 2000, position: 'top-right' });
  };

  if (sent) {
    return (
      <AuthLayout title="Check your email" subtitle="We sent a password reset link to your inbox.">
        <Box textAlign="center">
          <Box w="52px" h="52px" borderRadius="16px" bg="brand.50" align="center" mx="auto" mb="14px" display="flex" alignItems="center" justifyContent="center">
            <MailIcon size={24} color="#e9683f" />
          </Box>
          <Text fontSize="13px" color="app.subtle" mb="20px">
            If an account exists for <Text as="span" fontWeight="700" color="app.text">{email}</Text>, you&apos;ll receive a reset link shortly.
          </Text>
          <Button
            variant="outline"
            borderColor="app.border"
            borderRadius="10px"
            fontSize="12px"
            size="sm"
            onClick={() => { setSent(false); setEmail(''); }}>
            Use a different email
          </Button>
        </Box>
        <Text mt="22px" fontSize="12px" color="app.subtle" textAlign="center">
          Remembered it?{' '}
          <ChakraLink as={RouterLink} to="/login" color="brand.600" fontWeight="700">Sign in</ChakraLink>
        </Text>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Forgot password"
      subtitle="Enter your email and we'll send you a reset link."
      footer={
        <>
          Remembered your password?{' '}
          <ChakraLink as={RouterLink} to="/login" color="brand.600" fontWeight="700">Sign in</ChakraLink>
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
            error={error}
            isRequired
            autoComplete="email"
          />
          <Button
            type="submit"
            h="42px"
            borderRadius="10px"
            bg="navy.600"
            color="white"
            _hover={{ bg: 'navy.500' }}
            fontSize="13px"
            fontWeight="700"
            isLoading={submitting}
            loadingText="Sending link"
            rightIcon={<ArrowRightIcon size={15} />}>
            Send reset link
          </Button>
        </AuthFormBox>
      </form>
    </AuthLayout>
  );
}
