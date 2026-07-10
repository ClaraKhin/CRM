import React, { useState } from 'react';
import {
  Avatar,
  Box,
  Button,
  Flex,
  Grid,
  Icon,
  Stack,
  Text,
  useToast } from
'@chakra-ui/react';
import {
  BotIcon,
  CalendarClockIcon,
  ChevronDownIcon,
  CircleDollarSignIcon,
  Clock3Icon,
  LayoutListIcon,
  TargetIcon,
  TrendingUpIcon,
  UsersRoundIcon } from
'lucide-react';
import { MetricCard } from '../components/dashboard/MetricCard';
import { RevenueChart } from '../components/dashboard/RevenueChart';
import { AiBriefing } from '../components/dashboard/AiBriefing';
import { Card, CardHeader } from '../components/ui/Card';
import { PageHeader } from '../components/ui/PageHeader';
const activity = [
{
  initials: 'EM',
  name: 'Emma Morris',
  action: 'moved to Proposal',
  time: '12 min ago',
  color: '#d9e8ff'
},
{
  initials: 'JL',
  name: 'James Lee',
  action: 'booked a discovery call',
  time: '36 min ago',
  color: '#f9dfbe'
},
{
  initials: 'AR',
  name: 'Aisha Rahman',
  action: 'opened your quote',
  time: '1 hr ago',
  color: '#eadbff'
}];

export function Dashboard() {
  const [period, setPeriod] = useState('This month');
  const toast = useToast();
  const showCopilot = () => {
    toast({
      title: 'Copilot is ready',
      description: 'Ask about deals, forecasts, or the next best action.',
      status: 'success',
      duration: 2600,
      isClosable: true,
      position: 'top-right'
    });
  };
  return (
    <>
      <PageHeader
        title="Good morning, Renee ✦"
        subtitle="Here’s what’s happening across your sales team."
        crumb="Dashboard"
        actions={
        <>
            <Button
            size="sm"
            borderRadius="9px"
            variant="outline"
            borderColor="app.border"
            fontSize="12px"
            rightIcon={<ChevronDownIcon size={14} />}
            onClick={() =>
            setPeriod(period === 'This month' ? 'Last month' : 'This month')
            }>
            
              {period}
            </Button>
            <Button
            size="sm"
            borderRadius="9px"
            bg="navy.600"
            color="white"
            _hover={{
              bg: 'navy.500'
            }}
            leftIcon={<BotIcon size={15} />}
            fontSize="12px"
            onClick={showCopilot}>
            
              Ask Copilot
            </Button>
          </>
        } />
      

      <Grid
        templateColumns={{
          base: 'repeat(2, 1fr)',
          xl: 'repeat(4, 1fr)'
        }}
        gap={{
          base: '11px',
          md: '16px'
        }}>
        
        <MetricCard
          label="Revenue this month"
          value="$186,420"
          trend="18.6%"
          icon={CircleDollarSignIcon}
          accent="#242d4b" />
        
        <MetricCard
          label="New qualified leads"
          value="124"
          trend="12.3%"
          icon={UsersRoundIcon}
          accent="#e9683f" />
        
        <MetricCard
          label="Pipeline value"
          value="$420,800"
          trend="8.1%"
          icon={TrendingUpIcon}
          accent="#8374d9" />
        
        <MetricCard
          label="Target achieved"
          value="78.4%"
          trend="5.2%"
          icon={TargetIcon}
          accent="#2d9c79" />
        
      </Grid>

      <Grid
        mt="18px"
        templateColumns={{
          base: '1fr',
          xl: 'minmax(0, 1.62fr) minmax(290px, .9fr)'
        }}
        gap="18px">
        
        <RevenueChart />
        <AiBriefing onAction={showCopilot} />
      </Grid>

      <Grid
        mt="18px"
        templateColumns={{
          base: '1fr',
          xl: 'minmax(0, 1.62fr) minmax(290px, .9fr)'
        }}
        gap="18px">
        
        <Card>
          <CardHeader
            title="Upcoming activity"
            subtitle="Your next 24 hours"
            right={
            <Icon as={CalendarClockIcon} boxSize="18px" color="#e9653c" />
            } />
          
          <Stack px="19px" py="8px" spacing="0">
            {activity.map((item, index) =>
            <Flex
              key={item.name}
              py="11px"
              borderBottom={index === activity.length - 1 ? '0' : '1px solid'}
              borderColor="app.border"
              gap="9px">
              
                <Avatar
                size="xs"
                name={item.initials}
                bg={item.color}
                color="#46506a"
                fontSize="8px" />
              
                <Box flex="1">
                  <Text fontSize="12px">
                    <Text as="span" fontWeight="700">
                      {item.name}
                    </Text>{' '}
                    <Text as="span" color="app.subtle">
                      {item.action}
                    </Text>
                  </Text>
                  <Flex mt="3px" align="center" color="app.faint" gap="3px">
                    <Icon as={Clock3Icon} boxSize="10px" />
                    <Text fontSize="9px">{item.time}</Text>
                  </Flex>
                </Box>
              </Flex>
            )}
          </Stack>
        </Card>

        <Card p="19px">
          <Flex align="center">
            <Text
              fontFamily="'Plus Jakarta Sans', sans-serif"
              fontWeight="800"
              fontSize="15px">
              
              Team momentum
            </Text>
            <Icon
              as={LayoutListIcon}
              ml="auto"
              boxSize="16px"
              color="app.faint" />
            
          </Flex>
          <Flex mt="15px" align="center" gap="13px">
            <Box
              w="66px"
              h="66px"
              border="8px solid"
              borderColor="#f5ded5"
              borderTopColor="#e9683f"
              borderRadius="full"
              display="flex"
              alignItems="center"
              justifyContent="center">
              
              <Text fontSize="12px" fontWeight="800">
                82%
              </Text>
            </Box>
            <Box>
              <Text fontSize="12px" fontWeight="700">
                On-track performance
              </Text>
              <Text mt="3px" fontSize="10px" color="app.subtle">
                9 of 11 reps on pace to hit quota.
              </Text>
            </Box>
          </Flex>
        </Card>
      </Grid>
    </>);

}