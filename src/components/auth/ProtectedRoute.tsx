import React from 'react';
import { Box, Flex, Spinner, Text } from '@chakra-ui/react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { can, type UserRole } from '../../lib/supabase';

type ProtectedRouteProps = {
  children: React.ReactNode;
  permission?: string;
};

export function ProtectedRoute({ children, permission }: ProtectedRouteProps) {
  const { session, role, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <Flex minH="100vh" align="center" justify="center" direction="column" gap="14px" bg="app.bg">
        <Box
          w="40px"
          h="40px"
          align="center"
          justify="center"
          borderRadius="12px"
          bg="#ff6b35"
          color="white"
          fontWeight="800"
          fontSize="lg"
          display="flex"
          alignItems="center"
          justifyContent="center">
          C
        </Box>
        <Spinner size="sm" color="brand.500" />
        <Text fontSize="12px" color="app.subtle">Loading your workspace…</Text>
      </Flex>
    );
  }

  if (!session) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (permission && !can(role as UserRole | undefined, permission)) {
    return (
      <Flex minH="60vh" align="center" justify="center" direction="column" gap="10px" textAlign="center">
        <Text fontFamily="'Plus Jakarta Sans', sans-serif" fontSize="22px" fontWeight="800" color="brand.500">
          Access restricted
        </Text>
        <Text color="app.subtle" fontSize="13px" maxW="360px">
          Your role doesn&apos;t have permission to view this page. Contact your administrator if you believe this is an error.
        </Text>
      </Flex>
    );
  }

  return <>{children}</>;
}
