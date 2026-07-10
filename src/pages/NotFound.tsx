import React from 'react';
import { Box, Button, Flex, Text } from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
export function NotFound() {
  const navigate = useNavigate();
  return (
    <Flex
      direction="column"
      align="center"
      justify="center"
      py="80px"
      textAlign="center">
      
      <Text
        fontFamily="'Plus Jakarta Sans', sans-serif"
        fontSize="48px"
        fontWeight="800"
        color="brand.500">
        
        404
      </Text>
      <Text fontWeight="700" fontSize="16px">
        Page not found
      </Text>
      <Text mt="4px" color="app.subtle" fontSize="13px" maxW="320px">
        The page you’re looking for doesn’t exist in this workspace.
      </Text>
      <Button
        mt="18px"
        size="sm"
        bg="navy.600"
        color="white"
        _hover={{
          bg: 'navy.500'
        }}
        borderRadius="9px"
        onClick={() => navigate('/')}>
        
        Back to dashboard
      </Button>
    </Flex>);

}