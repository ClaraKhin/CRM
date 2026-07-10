import React from 'react';
import { Box, type BoxProps } from '@chakra-ui/react';
export function Card({ children, ...rest }: BoxProps) {
  return (
    <Box
      bg="app.surface"
      border="1px solid"
      borderColor="app.border"
      borderRadius="20px"
      boxShadow="0 4px 18px rgba(28,37,55,.035)"
      {...rest}>
      
      {children}
    </Box>);

}
export function CardHeader({
  title,
  subtitle,
  right




}: {title: string;subtitle?: string;right?: React.ReactNode;}) {
  return (
    <Box
      px={{
        base: '16px',
        md: '22px'
      }}
      py="17px"
      borderBottom="1px solid"
      borderColor="app.border"
      display="flex"
      alignItems="center">
      
      <Box>
        <Box
          fontFamily="'Plus Jakarta Sans', sans-serif"
          fontWeight="800"
          fontSize="15px">
          
          {title}
        </Box>
        {subtitle &&
        <Box color="app.subtle" fontSize="11px" mt="1px">
            {subtitle}
          </Box>
        }
      </Box>
      {right && <Box ml="auto">{right}</Box>}
    </Box>);

}