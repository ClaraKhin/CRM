import React, { useState } from 'react';
import {
  Box,
  Button,
  Link as ChakraLink,
  Text,
  useToast
} from '@chakra-ui/react';
import { CheckCircleIcon, MailIcon, RefreshCwIcon } from 'lucide-react';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';
import { AuthLayout } from '../../components/auth/AuthLayout';
import { AuthFormBox } from '../../components/auth/AuthField';
import { useAuth } from '../../context/AuthContext';

export function VerifyEmail() {
  const { resendVerification } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();
  const email = (location.state as { email?: string })?.email ?? '';
  const [sending, setSending] = useState(false);

  const resend = async () => {
    if (!email) {
      toast({ title: 'No email on file', description: 'Please sign up again.', status: 'error', duration: 2500, position: 'top-right' });
      return;
    }
    setSending(true);
    const { error } = await resendVerification(email);
    setSending(false);
    if (error) {
      toast({ title: 'Could not resend', description: error.message, status: 'error', duration: 3000, position: 'top-right' });
      return;
    }
    toast({ title: 'Verification email sent', status: 'success', duration: 2000, position: 'top-right' });
  };

  return (
    <AuthLayout title="Verify your email" subtitle="Confirm your email address to activate your account.">
      <AuthFormBox>
        <Box textAlign="center">
          <Box w="52px" h="52px" borderRadius="16px" bg="brand.50" align="center" mx="auto" mb="14px" display="flex" alignItems="center" justifyContent="center">
            <MailIcon size={24} color="#e9683f" />
          </Box>
          {email && (
            <Text fontSize="13px" color="app.subtle" mb="16px">
              We sent a verification link to <Text as="span" fontWeight="700" color="app.text">{email}</Text>.
            </Text>
          )}
          <Text fontSize="12px" color="app.subtle" mb="20px">
            Click the link in the email to verify your account, then sign in.
          </Text>
        </Box>
        <Button
          h="42px"
          borderRadius="10px"
          bg="navy.600"
          color="white"
          _hover={{ bg: 'navy.500' }}
          fontSize="13px"
          fontWeight="700"
          isLoading={sending}
          loadingText="Sending"
          leftIcon={<RefreshCwIcon size={15} />}
          onClick={resend}>
          Resend verification email
        </Button>
        <Button
          variant="outline"
          borderColor="app.border"
          h="42px"
          borderRadius="10px"
          fontSize="13px"
          fontWeight="600"
          leftIcon={<CheckCircleIcon size={15} />}
          onClick={() => navigate('/login')}>
          I&apos;ve verified — sign in
        </Button>
        <Text mt="6px" fontSize="12px" color="app.subtle" textAlign="center">
          <ChakraLink as={RouterLink} to="/signup" color="brand.600" fontWeight="700">
            Use a different email
          </ChakraLink>
        </Text>
      </AuthFormBox>
    </AuthLayout>
  );
}
