import React from 'react';
import { Box, Flex, Icon, Text } from '@chakra-ui/react';
import { InboxIcon, BoxIcon } from 'lucide-react';
export function EmptyState({
  icon = InboxIcon,
  title,
  description,
  action





}: {icon?: BoxIcon;title: string;description?: string;action?: React.ReactNode;}) {
  return (
    <Flex
      direction="column"
      align="center"
      justify="center"
      py="52px"
      px="20px"
      textAlign="center">
      
      <Flex
        w="52px"
        h="52px"
        align="center"
        justify="center"
        borderRadius="16px"
        bg="app.surfaceAlt"
        mb="14px">
        
        <Icon as={icon} boxSize="22px" color="app.faint" />
      </Flex>
      <Text fontWeight="700" fontSize="14px">
        {title}
      </Text>
      {description &&
      <Text mt="4px" color="app.subtle" fontSize="12px" maxW="320px">
          {description}
        </Text>
      }
      {action && <Box mt="16px">{action}</Box>}
    </Flex>);

}