import React from 'react';
import {
  Grid,
  Table,
  TableContainer,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  useToast } from
'@chakra-ui/react';
import { PageHeader } from '../components/ui/PageHeader';
import { Card, CardHeader } from '../components/ui/Card';
import { StatusBadge } from '../components/ui/StatusBadge';
import { invoices } from '../data/mock';
import { personById } from '../data/people';
export function Invoices() {
  const toast = useToast();
  const outstanding = invoices.
  filter((i) => i.status !== 'Paid' && i.status !== 'Draft').
  reduce((s, i) => s + i.amount, 0);
  const paid = invoices.
  filter((i) => i.status === 'Paid').
  reduce((s, i) => s + i.amount, 0);
  const overdue = invoices.
  filter((i) => i.status === 'Overdue').
  reduce((s, i) => s + i.amount, 0);
  return (
    <>
      <PageHeader
        title="Invoices"
        subtitle="Track payments, taxes, and outstanding balances." />
      

      <Grid
        templateColumns={{
          base: 'repeat(3, 1fr)'
        }}
        gap="12px"
        mb="18px">
        
        {[
        {
          label: 'Outstanding',
          value: `$${outstanding.toLocaleString()}`,
          color: '#b5760f'
        },
        {
          label: 'Paid this month',
          value: `$${paid.toLocaleString()}`,
          color: '#1c8a5c'
        },
        {
          label: 'Overdue',
          value: `$${overdue.toLocaleString()}`,
          color: '#c23c3c'
        }].
        map((item) =>
        <Card key={item.label} p="15px">
            <Text fontSize="11px" color="app.subtle">
              {item.label}
            </Text>
            <Text
            mt="4px"
            fontFamily="'Plus Jakarta Sans', sans-serif"
            fontSize={{
              base: '15px',
              md: '19px'
            }}
            fontWeight="800"
            color={item.color}>
            
              {item.value}
            </Text>
          </Card>
        )}
      </Grid>

      <Card>
        <CardHeader
          title="All invoices"
          subtitle={`${invoices.length} invoices`} />
        
        <TableContainer>
          <Table size="sm">
            <Thead>
              <Tr>
                <Th borderColor="app.border" fontSize="10px" color="app.faint">
                  Invoice
                </Th>
                <Th
                  borderColor="app.border"
                  fontSize="10px"
                  color="app.faint"
                  display={{
                    base: 'none',
                    md: 'table-cell'
                  }}>
                  
                  Customer
                </Th>
                <Th
                  borderColor="app.border"
                  fontSize="10px"
                  color="app.faint"
                  display={{
                    base: 'none',
                    lg: 'table-cell'
                  }}>
                  
                  Due
                </Th>
                <Th borderColor="app.border" fontSize="10px" color="app.faint">
                  Status
                </Th>
                <Th
                  borderColor="app.border"
                  fontSize="10px"
                  color="app.faint"
                  isNumeric
                  display={{
                    base: 'none',
                    md: 'table-cell'
                  }}>
                  
                  Tax
                </Th>
                <Th
                  borderColor="app.border"
                  fontSize="10px"
                  color="app.faint"
                  isNumeric>
                  
                  Amount
                </Th>
              </Tr>
            </Thead>
            <Tbody>
              {invoices.map((invoice) => {
                const person = personById(invoice.personId);
                return (
                  <Tr
                    key={invoice.id}
                    _hover={{
                      bg: 'app.surfaceAlt'
                    }}
                    cursor="pointer"
                    onClick={() =>
                    toast({
                      title: `${invoice.number} opened`,
                      status: 'info',
                      duration: 1500,
                      position: 'top-right'
                    })
                    }>
                    
                    <Td
                      borderColor="app.border"
                      fontSize="12px"
                      fontWeight="700">
                      
                      {invoice.number}
                    </Td>
                    <Td
                      borderColor="app.border"
                      display={{
                        base: 'none',
                        md: 'table-cell'
                      }}
                      fontSize="12px">
                      
                      {person.company}
                    </Td>
                    <Td
                      borderColor="app.border"
                      display={{
                        base: 'none',
                        lg: 'table-cell'
                      }}
                      fontSize="12px"
                      color="app.subtle">
                      
                      {invoice.dueDate}
                    </Td>
                    <Td borderColor="app.border">
                      <StatusBadge status={invoice.status} />
                    </Td>
                    <Td
                      borderColor="app.border"
                      isNumeric
                      display={{
                        base: 'none',
                        md: 'table-cell'
                      }}
                      fontSize="12px"
                      color="app.subtle">
                      
                      ${invoice.tax.toLocaleString()}
                    </Td>
                    <Td
                      borderColor="app.border"
                      isNumeric
                      fontSize="12px"
                      fontWeight="700">
                      
                      ${invoice.amount.toLocaleString()}
                    </Td>
                  </Tr>);

              })}
            </Tbody>
          </Table>
        </TableContainer>
      </Card>
    </>);

}