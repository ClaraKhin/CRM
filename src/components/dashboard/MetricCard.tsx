import React from 'react';
import { Flex, Icon, Text } from '@chakra-ui/react';
import { ArrowUpRightIcon, BoxIcon } from 'lucide-react';
import { Card } from '../ui/Card';
type MetricCardProps = {
  label: string;
  value: string;
  trend: string;
  icon: BoxIcon;
  accent: string;
};
export function MetricCard({
  label,
  value,
  trend,
  icon,
  accent
}: MetricCardProps) {
  return (
    <Card
      p={{
        base: '16px',
        xl: '18px'
      }}
      borderRadius="18px">
      
      <Flex align="start" justify="space-between">
        <Flex
          w="38px"
          h="38px"
          align="center"
          justify="center"
          borderRadius="12px"
          bg={accent}
          color="white">
          
          <Icon as={icon} boxSize="18px" />
        </Flex>
        <Flex align="center" color="#219669" fontSize="11px" fontWeight="700">
          <Icon as={ArrowUpRightIcon} boxSize="13px" />
          {trend}
        </Flex>
      </Flex>
      <Text
        mt="20px"
        fontFamily="'Plus Jakarta Sans', sans-serif"
        fontSize={{
          base: '21px',
          xl: '25px'
        }}
        fontWeight="800"
        letterSpacing="-0.04em">
        
        {value}
      </Text>
      <Text mt="3px" color="app.subtle" fontSize="12px" fontWeight="500">
        {label}
      </Text>
    </Card>);

}