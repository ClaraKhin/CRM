import React from 'react';
import { Badge, Box, Flex, Icon, Stack, Text } from '@chakra-ui/react';
import { BotIcon, ChevronDownIcon } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { navItems, sections } from './navConfig';
export function SidebarNav({ onNavigate }: {onNavigate?: () => void;}) {
  const location = useLocation();
  const navigate = useNavigate();
  const go = (path: string) => {
    navigate(path);
    onNavigate?.();
  };
  return (
    <Flex direction="column" h="full" px="16px" py="18px">
      <Flex align="center" gap="10px" px="8px" mb="26px">
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
        <Box>
          <Text
            fontFamily="'Plus Jakarta Sans', sans-serif"
            fontWeight="800"
            fontSize="15px">
            
            1CNG
          </Text>
          <Text color="app.subtle" fontSize="11px">
            CRM
          </Text>
        </Box>
        <Icon as={ChevronDownIcon} ml="auto" boxSize="15px" color="app.faint" />
      </Flex>
    
      <Box flex="1" overflowY="auto" pr="2px">
        {sections.map((section) =>
        <Box key={section} mb="16px">
            <Text
            px="12px"
            mb="7px"
            color="app.faint"
            fontSize="10px"
            fontWeight="700"
            letterSpacing="0.11em">
            
              {section.toUpperCase()}
            </Text>
            <Stack spacing="3px">
              {navItems.
            filter((item) => item.section === section).
            map((item) => {
              const isActive =
              item.path === '/' ?
              location.pathname === '/' :
              location.pathname.startsWith(item.path);
              return (
                <Flex
                  key={item.path}
                  as="button"
                  type="button"
                  align="center"
                  w="full"
                  gap="12px"
                  px="12px"
                  py="9px"
                  borderRadius="10px"
                  bg={isActive ? 'brand.50' : 'transparent'}
                  color={isActive ? 'brand.600' : 'app.subtle'}
                  fontWeight={isActive ? '700' : '500'}
                  fontSize="14px"
                  textAlign="left"
                  transition="all .18s ease"
                  _hover={{
                    bg: isActive ? 'brand.50' : 'app.surfaceAlt',
                    color: 'app.text'
                  }}
                  _dark={{
                    bg: isActive ? 'rgba(255,125,82,0.14)' : 'transparent'
                  }}
                  onClick={() => go(item.path)}
                  aria-current={isActive ? 'page' : undefined}>
                  
                      <Icon
                    as={item.icon}
                    boxSize="18px"
                    strokeWidth={isActive ? 2.4 : 2} />
                  
                      <Text flex="1">{item.label}</Text>
                      {item.badge &&
                  <Badge
                    borderRadius="full"
                    px="7px"
                    bg="brand.100"
                    color="brand.600"
                    fontSize="10px">
                    
                          {item.badge}
                        </Badge>
                  }
                    </Flex>);

            })}
            </Stack>
          </Box>
        )}
      </Box>

      <Box mt="14px" p="14px" borderRadius="16px" bg="navy.600" color="white">
        <Flex
          w="30px"
          h="30px"
          borderRadius="9px"
          bg="rgba(255,255,255,.14)"
          align="center"
          justify="center"
          mb="9px">
          
          <Icon as={BotIcon} boxSize="16px" />
        </Flex>
        <Text fontSize="12px" fontWeight="700">
          AI sales copilot
        </Text>
        <Text mt="3px" color="whiteAlpha.700" fontSize="11px" lineHeight="1.45">
          1,248 actions available this month
        </Text>
      </Box>
    </Flex>);

}