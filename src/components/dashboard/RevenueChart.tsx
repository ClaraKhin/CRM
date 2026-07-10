import React from 'react';
import { Box, Flex, Text, useColorModeValue } from '@chakra-ui/react';
import { Card } from '../ui/Card';
import { months, revenueSeries } from '../../data/mock';
export function RevenueChart() {
  const barBase = useColorModeValue('#fde0d5', 'rgba(255,125,82,0.2)');
  return (
    <Card
      p={{
        base: '17px',
        md: '22px'
      }}
      overflow="hidden">
      
      <Flex align="center">
        <Box>
          <Text
            fontFamily="'Plus Jakarta Sans', sans-serif"
            fontSize="15px"
            fontWeight="800">
            
            Revenue performance
          </Text>
          <Flex mt="5px" align="baseline" gap="8px">
            <Text fontSize="24px" fontWeight="800" letterSpacing="-0.04em">
              $186,420
            </Text>
            <Text color="#24936c" fontSize="11px" fontWeight="700">
              +18.6% vs last month
            </Text>
          </Flex>
        </Box>
        <Flex ml="auto" align="center" gap="8px">
          <Box w="7px" h="7px" bg="#ee7048" borderRadius="full" />
          <Text fontSize="11px" color="app.subtle">
            Revenue
          </Text>
        </Flex>
      </Flex>
      <Flex
        h="176px"
        mt="18px"
        gap="10px"
        align="end"
        px="4px"
        aria-label="Revenue bar chart">
        
        {revenueSeries.map((height, i) =>
        <Flex
          key={i}
          flex="1"
          direction="column"
          align="center"
          justify="end"
          h="full"
          gap="7px">
          
            <Box
            w="full"
            maxW="30px"
            h={`${height}%`}
            bg={i === 10 ? '#eb6339' : barBase}
            borderRadius="7px 7px 3px 3px"
            transition="all .25s ease"
            _hover={{
              bg: '#ee7048'
            }} />
          
            <Text color="app.faint" fontSize="9px">
              {months[i]}
            </Text>
          </Flex>
        )}
      </Flex>
    </Card>);

}