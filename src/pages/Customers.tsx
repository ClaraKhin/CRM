import React, { useState } from 'react';
import {
  Avatar,
  Box,
  Button,
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerHeader,
  DrawerOverlay,
  Flex,
  Grid,
  HStack,
  Icon,
  Tag,
  Text,
  useDisclosure,
  useToast } from
'@chakra-ui/react';
import {
  BuildingIcon,
  FileTextIcon,
  GlobeIcon,
  MailIcon,
  MapPinIcon,
  PhoneIcon,
  PlusIcon } from
'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { StatusBadge } from '../components/ui/StatusBadge';
import { customers } from '../data/mock';
import { personById } from '../data/people';
import type { Customer } from '../data/types';
const timeline = [
{
  text: 'Renewal quote sent',
  time: '2 days ago'
},
{
  text: 'Quarterly business review',
  time: '1 week ago'
},
{
  text: 'Support ticket resolved',
  time: '2 weeks ago'
}];

export function Customers() {
  const drawer = useDisclosure();
  const [selected, setSelected] = useState<Customer | null>(null);
  const toast = useToast();
  const open = (customer: Customer) => {
    setSelected(customer);
    drawer.onOpen();
  };
  const person = selected ? personById(selected.personId) : null;
  return (
    <>
      <PageHeader
        title="Customers"
        subtitle="Manage accounts, contacts, and relationships."
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
          onClick={() =>
          toast({
            title: 'New customer form opened',
            status: 'info',
            duration: 1600,
            position: 'top-right'
          })
          }>
          
            New customer
          </Button>
        } />
      

      <Grid
        templateColumns={{
          base: '1fr',
          md: 'repeat(2, 1fr)',
          xl: 'repeat(3, 1fr)'
        }}
        gap="14px">
        
        {customers.map((customer) => {
          const p = personById(customer.personId);
          return (
            <Card
              key={customer.id}
              p="18px"
              cursor="pointer"
              transition="transform .12s ease"
              _hover={{
                transform: 'translateY(-2px)'
              }}
              onClick={() => open(customer)}>
              
              <Flex align="center" gap="11px">
                <Avatar
                  size="md"
                  name={p.name}
                  bg={p.avatarColor}
                  color="#46506a"
                  fontSize="14px" />
                
                <Box flex="1" minW="0">
                  <Text fontSize="14px" fontWeight="700" noOfLines={1}>
                    {p.company}
                  </Text>
                  <Text fontSize="11px" color="app.subtle" noOfLines={1}>
                    {p.name}
                  </Text>
                </Box>
                <StatusBadge status={customer.status} />
              </Flex>
              <Flex mt="14px" gap="8px" flexWrap="wrap">
                {customer.tags.map((tag) =>
                <Tag
                  key={tag}
                  size="sm"
                  borderRadius="full"
                  bg="app.surfaceAlt"
                  color="app.subtle"
                  fontSize="10px">
                  
                    {tag}
                  </Tag>
                )}
              </Flex>
              <Flex
                mt="14px"
                pt="13px"
                borderTop="1px solid"
                borderColor="app.border"
                justify="space-between">
                
                <Box>
                  <Text fontSize="10px" color="app.faint">
                    Industry
                  </Text>
                  <Text fontSize="12px" fontWeight="600">
                    {customer.industry}
                  </Text>
                </Box>
                <Box textAlign="right">
                  <Text fontSize="10px" color="app.faint">
                    Lifetime value
                  </Text>
                  <Text fontSize="12px" fontWeight="700">
                    ${customer.lifetimeValue.toLocaleString()}
                  </Text>
                </Box>
              </Flex>
            </Card>);

        })}
      </Grid>

      <Drawer
        isOpen={drawer.isOpen}
        placement="right"
        onClose={drawer.onClose}
        size="md">
        
        <DrawerOverlay />
        <DrawerContent bg="app.surface">
          <DrawerCloseButton />
          <DrawerHeader borderBottom="1px solid" borderColor="app.border">
            {person &&
            <Flex align="center" gap="12px">
                <Avatar
                size="md"
                name={person.name}
                bg={person.avatarColor}
                color="#46506a" />
              
                <Box>
                  <Text fontSize="16px" fontWeight="800">
                    {person.company}
                  </Text>
                  {selected && <StatusBadge status={selected.status} />}
                </Box>
              </Flex>
            }
          </DrawerHeader>
          <DrawerBody>
            {selected && person &&
            <Box>
                <Text
                fontSize="11px"
                fontWeight="700"
                color="app.faint"
                letterSpacing="0.08em"
                mb="9px">
                
                  CONTACT
                </Text>
                <Box bg="app.surfaceAlt" borderRadius="12px" p="14px">
                  {[
                {
                  icon: MailIcon,
                  value: person.email
                },
                {
                  icon: PhoneIcon,
                  value: person.phone
                },
                {
                  icon: GlobeIcon,
                  value: selected.website
                },
                {
                  icon: MapPinIcon,
                  value: selected.address
                },
                {
                  icon: BuildingIcon,
                  value: selected.industry
                }].
                map((row, i) =>
                <Flex key={i} align="center" gap="10px" py="6px">
                      <Icon as={row.icon} boxSize="15px" color="app.faint" />
                      <Text fontSize="12px">{row.value}</Text>
                    </Flex>
                )}
                </Box>

                <Text
                fontSize="11px"
                fontWeight="700"
                color="app.faint"
                letterSpacing="0.08em"
                mt="20px"
                mb="9px">
                
                  TAGS
                </Text>
                <HStack spacing="8px" flexWrap="wrap">
                  {selected.tags.map((tag) =>
                <Tag
                  key={tag}
                  borderRadius="full"
                  bg="brand.50"
                  color="brand.600"
                  fontSize="11px">
                  
                      {tag}
                    </Tag>
                )}
                </HStack>

                <Text
                fontSize="11px"
                fontWeight="700"
                color="app.faint"
                letterSpacing="0.08em"
                mt="20px"
                mb="9px">
                
                  TIMELINE
                </Text>
                <Box>
                  {timeline.map((item, i) =>
                <Flex key={i} gap="11px" pb="14px">
                      <Flex direction="column" align="center">
                        <Box w="9px" h="9px" borderRadius="full" bg="#e9683f" />
                        {i < timeline.length - 1 &&
                    <Box w="1px" flex="1" bg="app.border" mt="2px" />
                    }
                      </Flex>
                      <Box>
                        <Text fontSize="12px" fontWeight="600">
                          {item.text}
                        </Text>
                        <Text fontSize="10px" color="app.subtle">
                          {item.time}
                        </Text>
                      </Box>
                    </Flex>
                )}
                </Box>

                <Text
                fontSize="11px"
                fontWeight="700"
                color="app.faint"
                letterSpacing="0.08em"
                mt="6px"
                mb="9px">
                
                  DOCUMENTS
                </Text>
                <Flex
                align="center"
                gap="10px"
                p="12px"
                bg="app.surfaceAlt"
                borderRadius="10px">
                
                  <Icon as={FileTextIcon} boxSize="16px" color="app.subtle" />
                  <Text fontSize="12px" flex="1">
                    Master service agreement.pdf
                  </Text>
                  <Button
                  size="xs"
                  variant="ghost"
                  onClick={() =>
                  toast({
                    title: 'Download started',
                    status: 'info',
                    duration: 1500,
                    position: 'top-right'
                  })
                  }>
                  
                    Download
                  </Button>
                </Flex>
              </Box>
            }
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </>);

}