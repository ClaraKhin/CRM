import React, { useMemo, useState } from 'react';
import {
  Avatar,
  Box,
  Button,
  Flex,
  Grid,
  Icon,
  Text,
  useToast } from
'@chakra-ui/react';
import { PlusIcon, TrendingUpIcon } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { deals as seedDeals } from '../data/mock';
import { initials, personById } from '../data/people';
import type { Deal, PipelineStage } from '../data/types';
const stageOrder: {
  stage: PipelineStage;
  tone: string;
}[] = [
{
  stage: 'New',
  tone: '#6c7aea'
},
{
  stage: 'Contacted',
  tone: '#4f9de0'
},
{
  stage: 'Qualified',
  tone: '#2d9c79'
},
{
  stage: 'Meeting',
  tone: '#8374d9'
},
{
  stage: 'Proposal',
  tone: '#f0a13c'
},
{
  stage: 'Negotiation',
  tone: '#d85a9a'
},
{
  stage: 'Won',
  tone: '#1c8a5c'
},
{
  stage: 'Lost',
  tone: '#c23c3c'
}];

export function Pipeline() {
  const [deals, setDeals] = useState<Deal[]>(seedDeals);
  const [dragId, setDragId] = useState<string | null>(null);
  const toast = useToast();
  const openValue = useMemo(
    () =>
    deals.
    filter((d) => d.stage !== 'Won' && d.stage !== 'Lost').
    reduce((s, d) => s + d.value, 0),
    [deals]
  );
  const wonValue = useMemo(
    () =>
    deals.filter((d) => d.stage === 'Won').reduce((s, d) => s + d.value, 0),
    [deals]
  );
  const forecast = useMemo(
    () =>
    Math.round(
      deals.
      filter((d) => d.stage !== 'Lost').
      reduce((s, d) => s + d.value * d.probability / 100, 0)
    ),
    [deals]
  );
  const onDrop = (stage: PipelineStage) => {
    if (!dragId) return;
    setDeals((prev) =>
    prev.map((d) =>
    d.id === dragId ?
    {
      ...d,
      stage
    } :
    d
    )
    );
    toast({
      title: `Deal moved to ${stage}`,
      status: 'success',
      duration: 1600,
      position: 'top-right'
    });
    setDragId(null);
  };
  return (
    <>
      <PageHeader
        title="Pipeline"
        subtitle="Drag deals between stages to update your forecast."
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
            title: 'New deal form opened',
            status: 'info',
            duration: 1600,
            position: 'top-right'
          })
          }>
          
            New deal
          </Button>
        } />
      

      <Grid
        templateColumns={{
          base: 'repeat(2, 1fr)',
          md: 'repeat(4, 1fr)'
        }}
        gap="12px"
        mb="18px">
        
        {[
        {
          label: 'Open pipeline',
          value: `$${openValue.toLocaleString()}`
        },
        {
          label: 'Weighted forecast',
          value: `$${forecast.toLocaleString()}`
        },
        {
          label: 'Won this quarter',
          value: `$${wonValue.toLocaleString()}`
        },
        {
          label: 'Avg win probability',
          value: `${Math.round(deals.reduce((s, d) => s + d.probability, 0) / deals.length)}%`
        }].
        map((item) =>
        <Card key={item.label} p="15px">
            <Text fontSize="11px" color="app.subtle">
              {item.label}
            </Text>
            <Text
            mt="4px"
            fontFamily="'Plus Jakarta Sans', sans-serif"
            fontSize="19px"
            fontWeight="800"
            letterSpacing="-0.03em">
            
              {item.value}
            </Text>
          </Card>
        )}
      </Grid>

      <Flex gap="12px" overflowX="auto" pb="8px">
        {stageOrder.map(({ stage, tone }) => {
          const stageDeals = deals.filter((d) => d.stage === stage);
          const total = stageDeals.reduce((s, d) => s + d.value, 0);
          return (
            <Box
              key={stage}
              minW="230px"
              flex="1"
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => onDrop(stage)}>
              
              <Flex align="center" gap="7px" mb="10px" px="4px">
                <Box w="8px" h="8px" borderRadius="full" bg={tone} />
                <Text fontSize="12px" fontWeight="700">
                  {stage}
                </Text>
                <Text fontSize="10px" color="app.faint">
                  ({stageDeals.length})
                </Text>
                <Text
                  ml="auto"
                  fontSize="10px"
                  color="app.subtle"
                  fontWeight="600">
                  
                  ${(total / 1000).toFixed(1)}k
                </Text>
              </Flex>
              <Box bg="app.surfaceAlt" borderRadius="14px" p="8px" minH="120px">
                {stageDeals.length === 0 ?
                <Flex h="80px" align="center" justify="center">
                    <Text fontSize="10px" color="app.faint">
                      Drop deals here
                    </Text>
                  </Flex> :

                stageDeals.map((deal) => {
                  const person = personById(deal.personId);
                  return (
                    <Box
                      key={deal.id}
                      draggable
                      onDragStart={() => setDragId(deal.id)}
                      mb="8px"
                      p="12px"
                      bg="app.surface"
                      borderRadius="12px"
                      border="1px solid"
                      borderColor="app.border"
                      cursor="grab"
                      _active={{
                        cursor: 'grabbing'
                      }}
                      boxShadow="0 2px 5px rgba(24,35,57,.04)"
                      transition="transform .12s ease"
                      _hover={{
                        transform: 'translateY(-1px)'
                      }}>
                      
                        <Text fontSize="12px" fontWeight="700">
                          {deal.title}
                        </Text>
                        <Text mt="1px" fontSize="10px" color="app.subtle">
                          {person.company}
                        </Text>
                        <Flex mt="10px" align="center" gap="6px">
                          <Text fontSize="13px" fontWeight="800">
                            ${deal.value.toLocaleString()}
                          </Text>
                          <Flex
                          align="center"
                          gap="3px"
                          ml="auto"
                          color="#219669">
                          
                            <Icon as={TrendingUpIcon} boxSize="11px" />
                            <Text fontSize="10px" fontWeight="700">
                              {deal.probability}%
                            </Text>
                          </Flex>
                          <Avatar
                          size="2xs"
                          name={person.name}
                          bg={person.avatarColor}
                          color="#46506a"
                          fontSize="7px" />
                        
                        </Flex>
                      </Box>);

                })
                }
              </Box>
            </Box>);

        })}
      </Flex>
    </>);

}