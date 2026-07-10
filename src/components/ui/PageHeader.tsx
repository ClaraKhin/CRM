import React from 'react';
import {
  Box,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  Flex,
  HStack,
  Text } from
'@chakra-ui/react';
import { ChevronRightIcon } from 'lucide-react';
import { Link as RouterLink } from 'react-router-dom';
type PageHeaderProps = {
  title: string;
  subtitle?: string;
  crumb?: string;
  actions?: React.ReactNode;
};
export function PageHeader({
  title,
  subtitle,
  crumb,
  actions
}: PageHeaderProps) {
  return (
    <Box mb="22px">
      <Breadcrumb
        spacing="6px"
        separator={<ChevronRightIcon size={13} color="#98a1b2" />}
        fontSize="12px"
        color="app.faint"
        mb="10px">
        
        <BreadcrumbItem>
          <BreadcrumbLink as={RouterLink} to="/">
            Home
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbItem isCurrentPage>
          <Text color="app.subtle" fontWeight="600">
            {crumb ?? title}
          </Text>
        </BreadcrumbItem>
      </Breadcrumb>
      <Flex
        align={{
          base: 'start',
          md: 'center'
        }}
        direction={{
          base: 'column',
          md: 'row'
        }}
        gap="14px">
        
        <Box>
          <Text
            fontFamily="'Plus Jakarta Sans', sans-serif"
            fontSize={{
              base: '22px',
              md: '25px'
            }}
            fontWeight="800"
            letterSpacing="-0.04em">
            
            {title}
          </Text>
          {subtitle &&
          <Text mt="3px" color="app.subtle" fontSize="13px">
              {subtitle}
            </Text>
          }
        </Box>
        {actions &&
        <HStack
          ml={{
            base: 0,
            md: 'auto'
          }}
          spacing="8px">
          
            {actions}
          </HStack>
        }
      </Flex>
    </Box>);

}