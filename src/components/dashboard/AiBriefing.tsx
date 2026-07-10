import React from 'react';
import { Badge, Box, Button, Flex, Icon, Stack, Text } from '@chakra-ui/react';
import { BotIcon, CommandIcon } from 'lucide-react';
export function AiBriefing({ onAction }: {onAction: () => void;}) {
  return (
    <Box
      bg="navy.600"
      color="white"
      borderRadius="20px"
      p={{
        base: '18px',
        md: '22px'
      }}
      position="relative"
      overflow="hidden">
      
      <Box
        position="absolute"
        top="-45px"
        right="-36px"
        w="150px"
        h="150px"
        bg="#e96942"
        borderRadius="full"
        opacity=".14" />
      
      <Flex align="center" gap="9px">
        <Flex
          w="31px"
          h="31px"
          bg="rgba(255,255,255,.12)"
          borderRadius="10px"
          align="center"
          justify="center">
          
          <Icon as={BotIcon} boxSize="16px" />
        </Flex>
        <Text fontWeight="800" fontSize="13px">
          AI sales briefing
        </Text>
        <Badge
          ml="auto"
          colorScheme="orange"
          borderRadius="full"
          fontSize="9px">
          
          LIVE
        </Badge>
      </Flex>
      <Text
        mt="19px"
        fontFamily="'Plus Jakarta Sans', sans-serif"
        fontWeight="800"
        fontSize="19px"
        lineHeight="1.35">
        
        You’re 22% more likely to close this month.
      </Text>
      <Text mt="10px" color="whiteAlpha.700" fontSize="12px" lineHeight="1.6">
        Focus on the three opportunities in negotiation. Two have gone quiet for
        over 48 hours.
      </Text>
      <Stack mt="18px" spacing="8px">
        {['Follow up with Maya Patel', 'Review Horizon AI proposal'].map(
          (task) =>
          <Flex
            key={task}
            align="center"
            gap="8px"
            p="9px"
            bg="whiteAlpha.100"
            borderRadius="9px">
            
              <Icon as={CommandIcon} boxSize="13px" color="#ffad89" />
              <Text fontSize="11px" fontWeight="600">
                {task}
              </Text>
            </Flex>

        )}
      </Stack>
      <Button
        mt="16px"
        size="sm"
        w="full"
        bg="white"
        color="navy.600"
        _hover={{
          bg: 'gray.100'
        }}
        borderRadius="9px"
        fontSize="11px"
        onClick={onAction}>
        
        View recommended actions
      </Button>
    </Box>);

}