import React, { useState } from 'react';
import {
  Box,
  Button,
  Flex,
  Icon,
  Switch,
  Text,
  useToast } from
'@chakra-ui/react';
import { ArrowRightIcon, PlusIcon, ZapIcon } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Card, CardHeader } from '../components/ui/Card';
import { automations as seedAutomations } from '../data/mock';
export function Automation() {
  const [automations, setAutomations] = useState(seedAutomations);
  const toast = useToast();
  const toggle = (id: string) => {
    setAutomations((prev) =>
    prev.map((a) =>
    a.id === id ?
    {
      ...a,
      enabled: !a.enabled
    } :
    a
    )
    );
    const rule = automations.find((a) => a.id === id);
    if (rule)
    toast({
      title: `${rule.name} ${rule.enabled ? 'disabled' : 'enabled'}`,
      status: 'info',
      duration: 1600,
      position: 'top-right'
    });
  };
  return (
    <>
      <PageHeader
        title="Automation"
        subtitle="Workflow rules that run on autopilot."
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
            title: 'Workflow builder opened',
            status: 'info',
            duration: 1600,
            position: 'top-right'
          })
          }>
          
            New rule
          </Button>
        } />
      

      <Card>
        <CardHeader
          title="Automation rules"
          subtitle={`${automations.filter((a) => a.enabled).length} active`} />
        
        <Box
          px={{
            base: '14px',
            md: '20px'
          }}
          py="8px">
          
          {automations.map((rule, i) =>
          <Flex
            key={rule.id}
            align="center"
            gap="14px"
            py="16px"
            borderBottom={i === automations.length - 1 ? '0' : '1px solid'}
            borderColor="app.border"
            flexWrap={{
              base: 'wrap',
              md: 'nowrap'
            }}>
            
              <Flex
              w="38px"
              h="38px"
              borderRadius="11px"
              bg="brand.50"
              align="center"
              justify="center"
              flexShrink={0}>
              
                <Icon as={ZapIcon} boxSize="17px" color="#e9683f" />
              </Flex>
              <Box minW="0">
                <Text fontSize="13px" fontWeight="700">
                  {rule.name}
                </Text>
                <Text fontSize="10px" color="app.faint">
                  {rule.runs} runs
                </Text>
              </Box>
              <Flex
              align="center"
              gap="8px"
              ml={{
                base: 0,
                md: 'auto'
              }}
              flexWrap="wrap">
              
                <Box px="10px" py="5px" bg="app.surfaceAlt" borderRadius="8px">
                  <Text fontSize="11px">{rule.trigger}</Text>
                </Box>
                <Icon as={ArrowRightIcon} boxSize="14px" color="app.faint" />
                <Box px="10px" py="5px" bg="app.surfaceAlt" borderRadius="8px">
                  <Text fontSize="11px">{rule.action}</Text>
                </Box>
              </Flex>
              <Switch
              isChecked={rule.enabled}
              onChange={() => toggle(rule.id)}
              colorScheme="orange"
              ml={{
                base: 'auto',
                md: '4px'
              }} />
            
            </Flex>
          )}
        </Box>
      </Card>
    </>);

}