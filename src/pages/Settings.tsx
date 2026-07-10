import React from 'react';
import {
  Avatar,
  Box,
  Button,
  Flex,
  FormControl,
  FormLabel,
  Grid,
  HStack,
  Icon,
  Input,
  Switch,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Text,
  useToast } from
'@chakra-ui/react';
import { CheckIcon, CopyIcon, KeyIcon } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Card, CardHeader } from '../components/ui/Card';
import { StatusBadge } from '../components/ui/StatusBadge';
import { owners } from '../data/people';
import { mcpServers } from '../data/mock';
const roles = [
{
  role: 'Super Admin',
  members: 1,
  perms: 'Full access'
},
{
  role: 'Sales Manager',
  members: 3,
  perms: 'Manage team + deals'
},
{
  role: 'Sales Executive',
  members: 8,
  perms: 'Own leads + deals'
},
{
  role: 'Finance',
  members: 2,
  perms: 'Invoices + billing'
}];

const plans = [
{
  name: 'Starter',
  price: '$0',
  current: false
},
{
  name: 'Growth',
  price: '$49',
  current: true
},
{
  name: 'Enterprise',
  price: 'Custom',
  current: false
}];

export function Settings() {
  const toast = useToast();
  const notify = (label: string) =>
  toast({
    title: label,
    status: 'success',
    duration: 1600,
    position: 'top-right'
  });
  return (
    <>
      <PageHeader
        title="Settings"
        subtitle="Manage your workspace, team, and integrations." />
      

      <Tabs colorScheme="orange" variant="soft-rounded">
        <TabList overflowX="auto" pb="4px" gap="4px">
          {[
          'Profile',
          'Team & Roles',
          'Integrations',
          'Notifications',
          'Billing',
          'API Keys'].
          map((t) =>
          <Tab
            key={t}
            fontSize="12px"
            fontWeight="600"
            whiteSpace="nowrap"
            _selected={{
              bg: 'brand.50',
              color: 'brand.600'
            }}>
            
              {t}
            </Tab>
          )}
        </TabList>

        <TabPanels mt="14px">
          <TabPanel px="0">
            <Card p="22px" maxW="560px">
              <Flex align="center" gap="14px" mb="20px">
                <Avatar
                  size="lg"
                  name="Renee Walker"
                  bg="#ffdccb"
                  color="#b6451e" />
                
                <Box>
                  <Text fontWeight="700" fontSize="15px">
                    Renee Walker
                  </Text>
                  <Text fontSize="12px" color="app.subtle">
                    Sales Manager
                  </Text>
                </Box>
              </Flex>
              <Grid
                templateColumns={{
                  base: '1fr',
                  md: 'repeat(2, 1fr)'
                }}
                gap="14px">
                
                <FormControl>
                  <FormLabel fontSize="12px">Full name</FormLabel>
                  <Input
                    defaultValue="Renee Walker"
                    size="sm"
                    borderRadius="9px"
                    borderColor="app.border" />
                  
                </FormControl>
                <FormControl>
                  <FormLabel fontSize="12px">Email</FormLabel>
                  <Input
                    defaultValue="renee@crescent.com"
                    size="sm"
                    borderRadius="9px"
                    borderColor="app.border" />
                  
                </FormControl>
              </Grid>
              <Button
                mt="18px"
                size="sm"
                bg="navy.600"
                color="white"
                _hover={{
                  bg: 'navy.500'
                }}
                borderRadius="9px"
                fontSize="12px"
                onClick={() => notify('Profile saved')}>
                
                Save changes
              </Button>
            </Card>
          </TabPanel>

          <TabPanel px="0">
            <Card>
              <CardHeader
                title="Roles & permissions"
                subtitle="RBAC role definitions" />
              
              <Box px="20px" py="8px">
                {roles.map((r, i) =>
                <Flex
                  key={r.role}
                  align="center"
                  py="14px"
                  borderBottom={i === roles.length - 1 ? '0' : '1px solid'}
                  borderColor="app.border">
                  
                    <Box>
                      <Text fontSize="13px" fontWeight="700">
                        {r.role}
                      </Text>
                      <Text fontSize="11px" color="app.subtle">
                        {r.perms}
                      </Text>
                    </Box>
                    <Text ml="auto" fontSize="12px" color="app.subtle">
                      {r.members} members
                    </Text>
                  </Flex>
                )}
              </Box>
            </Card>
          </TabPanel>

          <TabPanel px="0">
            <Grid
              templateColumns={{
                base: '1fr',
                md: 'repeat(2, 1fr)',
                xl: 'repeat(3, 1fr)'
              }}
              gap="14px">
              
              {mcpServers.map((server) =>
              <Card key={server.id} p="16px">
                  <Flex align="center">
                    <Text fontSize="13px" fontWeight="700">
                      {server.name}
                    </Text>
                    <Box ml="auto">
                      <StatusBadge
                      status={server.connected ? 'Approved' : 'Draft'} />
                    
                    </Box>
                  </Flex>
                  <Text fontSize="11px" color="app.subtle" mt="3px">
                    {server.category}
                  </Text>
                  <Button
                  mt="12px"
                  size="xs"
                  w="full"
                  variant="outline"
                  borderColor="app.border"
                  borderRadius="8px"
                  fontSize="11px"
                  onClick={() =>
                  notify(
                    `${server.name} ${server.connected ? 'reconfigured' : 'connected'}`
                  )
                  }>
                  
                    {server.connected ? 'Configure' : 'Connect'}
                  </Button>
                </Card>
              )}
            </Grid>
          </TabPanel>

          <TabPanel px="0">
            <Card p="20px" maxW="560px">
              {[
              'Email notifications',
              'Push notifications',
              'Slack alerts',
              'Weekly digest'].
              map((label, i) =>
              <Flex
                key={label}
                align="center"
                py="13px"
                borderBottom={i === 3 ? '0' : '1px solid'}
                borderColor="app.border">
                
                  <Text fontSize="13px" flex="1">
                    {label}
                  </Text>
                  <Switch defaultChecked={i < 2} colorScheme="orange" />
                </Flex>
              )}
            </Card>
          </TabPanel>

          <TabPanel px="0">
            <Grid
              templateColumns={{
                base: '1fr',
                md: 'repeat(3, 1fr)'
              }}
              gap="14px">
              
              {plans.map((plan) =>
              <Card
                key={plan.name}
                p="20px"
                borderColor={plan.current ? 'brand.500' : 'app.border'}
                borderWidth={plan.current ? '2px' : '1px'}>
                
                  <Flex align="center">
                    <Text fontSize="14px" fontWeight="800">
                      {plan.name}
                    </Text>
                    {plan.current &&
                  <Box ml="auto">
                        <StatusBadge status="Approved" />
                      </Box>
                  }
                  </Flex>
                  <Text
                  mt="8px"
                  fontFamily="'Plus Jakarta Sans', sans-serif"
                  fontSize="26px"
                  fontWeight="800">
                  
                    {plan.price}
                    <Text
                    as="span"
                    fontSize="12px"
                    color="app.subtle"
                    fontWeight="500">
                    
                      /mo
                    </Text>
                  </Text>
                  <Button
                  mt="14px"
                  size="sm"
                  w="full"
                  borderRadius="9px"
                  fontSize="12px"
                  isDisabled={plan.current}
                  bg={plan.current ? 'app.surfaceAlt' : 'navy.600'}
                  color={plan.current ? 'app.subtle' : 'white'}
                  _hover={{
                    bg: plan.current ? 'app.surfaceAlt' : 'navy.500'
                  }}
                  onClick={() => notify(`Switched to ${plan.name}`)}>
                  
                    {plan.current ? 'Current plan' : 'Upgrade'}
                  </Button>
                </Card>
              )}
            </Grid>
          </TabPanel>

          <TabPanel px="0">
            <Card p="20px" maxW="620px">
              <Flex align="center" gap="8px" mb="14px">
                <Icon as={KeyIcon} boxSize="16px" color="#e9683f" />
                <Text fontWeight="700" fontSize="14px">
                  API Keys
                </Text>
              </Flex>
              {[
              {
                name: 'Production key',
                value: 'sk_live_••••••••••••4f2a'
              },
              {
                name: 'Development key',
                value: 'sk_test_••••••••••••9c1b'
              }].
              map((key, i) =>
              <Flex
                key={i}
                align="center"
                gap="10px"
                py="12px"
                borderBottom={i === 1 ? '0' : '1px solid'}
                borderColor="app.border">
                
                  <Box flex="1">
                    <Text fontSize="12px" fontWeight="600">
                      {key.name}
                    </Text>
                    <Text
                    fontSize="11px"
                    color="app.subtle"
                    fontFamily="monospace">
                    
                      {key.value}
                    </Text>
                  </Box>
                  <Button
                  size="xs"
                  variant="ghost"
                  leftIcon={<CopyIcon size={13} />}
                  onClick={() => notify('API key copied')}>
                  
                    Copy
                  </Button>
                </Flex>
              )}
            </Card>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </>);

}