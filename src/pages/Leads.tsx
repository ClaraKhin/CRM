import React, { useMemo, useState } from 'react';
import {
  Avatar,
  Box,
  Button,
  Flex,
  HStack,
  Icon,
  IconButton,
  Input,
  InputGroup,
  InputLeftElement,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Select,
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
import {
  MoreHorizontalIcon,
  PlusIcon,
  SearchIcon,
  UsersRoundIcon } from
'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { StatusBadge } from '../components/ui/StatusBadge';
import { ScoreBadge } from '../components/ui/ScoreBadge';
import { EmptyState } from '../components/ui/EmptyState';
import { leads } from '../data/mock';
import { initials, ownerById, personById } from '../data/people';
export function Leads() {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('All');
  const toast = useToast();
  const filtered = useMemo(() => {
    return leads.filter((lead) => {
      const person = personById(lead.personId);
      const matchesQuery =
      person.name.toLowerCase().includes(query.toLowerCase()) ||
      person.company.toLowerCase().includes(query.toLowerCase());
      const matchesStatus = status === 'All' || lead.status === status;
      return matchesQuery && matchesStatus;
    });
  }, [query, status]);
  const notify = (label: string) =>
  toast({
    title: label,
    status: 'info',
    duration: 1800,
    position: 'top-right'
  });
  return (
    <>
      <PageHeader
        title="Leads"
        subtitle="Track, score, and qualify inbound leads."
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
          onClick={() => notify('New lead form opened')}>
          
            New lead
          </Button>
        } />
      

      <Card>
        <Flex
          px={{
            base: '14px',
            md: '20px'
          }}
          py="14px"
          gap="10px"
          align="center"
          flexWrap="wrap"
          borderBottom="1px solid"
          borderColor="app.border">
          
          <InputGroup maxW="280px" size="sm">
            <InputLeftElement pointerEvents="none">
              <SearchIcon size={15} color="#8a93a6" />
            </InputLeftElement>
            <Input
              placeholder="Search leads..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              borderRadius="9px"
              bg="app.surfaceAlt"
              borderColor="app.border"
              fontSize="12px" />
            
          </InputGroup>
          <Select
            size="sm"
            maxW="160px"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            borderRadius="9px"
            borderColor="app.border"
            fontSize="12px">
            
            <option value="All">All statuses</option>
            <option value="New">New</option>
            <option value="Contacted">Contacted</option>
            <option value="Qualified">Qualified</option>
            <option value="Unqualified">Unqualified</option>
          </Select>
          <Text ml="auto" fontSize="12px" color="app.subtle">
            {filtered.length} leads
          </Text>
        </Flex>

        {filtered.length === 0 ?
        <EmptyState
          icon={UsersRoundIcon}
          title="No leads found"
          description="Try adjusting your search or filters." /> :


        <TableContainer>
            <Table size="sm" variant="simple">
              <Thead>
                <Tr>
                  <Th
                  borderColor="app.border"
                  fontSize="10px"
                  color="app.faint">
                  
                    Lead
                  </Th>
                  <Th
                  borderColor="app.border"
                  fontSize="10px"
                  color="app.faint"
                  display={{
                    base: 'none',
                    md: 'table-cell'
                  }}>
                  
                    Source
                  </Th>
                  <Th
                  borderColor="app.border"
                  fontSize="10px"
                  color="app.faint">
                  
                    AI Score
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
                  display={{
                    base: 'none',
                    lg: 'table-cell'
                  }}>
                  
                    Owner
                  </Th>
                  <Th
                  borderColor="app.border"
                  fontSize="10px"
                  color="app.faint"
                  isNumeric>
                  
                    Value
                  </Th>
                  <Th borderColor="app.border" w="40px"></Th>
                </Tr>
              </Thead>
              <Tbody>
                {filtered.map((lead) => {
                const person = personById(lead.personId);
                const owner = ownerById(lead.ownerId);
                return (
                  <Tr
                    key={lead.id}
                    _hover={{
                      bg: 'app.surfaceAlt'
                    }}>
                    
                      <Td borderColor="app.border">
                        <Flex align="center" gap="10px">
                          <Avatar
                          size="sm"
                          name={person.name}
                          bg={person.avatarColor}
                          color="#46506a"
                          fontSize="10px" />
                        
                          <Box>
                            <Text fontSize="12px" fontWeight="700">
                              {person.name}
                            </Text>
                            <Text fontSize="10px" color="app.subtle">
                              {person.company}
                            </Text>
                          </Box>
                        </Flex>
                      </Td>
                      <Td
                      borderColor="app.border"
                      display={{
                        base: 'none',
                        md: 'table-cell'
                      }}>
                      
                        <Text fontSize="12px" color="app.subtle">
                          {lead.source}
                        </Text>
                      </Td>
                      <Td borderColor="app.border">
                        <ScoreBadge score={lead.score} />
                      </Td>
                      <Td borderColor="app.border">
                        <StatusBadge status={lead.status} />
                      </Td>
                      <Td
                      borderColor="app.border"
                      display={{
                        base: 'none',
                        lg: 'table-cell'
                      }}>
                      
                        <HStack spacing="7px">
                          <Avatar
                          size="2xs"
                          name={owner.name}
                          bg={owner.color}
                          color="#46506a"
                          fontSize="8px" />
                        
                          <Text fontSize="11px">{owner.name}</Text>
                        </HStack>
                      </Td>
                      <Td
                      borderColor="app.border"
                      isNumeric
                      fontSize="12px"
                      fontWeight="700">
                      
                        ${lead.value.toLocaleString()}
                      </Td>
                      <Td borderColor="app.border">
                        <Menu placement="bottom-end">
                          <MenuButton
                          as={IconButton}
                          aria-label="Lead actions"
                          icon={<MoreHorizontalIcon size={15} />}
                          variant="ghost"
                          size="xs" />
                        
                          <MenuList bg="app.surface" borderColor="app.border">
                            <MenuItem
                            bg="app.surface"
                            fontSize="12px"
                            onClick={() => notify('Lead qualified')}>
                            
                              Qualify
                            </MenuItem>
                            <MenuItem
                            bg="app.surface"
                            fontSize="12px"
                            onClick={() => notify('Follow-up scheduled')}>
                            
                              Schedule follow-up
                            </MenuItem>
                            <MenuItem
                            bg="app.surface"
                            fontSize="12px"
                            color="#c23c3c"
                            onClick={() => notify('Lead archived')}>
                            
                              Archive
                            </MenuItem>
                          </MenuList>
                        </Menu>
                      </Td>
                    </Tr>);

              })}
              </Tbody>
            </Table>
          </TableContainer>
        }
      </Card>
    </>);

}