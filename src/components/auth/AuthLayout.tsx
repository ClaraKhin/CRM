import React from 'react';
import { Box, Flex, Icon, Text } from '@chakra-ui/react';
import { BotIcon, ShieldCheckIcon, SparklesIcon, TrendingUpIcon, ZapIcon } from 'lucide-react';

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
      <Flex
        display={{ base: 'none', lg: 'flex' }}
        w="46%"
        bg="navy.600"
        color="white"
        position="relative"
        overflow="hidden"
        flexDirection="column"
        justify="space-between"
        p="48px">
        {/* Decorative orbs */}
        <Box position="absolute" top="-100px" right="-100px" w="380px" h="380px" bg="#e96942" borderRadius="full" opacity="0.15" />
        <Box position="absolute" bottom="-140px" left="-80px" w="320px" h="320px" bg="#e96942" borderRadius="full" opacity="0.08" />
        <Box position="absolute" top="40%" left="30%" w="180px" h="180px" bg="#3b5bdb" borderRadius="full" opacity="0.06" />

        {/* Logo */}
        <Flex align="center" gap="11px" position="relative" zIndex={1}>
          <Flex w="42px" h="42px" align="center" justify="center" borderRadius="13px" bg="#ff6b35" fontWeight="800" fontSize="lg" boxShadow="0 4px 14px rgba(255,107,53,.3)">C</Flex>
          <Box>
            <Text fontFamily="'Plus Jakarta Sans', sans-serif" fontWeight="800" fontSize="18px">1CNG CRM</Text>
            <Text color="whiteAlpha.700" fontSize="12px">Enterprise AI Sales Platform</Text>
          </Box>
        </Flex>

        {/* Hero */}
        <Box position="relative" zIndex={1} maxW="440px">
          <Flex w="48px" h="48px" borderRadius="14px" bg="rgba(255,255,255,0.1)" align="center" justify="center" mb="20px">
            <Icon as={BotIcon} boxSize="24px" />
          </Flex>
          <Text fontFamily="'Plus Jakarta Sans', sans-serif" fontWeight="800" fontSize="30px" lineHeight="1.25" letterSpacing="-0.03em">
            Sell smarter with your AI sales copilot.
          </Text>
          <Text mt="16px" color="whiteAlpha.700" fontSize="14px" lineHeight="1.65">
            Manage leads, pipeline, quotes, and customers in one workspace — powered by MCP-connected AI automations.
          </Text>

          {/* Feature pills */}
          <Flex mt="28px" gap="10px" flexWrap="wrap">
            {[
              { icon: ZapIcon, label: 'AI-powered insights' },
              { icon: TrendingUpIcon, label: 'Pipeline forecasting' },
              { icon: ShieldCheckIcon, label: 'Enterprise security' },
              { icon: SparklesIcon, label: 'MCP integrations' }
            ].map((f, i) => {
              const FIcon = f.icon;
              return (
                <Flex key={i} align="center" gap="7px" px="12px" py="7px" bg="rgba(255,255,255,0.08)" borderRadius="10px" backdropFilter="blur(4px)">
                  <FIcon size={13} color="#ff6b35" />
                  <Text fontSize="11px" fontWeight="600" color="whiteAlpha.900">{f.label}</Text>
                </Flex>
              );
            })}
          </Flex>

          {/* Testimonial */}
          <Box mt="30px" p="18px" bg="rgba(255,255,255,0.06)" borderRadius="14px" backdropFilter="blur(6px)" border="1px solid" borderColor="rgba(255,255,255,0.1)">
            <Text fontSize="13px" lineHeight="1.6" color="whiteAlpha.900">
              "We closed 32% more deals in the first quarter after switching to 1CNG CRM. The AI copilot alone paid for the subscription."
            </Text>
            <Flex mt="12px" align="center" gap="10px">
              <Box w="32px" h="32px" borderRadius="full" bg="#ff6b35" display="flex" alignItems="center" justifyContent="center" fontWeight="800" fontSize="12px">S</Box>
              <Box>
                <Text fontSize="12px" fontWeight="700">Sarah Mitchell</Text>
                <Text fontSize="10px" color="whiteAlpha.600">VP Sales, Lattice Labs</Text>
              </Box>
            </Flex>
          </Box>
        </Box>

        <Text position="relative" zIndex={1} color="whiteAlpha.500" fontSize="11px">
          © {new Date().getFullYear()} 1CNG. All rights reserved.
        </Text>
      </Flex>

      {/* Right form panel */}
      <Flex flex="1" align="center" justify="center" bg="app.bg" p={{ base: '20px', md: '40px' }} position="relative">
        {/* Mobile logo */}
        <Flex align="center" gap="9px" mb="32px" display={{ base: 'flex', lg: 'none' }} position="absolute" top="24px" left="24px">
          <Flex w="36px" h="36px" align="center" justify="center" borderRadius="12px" bg="#ff6b35" color="white" fontWeight="800" fontSize="lg">C</Flex>
          <Text fontFamily="'Plus Jakarta Sans', sans-serif" fontWeight="800" fontSize="16px">1CNG CRM</Text>
        </Flex>

        <Box w="full" maxW="400px" mt={{ base: '60px', lg: '0' }}>
          <Text fontFamily="'Plus Jakarta Sans', sans-serif" fontWeight="800" fontSize="25px" letterSpacing="-0.03em">{title}</Text>
          <Text mt="5px" color="app.subtle" fontSize="13px" mb="28px">{subtitle}</Text>

          {children}

          {footer && <Text mt="24px" fontSize="12px" color="app.subtle" textAlign="center">{footer}</Text>}
        </Box>
      </Flex>
    </Flex>
  );
}
