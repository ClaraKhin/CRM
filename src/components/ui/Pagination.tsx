import React from 'react';
import { Button, Flex, HStack, IconButton, Text } from '@chakra-ui/react';
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';

type PaginationProps = {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (p: number) => void;
};

export function Pagination({ page, pageSize, total, onPageChange }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (total === 0) return null;
  const start = page * pageSize + 1;
  const end = Math.min((page + 1) * pageSize, total);

  return (
    <Flex align="center" justify="space-between" px="16px" py="12px" borderTop="1px solid" borderColor="app.border">
      <Text fontSize="11px" color="app.subtle">
        {start}–{end} of {total}
      </Text>
      <HStack spacing="4px">
        <IconButton
          aria-label="Previous page"
          icon={<ChevronLeftIcon size={15} />}
          size="xs"
          variant="ghost"
          isDisabled={page === 0}
          onClick={() => onPageChange(page - 1)}
        />
        <Text fontSize="11px" color="app.subtle" px="4px">
          {page + 1} / {totalPages}
        </Text>
        <IconButton
          aria-label="Next page"
          icon={<ChevronRightIcon size={15} />}
          size="xs"
          variant="ghost"
          isDisabled={page >= totalPages - 1}
          onClick={() => onPageChange(page + 1)}
        />
      </HStack>
    </Flex>
  );
}
