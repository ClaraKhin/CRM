import React from 'react';
import { Button, Grid, HStack, Text, useToast } from '@chakra-ui/react';
import { FileDownIcon, FileSpreadsheetIcon, FileTextIcon } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Card, CardHeader } from '../components/ui/Card';
import {
  BarChart,
  DonutChart,
  FunnelChart,
  LineChart } from
'../components/reports/Charts';
import { months, revenueSeries } from '../data/mock';
export function Reports() {
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
        title="Reports"
        subtitle="Analyze revenue, conversion, and team performance."
        actions={
        <HStack spacing="6px">
            <Button
            size="sm"
            variant="outline"
            borderColor="app.border"
            borderRadius="9px"
            fontSize="12px"
            leftIcon={<FileTextIcon size={14} />}
            onClick={() => notify('Exported to PDF')}>
            
              PDF
            </Button>
            <Button
            size="sm"
            variant="outline"
            borderColor="app.border"
            borderRadius="9px"
            fontSize="12px"
            leftIcon={<FileSpreadsheetIcon size={14} />}
            onClick={() => notify('Exported to Excel')}>
            
              Excel
            </Button>
            <Button
            size="sm"
            variant="outline"
            borderColor="app.border"
            borderRadius="9px"
            fontSize="12px"
            leftIcon={<FileDownIcon size={14} />}
            onClick={() => notify('Exported to CSV')}>
            
              CSV
            </Button>
          </HStack>
        } />
      

      <Grid
        templateColumns={{
          base: '1fr',
          lg: 'repeat(2, 1fr)'
        }}
        gap="18px">
        
        <Card>
          <CardHeader
            title="Revenue trend"
            subtitle="Monthly recurring revenue" />
          
          <div
            style={{
              padding: '18px'
            }}>
            
            <BarChart data={revenueSeries} labels={months} />
          </div>
        </Card>
        <Card>
          <CardHeader title="Lead conversion" subtitle="Last 8 weeks" />
          <div
            style={{
              padding: '18px'
            }}>
            
            <LineChart data={[20, 35, 30, 48, 42, 60, 55, 72]} />
          </div>
        </Card>
        <Card>
          <CardHeader title="Lead sources" subtitle="This quarter" />
          <div
            style={{
              padding: '20px'
            }}>
            
            <DonutChart
              segments={[
              {
                label: 'Website',
                value: 42,
                color: '#e9683f'
              },
              {
                label: 'Referral',
                value: 28,
                color: '#6b3fd1'
              },
              {
                label: 'Google Ads',
                value: 18,
                color: '#2d9c79'
              },
              {
                label: 'Event',
                value: 12,
                color: '#f0a13c'
              }]
              } />
            
          </div>
        </Card>
        <Card>
          <CardHeader title="Sales funnel" subtitle="Deal stage conversion" />
          <div
            style={{
              padding: '20px'
            }}>
            
            <FunnelChart
              stages={[
              {
                label: 'Leads',
                value: 480
              },
              {
                label: 'Qualified',
                value: 312
              },
              {
                label: 'Proposal',
                value: 168
              },
              {
                label: 'Negotiation',
                value: 94
              },
              {
                label: 'Won',
                value: 61
              }]
              } />
            
          </div>
        </Card>
      </Grid>
    </>);

}