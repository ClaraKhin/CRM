import React, { useState } from 'react';
import {
  Box,
  Button,
  Link as ChakraLink,
  Text,
  useToast
} from '@chakra-ui/react';
import { ArrowRightIcon, CheckCircleIcon, LockIcon } from 'lucide-react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { AuthLayout } from '../../components/auth/AuthLayout';
import { AuthField, AuthFormBox } from '../../components/auth/AuthField';
import { useAuth } from '../../context/AuthContext';

export function ResetPassword() {
  const { updatePassword } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<{ password?: string; confirm?: string }>({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const validate = () => {
    const e: { password?: string; confirm?: string } = {};
    if (!password) e.password = 'Password is required.';
    else if (password.length < 6) e.password = 'Password must be at least 6 characters.';
    if (!confirm) e.confirm = 'Please confirm your password.';
    else if (confirm !== password) e.confirm = 'Passwords do not match.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    const { error } = await updatePassword(password);
    setSubmitting(false);
    if (error) {
      toast({ title: 'Reset failed', description: error.message, status: 'error', duration: 3000, position: 'top-right' });
      return;
    }
    setDone(true);
    toast({ title: 'Password updated', status: 'success', duration: 2000, position: 'top-right' });
    setTimeout(() => navigate('/login', { replace: true }), 1800);
  };

  if (done) {
    return (
      <AuthLayout title="Password updated" subtitle="You can now sign in with your new password.">
        <Box textAlign="center">
          <Box w="52px" h="52px" borderRadius="16px" bg="#dcf3e8" align="center" mx="auto" mb="14px" display="flex" alignItems="center" justifyContent="center">
            <CheckCircleIcon size={26} color="#1c8a5c" />
          </Box>
          <Text fontSize="13px" color="app.subtle" mb="6px">Redirecting you to sign in…</Text>
        </Box>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Set a new password"
      subtitle="Choose a strong password for your account."
      footer={
        <>
          <ChakraLink as={RouterLink} to="/login" color="brand.600" fontWeight="700">Back to sign in</ChakraLink>
        </>
      }>
      <form onSubmit={handleSubmit}>
        <AuthFormBox>
          <AuthField
            label="New password"
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
            loadingText="Updating"
            rightIcon={<ArrowRightIcon size={15} />}>
            Update password
          </Button>
        </AuthFormBox>
      </form>
    </AuthLayout>
  );
}
