import React from 'react';
import {
  Button,
  Flex,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Text } from
'@chakra-ui/react';

type FormModalProps = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  loading?: boolean;
  onSubmit: () => void;
  children: React.ReactNode;
  submitLabel?: string;
  size?: string;
};

export function FormModal({
  isOpen,
  onClose,
  title,
  subtitle,
  loading,
  onSubmit,
  children,
  submitLabel = 'Save',
  size = 'md'
}: FormModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} size={size} isCentered>
      <ModalOverlay backdropFilter="blur(4px)" />
      <ModalContent bg="app.surface" borderRadius="18px" overflow="hidden" maxH="90vh">
        <ModalHeader borderBottom="1px solid" borderColor="app.border" pb="14px">
          <Text fontFamily="'Plus Jakarta Sans', sans-serif" fontSize="16px" fontWeight="800">
            {title}
          </Text>
          {subtitle && <Text fontSize="11px" color="app.subtle" mt="2px">{subtitle}</Text>}
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody py="20px" overflowY="auto">
          <Flex direction="column" gap="14px">
            {children}
          </Flex>
        </ModalBody>
        <ModalFooter borderTop="1px solid" borderColor="app.border" gap="8px">
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
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
