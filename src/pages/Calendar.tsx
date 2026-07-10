import React from 'react';
import {
  Badge,
  Box,
  Button,
  Flex,
  Grid,
  Text,
  useColorModeValue } from
'@chakra-ui/react';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { calendarEvents } from '../data/mock';
const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const typeColor: Record<string, string> = {
  Meeting: '#e9683f',
  Call: '#6b3fd1',
  Event: '#2d9c79'
};
export function Calendar() {
  // June 2024 starts on Saturday (offset 6)
  const offset = 6;
  const daysInMonth = 30;
  const cells = Array.from(
    {
      length: offset + daysInMonth
    },
    (_, i) => i < offset ? null : i - offset + 1
  );
  const today = 18;
  const emptyCellBg = useColorModeValue('#fbfbfd', 'rgba(255,255,255,0.02)');
  return (
    <>
      <PageHeader
        title="Calendar"
        subtitle="June 2024"
        actions={
        <>
            <Badge
            borderRadius="full"
            px="10px"
            py="4px"
            bg="#e3ecff"
            color="#3355c9"
            fontSize="10px"
            textTransform="none">
            
              Google synced
            </Badge>
            <Badge
            borderRadius="full"
            px="10px"
            py="4px"
            bg="#dcf3e8"
            color="#1c8a5c"
            fontSize="10px"
            textTransform="none">
            
              Outlook synced
            </Badge>
          </>
        } />
      

      <Card
        p={{
          base: '10px',
          md: '16px'
        }}>
        
        <Grid templateColumns="repeat(7, 1fr)" gap="6px" mb="8px">
          {weekdays.map((day) =>
          <Text
            key={day}
            textAlign="center"
            fontSize="10px"
            fontWeight="700"
            color="app.faint">
            
              {day}
            </Text>
          )}
        </Grid>
        <Grid templateColumns="repeat(7, 1fr)" gap="6px">
          {cells.map((day, i) => {
            const events = day ?
            calendarEvents.filter((e) => e.day === day) :
            [];
            const isToday = day === today;
            return (
              <Box
                key={i}
                minH={{
                  base: '64px',
                  md: '92px'
                }}
                borderRadius="10px"
                border="1px solid"
                borderColor={isToday ? '#e9683f' : 'app.border'}
                bg={day ? 'app.surface' : emptyCellBg}
                p="6px">
                
                {day &&
                <>
                    <Text
                    fontSize="11px"
                    fontWeight={isToday ? '800' : '600'}
                    color={isToday ? '#e9683f' : 'app.subtle'}
                    mb="4px">
                    
                      {day}
                    </Text>
                    {events.map((event) =>
                  <Box
                    key={event.id}
                    mb="3px"
                    px="5px"
                    py="3px"
                    borderRadius="6px"
                    bg={`${typeColor[event.type]}1a`}
                    borderLeft="2px solid"
                    borderColor={typeColor[event.type]}>
                    
                        <Text
                      fontSize="9px"
                      fontWeight="700"
                      noOfLines={1}
                      color={typeColor[event.type]}>
                      
                          {event.time} {event.title}
                        </Text>
                      </Box>
                  )}
                  </>
                }
              </Box>);

          })}
        </Grid>
      </Card>
    </>);

}