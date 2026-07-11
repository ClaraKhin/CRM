import React from 'react';
import {
  AlertDialog,
  AlertDialogBody,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
  Button } from
'@chakra-ui/react';

type ConfirmDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  loading?: boolean;
  onConfirm: () => void;
};

export function ConfirmDialog({
  isOpen,
  onClose,
  title = 'Confirm action',
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger = false,
  loading = false,
  onConfirm
}: ConfirmDialogProps) {
  const cancelRef = React.useRef<HTMLButtonElement>(null);
  return (
    <AlertDialog isOpen={isOpen} leastDestructiveRef={cancelRef} onClose={onClose}>
      <AlertDialogOverlay />
      <AlertDialogContent bg="app.surface" borderRadius="18px">
        <AlertDialogHeader fontSize="15px" fontWeight="800" pb="8px">
          {title}
        </AlertDialogHeader>
        <AlertDialogBody fontSize="13px" color="app.subtle">
          {message}
        </AlertDialogBody>
        <AlertDialogFooter gap="8px">
          <Button ref={cancelRef} variant="ghost" size="sm" fontSize="12px" onClick={onClose}>
            {cancelLabel}
          </Button>
          <Button
            size="sm"
            fontSize="12px"
            borderRadius="9px"
            colorScheme={danger ? 'red' : 'orange'}
            isLoading={loading}
            onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
