import React from 'react';
import { Box, Flex, Icon, Text } from '@chakra-ui/react';
import { BotIcon } from 'lucide-react';
import { Link as RouterLink } from 'react-router-dom';

type AuthLayoutProps = {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
};

export function AuthLayout({ title, subtitle, children, footer }: AuthLayoutProps) {
  return (
    <Flex minH="100vh" w="full">
      {/* Left brand panel */}
      <Box
        display={{ base: 'none', lg: 'flex' }}
        w="44%"
        bg="navy.600"
        color="white"
        position="relative"
        overflow="hidden"
        flexDirection="column"
        justify="space-between"
        p="44px">
        <Box
          position="absolute"
          top="-80px"
          right="-80px"
          w="320px"
          h="320px"
          bg="#e96942"
          borderRadius="full"
          opacity="0.18"
        />
        <Box
          position="absolute"
          bottom="-120px"
          left="-60px"
          w="280px"
          h="280px"
          bg="#e96942"
          borderRadius="full"
          opacity="0.10"
        />

        <Flex align="center" gap="11px" position="relative">
          <Flex
            w="40px"
            h="40px"
            align="center"
            justify="center"
            borderRadius="12px"
            bg="#ff6b35"
            fontWeight="800"
            fontSize="lg">
            C
          </Flex>
          <Box>
            <Text fontFamily="'Plus Jakarta Sans', sans-serif" fontWeight="800" fontSize="17px">
              1CNG CRM
            </Text>
            <Text color="whiteAlpha.700" fontSize="12px">
              Enterprise AI Sales Platform
            </Text>
          </Box>
        </Flex>

        <Box position="relative" maxW="420px">
          <Flex
            w="44px"
            h="44px"
            borderRadius="13px"
            bg="rgba(255,255,255,0.12)"
            align="center"
            justify="center"
            mb="18px">
            <Icon as={BotIcon} boxSize="22px" />
          </Flex>
          <Text
            fontFamily="'Plus Jakarta Sans', sans-serif"
            fontWeight="800"
            fontSize="28px"
            lineHeight="1.3">
            Sell smarter with your AI sales copilot.
          </Text>
          <Text mt="14px" color="whiteAlpha.700" fontSize="14px" lineHeight="1.6">
            Manage leads, pipeline, quotes, and customers in one workspace —
            powered by MCP-connected AI automations.
          </Text>
        </Box>

        <Text position="relative" color="whiteAlpha.500" fontSize="11px">
          © {new Date().getFullYear()} 1CNG. All rights reserved.
        </Text>
      </Box>

      {/* Right form panel */}
      <Flex flex="1" align="center" justify="center" bg="app.bg" p={{ base: '20px', md: '40px' }}>
        <Box w="full" maxW="400px">
          <Flex align="center" gap="9px" mb="32px" display={{ base: 'flex', lg: 'none' }}>
            <Flex
              w="34px"
              h="34px"
              align="center"
              justify="center"
              borderRadius="11px"
              bg="#ff6b35"
              color="white"
              fontWeight="800"
              fontSize="lg">
              C
            </Flex>
            <Text fontFamily="'Plus Jakarta Sans', sans-serif" fontWeight="800" fontSize="16px">
              1CNG CRM
            </Text>
          </Flex>

          <Text
            fontFamily="'Plus Jakarta Sans', sans-serif"
            fontWeight="800"
            fontSize="24px"
            letterSpacing="-0.03em">
            {title}
          </Text>
          <Text mt="5px" color="app.subtle" fontSize="13px" mb="26px">
            {subtitle}
          </Text>

          {children}

          {footer && (
            <Text mt="22px" fontSize="12px" color="app.subtle" textAlign="center">
              {footer}
            </Text>
          )}

          <Text mt="18px" fontSize="11px" color="app.faint" textAlign="center">
            <RouterLink to="/">← Back to dashboard</RouterLink>
          </Text>
        </Box>
      </Flex>
    </Flex>
  );
}
