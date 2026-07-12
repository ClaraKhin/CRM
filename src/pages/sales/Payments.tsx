import React, { useState } from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { Box, Text, Flex, Badge, Button, Grid, Icon, VStack, Divider, HStack, Table, Thead, Tbody, Tr, Th, Td } from '@chakra-ui/react';
import { CreditCardIcon, DollarSignIcon, CalendarIcon, CheckCircleIcon, XCircleIcon, ClockIcon, LayoutGridIcon, ListIcon, ArrowRightIcon, EyeIcon } from 'lucide-react';

export function Payments() {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const payments = [
    { id: 'PAY-001', customer: 'Acme Corp', amount: '$12,500', status: 'completed', date: '2024-01-15', method: 'Credit Card' },
    { id: 'PAY-002', customer: 'Tech Solutions', amount: '$8,750', status: 'pending', date: '2024-01-14', method: 'Bank Transfer' },
    { id: 'PAY-003', customer: 'Global Industries', amount: '$15,200', status: 'completed', date: '2024-01-13', method: 'Credit Card' },
    { id: 'PAY-004', customer: 'StartUp Inc', amount: '$3,400', status: 'failed', date: '2024-01-12', method: 'PayPal' },
    { id: 'PAY-005', customer: 'Enterprise Ltd', amount: '$22,100', status: 'pending', date: '2024-01-11', method: 'Wire Transfer' },
    { id: 'PAY-006', customer: 'Digital Co', amount: '$5,600', status: 'completed', date: '2024-01-10', method: 'Credit Card' },
  ];

  const statusConfig = {
    completed: { color: '#2d9c79', bg: 'rgba(45, 156, 121, 0.1)', icon: CheckCircleIcon, label: 'Completed' },
    pending: { color: '#e9683f', bg: 'rgba(233, 104, 63, 0.1)', icon: ClockIcon, label: 'Pending' },
    failed: { color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)', icon: XCircleIcon, label: 'Failed' },
  };

  return (
    <>
      <PageHeader
        title="Payments"
        subtitle="Track and manage payments."
        crumb="Sales / Payments"
        actions={
          <HStack spacing="8px">
            <Button
              size="sm" 
              variant={viewMode === 'grid' ? 'solid' : 'ghost'}
              colorScheme="brand"
              onClick={() => setViewMode('grid')}
              leftIcon={<LayoutGridIcon size={16} />}
            >
              Grid
            </Button>
            <Button
              size="sm"
              variant={viewMode === 'list' ? 'solid' : 'ghost'}
              colorScheme="brand"
              onClick={() => setViewMode('list')}
              leftIcon={<ListIcon size={16} />}
            >
              List
            </Button>
          </HStack>
        }
      />

      {viewMode === 'grid' ? (
        <Grid templateColumns="repeat(auto-fill, minmax('320px', 1fr))" gap="20px">
          {payments.map((payment) => {
            const config = statusConfig[payment.status as keyof typeof statusConfig];
            return (
              <Card
                key={payment.id}
                transition="all 0.3s ease"
                _hover={{ 
                  transform: 'translateY(-4px)', 
                  shadow: 'xl'
                }}
              >
                <Box p="24px">
                  <Flex align="center" justify="space-between" mb="16px">
                    <Flex
                      align="center"
                      justify="center"
                      w="48px"
                      h="48px"
                      borderRadius="12px"
                      bg="brand.50"
                    >
                      <Icon as={CreditCardIcon} boxSize="24px" color="brand.500" />
                    </Flex>
                    <Badge
                      bg={config.bg}
                      color={config.color}
                      borderRadius="full"
                      fontSize="11px"
                      fontWeight="700"
                      px="10px"
                      py="4px"
                      textTransform="uppercase"
                      letterSpacing="0.05em"
                    >
                      {config.label}
                    </Badge>
                  </Flex>
                  <VStack align="start" spacing="4px" mb="16px">
                    <Text fontSize="16px" fontWeight="700" color="app.text">
                      {payment.amount}
                    </Text>
                    <Text fontSize="13px" color="app.subtle">
                      {payment.customer}
                    </Text>
                  </VStack>
                  <Divider borderColor="app.border" mb="16px" />
                  <Flex justify="space-between" align="center">
                    <Flex align="center" gap="4px">
                      <Icon as={CalendarIcon} size={14} color="app.subtle" />
                      <Text fontSize="12px" color="app.subtle">
                        {payment.date}
                      </Text>
                    </Flex>
                    <HStack spacing="8px">
                      <Button
                        size="sm"
                        variant="ghost"
                        color="brand.500"
                        fontWeight="600"
                        rightIcon={<EyeIcon size={14} />}
                        _hover={{ bg: 'brand.50' }}
                      >
                        View
                      </Button>
                    </HStack>
                  </Flex>
                </Box>
              </Card>
            );
          })}
        </Grid>
      ) : (
        <Card>
          <Table variant="simple">
            <Thead>
              <Tr>
                <Th>Payment ID</Th>
                <Th>Customer</Th>
                <Th>Amount</Th>
                <Th>Method</Th>
                <Th>Date</Th>
                <Th>Status</Th>
                <Th>Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {payments.map((payment) => {
                const config = statusConfig[payment.status as keyof typeof statusConfig];
                return (
                  <Tr key={payment.id}>
                    <Td>
                      <Text fontSize="14px" fontWeight="600" color="app.text">
                        {payment.id}
                      </Text>
                    </Td>
                    <Td>
                      <Text fontSize="13px" color="app.text">
                        {payment.customer}
                      </Text>
                    </Td>
                    <Td>
                      <Text fontSize="14px" fontWeight="600" color="app.text">
                        {payment.amount}
                      </Text>
                    </Td>
                    <Td>
                      <Text fontSize="13px" color="app.subtle">
                        {payment.method}
                      </Text>
                    </Td>
                    <Td>
                      <Flex align="center" gap="4px">
                        <Icon as={CalendarIcon} size={12} color="app.subtle" />
                        <Text fontSize="13px" color="app.subtle">
                          {payment.date}
                        </Text>
                      </Flex>
                    </Td>
                    <Td>
                      <Badge
                        bg={config.bg}
                        color={config.color}
                        borderRadius="full"
                        fontSize="11px"
                        fontWeight="700"
                        px="8px"
                        py="3px"
                        textTransform="uppercase"
                        letterSpacing="0.05em"
                      >
                        {config.label}
                      </Badge>
                    </Td>
                    <Td>
                      <HStack spacing="8px">
                        <Button
                          size="sm"
                          variant="ghost"
                          color="brand.500"
                          fontWeight="600"
                          rightIcon={<EyeIcon size={14} />}
                          _hover={{ bg: 'brand.50' }}
                        >
                          View
                        </Button>
                      </HStack>
                    </Td>
                  </Tr>
                );
              })}
            </Tbody>
          </Table>
        </Card>
      )}
    </>
  );
}
