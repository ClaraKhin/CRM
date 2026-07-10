import React from 'react';
import { Box, Flex, Text } from '@chakra-ui/react';
export function BarChart({
  data,
  labels



}: {data: number[];labels: string[];}) {
  const max = Math.max(...data);
  return (
    <Flex h="180px" gap="10px" align="end">
      {data.map((v, i) =>
      <Flex
        key={i}
        flex="1"
        direction="column"
        align="center"
        justify="end"
        h="full"
        gap="6px">
        
          <Box
          w="full"
          maxW="34px"
          h={`${v / max * 100}%`}
          bg="#e9683f"
          borderRadius="6px 6px 2px 2px"
          transition="all .2s"
          _hover={{
            bg: '#d3521f'
          }} />
        
          <Text fontSize="9px" color="app.faint">
            {labels[i]}
          </Text>
        </Flex>
      )}
    </Flex>);

}
export function LineChart({ data }: {data: number[];}) {
  const max = Math.max(...data);
  const points = data.
  map((v, i) => `${i / (data.length - 1) * 100},${100 - v / max * 90}`).
  join(' ');
  return (
    <Box h="180px" position="relative">
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 100 100"
        preserveAspectRatio="none">
        
        <polyline
          points={points}
          fill="none"
          stroke="#e9683f"
          strokeWidth="1.6"
          vectorEffect="non-scaling-stroke"
          strokeLinejoin="round" />
        
        <polyline
          points={`0,100 ${points} 100,100`}
          fill="#e9683f"
          opacity="0.08" />
        
      </svg>
    </Box>);

}
export function DonutChart({
  segments






}: {segments: {label: string;value: number;color: string;}[];}) {
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  let offset = 0;
  const radius = 42;
  const circ = 2 * Math.PI * radius;
  return (
    <Flex align="center" gap="20px">
      <Box position="relative" w="120px" h="120px">
        <svg width="120" height="120" viewBox="0 0 120 120">
          {segments.map((seg, i) => {
            const len = seg.value / total * circ;
            const dash = `${len} ${circ - len}`;
            const el =
            <circle
              key={i}
              cx="60"
              cy="60"
              r={radius}
              fill="none"
              stroke={seg.color}
              strokeWidth="14"
              strokeDasharray={dash}
              strokeDashoffset={-offset}
              transform="rotate(-90 60 60)" />;


            offset += len;
            return el;
          })}
        </svg>
        <Flex
          position="absolute"
          inset="0"
          align="center"
          justify="center"
          direction="column">
          
          <Text fontSize="18px" fontWeight="800">
            {total}
          </Text>
          <Text fontSize="9px" color="app.faint">
            total
          </Text>
        </Flex>
      </Box>
      <Box>
        {segments.map((seg) =>
        <Flex key={seg.label} align="center" gap="8px" mb="7px">
            <Box w="9px" h="9px" borderRadius="3px" bg={seg.color} />
            <Text fontSize="11px" flex="1">
              {seg.label}
            </Text>
            <Text fontSize="11px" fontWeight="700">
              {seg.value}
            </Text>
          </Flex>
        )}
      </Box>
    </Flex>);

}
export function FunnelChart({
  stages





}: {stages: {label: string;value: number;}[];}) {
  const max = Math.max(...stages.map((s) => s.value));
  return (
    <Box>
      {stages.map((stage) =>
      <Flex key={stage.label} align="center" gap="10px" mb="8px">
          <Text fontSize="11px" w="90px" color="app.subtle" noOfLines={1}>
            {stage.label}
          </Text>
          <Box
          flex="1"
          bg="app.surfaceAlt"
          borderRadius="7px"
          h="26px"
          position="relative"
          overflow="hidden">
          
            <Flex
            align="center"
            justify="end"
            px="8px"
            h="full"
            w={`${stage.value / max * 100}%`}
            bg="#e9683f"
            borderRadius="7px"
            minW="40px">
            
              <Text fontSize="10px" fontWeight="700" color="white">
                {stage.value}
              </Text>
            </Flex>
          </Box>
        </Flex>
      )}
    </Box>);

}