import React, { Component } from 'react';
import { Box, Button, Flex, Text } from '@chakra-ui/react';
import { AlertTriangleIcon } from 'lucide-react';
type State = {
  hasError: boolean;
};
export class ErrorBoundary extends Component<
  {
    children: React.ReactNode;
  },
  State>
{
  state: State = {
    hasError: false
  };
  static getDerivedStateFromError(): State {
    return {
      hasError: true
    };
  }
  render() {
    if (this.state.hasError) {
      return (
        <Flex minH="100vh" align="center" justify="center" p="24px" bg="app.bg">
          <Box textAlign="center" maxW="380px">
            <Flex
              w="52px"
              h="52px"
              mx="auto"
              mb="14px"
              align="center"
              justify="center"
              borderRadius="16px"
              bg="#fbe0e0">
              
              <AlertTriangleIcon color="#c23c3c" />
            </Flex>
            <Text fontWeight="800" fontSize="18px">
              Something went wrong
            </Text>
            <Text mt="6px" color="app.subtle" fontSize="13px">
              An unexpected error occurred. Try reloading the workspace.
            </Text>
            <Button
              mt="16px"
              size="sm"
              bg="navy.600"
              color="white"
              _hover={{
                bg: 'navy.500'
              }}
              onClick={() => window.location.reload()}>
              
              Reload
            </Button>
          </Box>
        </Flex>);

    }
    return this.props.children;
  }
}