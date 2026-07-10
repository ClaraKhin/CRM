import React from 'react';
import {
  Box,
  Button,
  Flex,
  Grid,
  Icon,
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
import { DownloadIcon, FileTextIcon, HistoryIcon, PlusIcon } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Card, CardHeader } from '../components/ui/Card';
import { StatusBadge } from '../components/ui/StatusBadge';
import { quotes } from '../data/mock';
import { personById } from '../data/people';
const builderItems = [
{
  name: 'Growth Suite',
  qty: 1,
  price: 4900
},
{
  name: 'Sales Copilot AI',
  qty: 2,
  price: 1200
},
{
  name: 'Onboarding Package',
  qty: 1,
  price: 3500
}];

export function Quotes() {
  const toast = useToast();
  const subtotal = builderItems.reduce((s, i) => s + i.qty * i.price, 0);
  const tax = Math.round(subtotal * 0.08);
  const notify = (label: string) =>
  toast({
    title: label,
    status: 'info',
    duration: 1600,
    position: 'top-right'
  });
  return (
    <>
      <PageHeader
        title="Quotes"
        subtitle="Build, send, and track quotations."
        actions={
        <Button
          size="sm"
          borderRadius="9px"
          bg="navy.600"
          color="white"
          _hover={{
            bg: 'navy.500'
          }}
          leftIcon={<PlusIcon size={15} />}
          fontSize="12px"
          onClick={() => notify('Quote builder opened')}>
          
            New quote
          </Button>
        } />
      

      <Grid
        templateColumns={{
          base: '1fr',
          xl: 'minmax(0, 1.5fr) minmax(300px, 1fr)'
        }}
        gap="18px">
        
        <Card>
          <CardHeader title="All quotes" subtitle={`${quotes.length} quotes`} />
          <TableContainer>
            <Table size="sm">
              <Thead>
                <Tr>
                  <Th
                    borderColor="app.border"
                    fontSize="10px"
                    color="app.faint">
                    
                    Quote
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
                    color="app.faint">
                    
                    Status
                  </Th>
                  <Th
                    borderColor="app.border"
                    fontSize="10px"
                    color="app.faint"
                    isNumeric>
                    
                    Amount
                  </Th>
                  <Th borderColor="app.border" w="40px"></Th>
                </Tr>
              </Thead>
              <Tbody>
                {quotes.map((quote) => {
                  const person = personById(quote.personId);
                  return (
                    <Tr
                      key={quote.id}
                      _hover={{
                        bg: 'app.surfaceAlt'
                      }}>
                      
                      <Td borderColor="app.border">
                        <Text fontSize="12px" fontWeight="700">
                          {quote.number}
                        </Text>
                        <Flex align="center" gap="4px" color="app.faint">
                          <Icon as={HistoryIcon} boxSize="10px" />
                          <Text fontSize="9px">
                            v{quote.version} · {quote.items} items
                          </Text>
                        </Flex>
                      </Td>
                      <Td
                        borderColor="app.border"
                        display={{
                          base: 'none',
                          md: 'table-cell'
                        }}>
                        
                        <Text fontSize="12px">{person.company}</Text>
                      </Td>
                      <Td borderColor="app.border">
                        <StatusBadge status={quote.status} />
                      </Td>
                      <Td
                        borderColor="app.border"
                        isNumeric
                        fontSize="12px"
                        fontWeight="700">
                        
                        ${quote.amount.toLocaleString()}
                      </Td>
                      <Td borderColor="app.border">
                        <Button
                          size="xs"
                          variant="ghost"
                          leftIcon={<DownloadIcon size={13} />}
                          onClick={() =>
                          notify(`${quote.number} exported to PDF`)
                          }>
                          
                          PDF
                        </Button>
                      </Td>
                    </Tr>);

                })}
              </Tbody>
            </Table>
          </TableContainer>
        </Card>

        <Card p="20px">
          <Flex align="center" gap="8px" mb="4px">
            <Icon as={FileTextIcon} boxSize="16px" color="#e9683f" />
            <Text
              fontFamily="'Plus Jakarta Sans', sans-serif"
              fontWeight="800"
              fontSize="15px">
              
              Quote builder
            </Text>
          </Flex>
          <Text fontSize="11px" color="app.subtle" mb="14px">
            Draft for Lattice Labs
          </Text>
          {builderItems.map((item) =>
          <Flex
            key={item.name}
            py="9px"
            borderBottom="1px solid"
            borderColor="app.border"
            align="center">
            
              <Box>
                <Text fontSize="12px" fontWeight="600">
                  {item.name}
                </Text>
                <Text fontSize="10px" color="app.subtle">
                  Qty {item.qty} × ${item.price.toLocaleString()}
                </Text>
              </Box>
              <Text ml="auto" fontSize="12px" fontWeight="700">
                ${(item.qty * item.price).toLocaleString()}
              </Text>
            </Flex>
          )}
          <Flex mt="12px" justify="space-between">
            <Text fontSize="12px" color="app.subtle">
              Subtotal
            </Text>
            <Text fontSize="12px" fontWeight="600">
              ${subtotal.toLocaleString()}
            </Text>
          </Flex>
          <Flex mt="4px" justify="space-between">
            <Text fontSize="12px" color="app.subtle">
              Tax (8%)
            </Text>
            <Text fontSize="12px" fontWeight="600">
              ${tax.toLocaleString()}
            </Text>
          </Flex>
          <Flex
            mt="8px"
            pt="10px"
            borderTop="1px solid"
            borderColor="app.border"
            justify="space-between">
            
            <Text fontSize="13px" fontWeight="800">
              Total
            </Text>
            <Text fontSize="15px" fontWeight="800">
              ${(subtotal + tax).toLocaleString()}
            </Text>
          </Flex>
          <Button
            mt="16px"
            w="full"
            size="sm"
            bg="navy.600"
            color="white"
            _hover={{
              bg: 'navy.500'
            }}
            borderRadius="9px"
            fontSize="12px"
            onClick={() => notify('Quote sent for approval')}>
            
            Send for approval
          </Button>
          <Text mt="8px" fontSize="10px" color="app.faint" textAlign="center">
            eSignature ready · Version history enabled
          </Text>
        </Card>
      </Grid>
    </>);

}