import React from 'react';
import { Badge } from '@chakra-ui/react';
const tones: Record<
  string,
  {
    bg: string;
    color: string;
  }> =
{
  New: {
    bg: '#e3ecff',
    color: '#3355c9'
  },
  Contacted: {
    bg: '#fff0da',
    color: '#b5760f'
  },
  Qualified: {
    bg: '#dcf3e8',
    color: '#1c8a5c'
  },
  Unqualified: {
    bg: '#f1f2f5',
    color: '#6b7488'
  },
  Meeting: {
    bg: '#efe7ff',
    color: '#6b3fd1'
  },
  Proposal: {
    bg: '#ffe8dc',
    color: '#c8541f'
  },
  Negotiation: {
    bg: '#ffe0ee',
    color: '#c23c86'
  },
  Won: {
    bg: '#dcf3e8',
    color: '#1c8a5c'
  },
  Lost: {
    bg: '#fbe0e0',
    color: '#c23c3c'
  },
  Lead: {
    bg: '#e3ecff',
    color: '#3355c9'
  },
  Prospect: {
    bg: '#fff0da',
    color: '#b5760f'
  },
  Customer: {
    bg: '#dcf3e8',
    color: '#1c8a5c'
  },
  VIP: {
    bg: '#ffe0d4',
    color: '#c8541f'
  },
  Inactive: {
    bg: '#f1f2f5',
    color: '#6b7488'
  },
  Paid: {
    bg: '#dcf3e8',
    color: '#1c8a5c'
  },
  Pending: {
    bg: '#fff0da',
    color: '#b5760f'
  },
  Overdue: {
    bg: '#fbe0e0',
    color: '#c23c3c'
  },
  Draft: {
    bg: '#f1f2f5',
    color: '#6b7488'
  },
  Sent: {
    bg: '#e3ecff',
    color: '#3355c9'
  },
  Approved: {
    bg: '#dcf3e8',
    color: '#1c8a5c'
  },
  Rejected: {
    bg: '#fbe0e0',
    color: '#c23c3c'
  },
  'In stock': {
    bg: '#dcf3e8',
    color: '#1c8a5c'
  },
  'Low stock': {
    bg: '#fff0da',
    color: '#b5760f'
  },
  'Out of stock': {
    bg: '#fbe0e0',
    color: '#c23c3c'
  },
  High: {
    bg: '#fbe0e0',
    color: '#c23c3c'
  },
  Medium: {
    bg: '#fff0da',
    color: '#b5760f'
  },
  Low: {
    bg: '#f1f2f5',
    color: '#6b7488'
  }
};
export function StatusBadge({ status }: {status: string;}) {
  const tone = tones[status] ?? {
    bg: '#f1f2f5',
    color: '#6b7488'
  };
  return (
    <Badge
      borderRadius="full"
      px="9px"
      py="2px"
      bg={tone.bg}
      color={tone.color}
      fontSize="10px"
      fontWeight="700"
      textTransform="none">
      
      {status}
    </Badge>);

}