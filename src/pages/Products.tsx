import React, { useState } from 'react';
import { Box, Button, Flex, Grid, Icon, Text, useToast } from '@chakra-ui/react';
import { LayersIcon, PackageIcon, PlusIcon } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { StatusBadge } from '../components/ui/StatusBadge';
import { products } from '../data/mock';
const categories = ['All', 'Platform', 'Add-on', 'Service', 'License'];
export function Products() {
  const [category, setCategory] = useState('All');
  const toast = useToast();
  const filtered =
  category === 'All' ?
  products :
  products.filter((p) => p.category === category);
  return (
    <>
      <PageHeader
        title="Products"
        subtitle="Catalog, pricing, and inventory."
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
            title: 'New product form opened',
            status: 'info',
            duration: 1600,
            position: 'top-right'
          })
          }>
          
            New product
          </Button>
        } />
      

      <Flex gap="7px" mb="16px" flexWrap="wrap">
        {categories.map((cat) =>
        <Button
          key={cat}
          size="xs"
          borderRadius="full"
          variant={category === cat ? 'solid' : 'outline'}
          bg={category === cat ? 'navy.600' : 'transparent'}
          color={category === cat ? 'white' : 'app.subtle'}
          borderColor="app.border"
          _hover={{
            bg: category === cat ? 'navy.500' : 'app.surfaceAlt'
          }}
          fontSize="11px"
          onClick={() => setCategory(cat)}>
          
            {cat}
          </Button>
        )}
      </Flex>

      <Grid
        templateColumns={{
          base: '1fr',
          md: 'repeat(2, 1fr)',
          xl: 'repeat(3, 1fr)'
        }}
        gap="14px">
        
        {filtered.map((product) =>
        <Card key={product.id} p="18px">
            <Flex align="center" justify="space-between">
              <Flex
              w="40px"
              h="40px"
              align="center"
              justify="center"
              borderRadius="12px"
              bg="app.surfaceAlt">
              
                <Icon as={PackageIcon} boxSize="19px" color="#e9683f" />
              </Flex>
              <StatusBadge status={product.status} />
            </Flex>
            <Text mt="14px" fontSize="15px" fontWeight="700">
              {product.name}
            </Text>
            <Text fontSize="11px" color="app.subtle">
              {product.category}
            </Text>
            <Flex
            mt="15px"
            pt="13px"
            borderTop="1px solid"
            borderColor="app.border"
            align="center">
            
              <Box>
                <Text fontSize="10px" color="app.faint">
                  Price
                </Text>
                <Text fontSize="16px" fontWeight="800">
                  ${product.price.toLocaleString()}
                </Text>
              </Box>
              <Flex ml="auto" align="center" gap="4px" color="app.subtle">
                <Icon as={LayersIcon} boxSize="13px" />
                <Text fontSize="11px">{product.variants} variants</Text>
              </Flex>
            </Flex>
          </Card>
        )}
      </Grid>
    </>);

}