import React from 'react';
import {
  Button,
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerOverlay,
  Flex,
  Text } from
'@chakra-ui/react';

type FormDrawerProps = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  loading?: boolean;
  onSubmit: () => void;
  children: React.ReactNode;
  submitLabel?: string;
};

export function FormDrawer({
  isOpen,
  onClose,
  title,
  subtitle,
  loading,
  onSubmit,
  children,
  submitLabel = 'Save'
}: FormDrawerProps) {
  return (
    <Drawer isOpen={isOpen} placement="right" onClose={onClose} size="md">
      <DrawerOverlay />
      <DrawerContent bg="app.surface">
        <DrawerCloseButton />
        <DrawerHeader borderBottom="1px solid" borderColor="app.border">
          <Text fontFamily="'Plus Jakarta Sans', sans-serif" fontSize="16px" fontWeight="800">
            {title}
          </Text>
          {subtitle && <Text fontSize="11px" color="app.subtle" mt="2px">{subtitle}</Text>}
        </DrawerHeader>
        <DrawerBody>
          <Flex direction="column" gap="14px" mt="4px">
            {children}
          </Flex>
        </DrawerBody>
        <DrawerFooter borderTop="1px solid" borderColor="app.border" gap="8px">
          <Button variant="ghost" size="sm" fontSize="12px" onClick={onClose}>Cancel</Button>
          <Button
            size="sm"
            fontSize="12px"
            borderRadius="9px"
            bg="navy.600"
            color="white"
            _hover={{ bg: 'navy.500' }}
            isLoading={loading}
            onClick={onSubmit}>
            {submitLabel}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
