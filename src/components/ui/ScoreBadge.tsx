import React from 'react';
import { Flex, Text } from '@chakra-ui/react';
export function ScoreBadge({ score }: {score: number;}) {
  const tone =
  score >= 80 ?
  {
    bg: '#dcf3e8',
    color: '#1c8a5c'
  } :
  score >= 60 ?
  {
    bg: '#fff0da',
    color: '#b5760f'
  } :
  {
    bg: '#fbe0e0',
    color: '#c23c3c'
  };
  return (
    <Flex
      align="center"
      justify="center"
      minW="38px"
      h="24px"
      px="8px"
      borderRadius="8px"
      bg={tone.bg}>
      
      <Text fontSize="11px" fontWeight="800" color={tone.color}>
        {score}
      </Text>
    </Flex>);

}