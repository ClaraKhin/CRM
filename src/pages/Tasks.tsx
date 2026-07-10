import React, { useState } from 'react';
import {
  Avatar,
  Box,
  Button,
  Checkbox,
  Flex,
  Icon,
  Progress,
  Text,
  useToast } from
'@chakra-ui/react';
import { CalendarIcon, PlusIcon } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { StatusBadge } from '../components/ui/StatusBadge';
import { tasks as seedTasks } from '../data/mock';
import { ownerById } from '../data/people';
export function Tasks() {
  const [tasks, setTasks] = useState(seedTasks);
  const toast = useToast();
  const toggle = (id: string) => {
    setTasks((prev) =>
    prev.map((t) =>
    t.id === id ?
    {
      ...t,
      done: !t.done
    } :
    t
    )
    );
    const task = tasks.find((t) => t.id === id);
    if (task && !task.done) {
      toast({
        title: 'Task completed',
        status: 'success',
        duration: 1400,
        position: 'top-right'
      });
    }
  };
  return (
    <>
      <PageHeader
        title="Tasks"
        subtitle="Your team's follow-ups and to-dos."
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
            title: 'New task form opened',
            status: 'info',
            duration: 1600,
            position: 'top-right'
          })
          }>
          
            New task
          </Button>
        } />
      

      <Card
        p={{
          base: '8px',
          md: '10px'
        }}>
        
        {tasks.map((task, index) => {
          const owner = ownerById(task.ownerId);
          return (
            <Flex
              key={task.id}
              align="center"
              gap="12px"
              px="12px"
              py="13px"
              borderBottom={index === tasks.length - 1 ? '0' : '1px solid'}
              borderColor="app.border"
              opacity={task.done ? 0.55 : 1}>
              
              <Checkbox
                isChecked={task.done}
                onChange={() => toggle(task.id)}
                colorScheme="orange" />
              
              <Box flex="1" minW="0">
                <Text
                  fontSize="13px"
                  fontWeight="600"
                  textDecoration={task.done ? 'line-through' : 'none'}
                  noOfLines={1}>
                  
                  {task.title}
                </Text>
                <Flex mt="6px" align="center" gap="12px">
                  <Flex align="center" gap="4px" color="app.subtle">
                    <Icon as={CalendarIcon} boxSize="11px" />
                    <Text fontSize="10px">{task.dueDate}</Text>
                  </Flex>
                  <Flex align="center" gap="6px" minW="90px">
                    <Progress
                      value={task.checklistDone / task.checklistTotal * 100}
                      size="xs"
                      colorScheme="orange"
                      borderRadius="full"
                      flex="1"
                      bg="app.surfaceAlt" />
                    
                    <Text fontSize="9px" color="app.faint">
                      {task.checklistDone}/{task.checklistTotal}
                    </Text>
                  </Flex>
                </Flex>
              </Box>
              <Box
                display={{
                  base: 'none',
                  md: 'block'
                }}>
                
                <StatusBadge status={task.priority} />
              </Box>
              <Avatar
                size="xs"
                name={owner.name}
                bg={owner.color}
                color="#46506a"
                fontSize="8px" />
              
            </Flex>);

        })}
      </Card>
    </>);

}