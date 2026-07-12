import React, { useCallback, useEffect, useState } from 'react';
import {
  Badge,
  Badge,
  Box,
  Button,
  Flex,
  FormControl,
  FormLabel,
  Grid,
  HStack,
  Icon,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Select,
  Spinner,
  Stack,
  Text,
  useDisclosure,
  useToast } from
'@chakra-ui/react';
import { DownloadIcon, LayersIcon, PackageIcon, PlusIcon, Trash2Icon } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { StatusBadge } from '../components/ui/StatusBadge';
import { EmptyState } from '../components/ui/EmptyState';
import { FormDrawer } from '../components/ui/FormDrawer';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { exportToCsv } from '../lib/crud';

type Product = {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  variants: number;
  status: string;
  description: string;
  image_url: string;
};

const categories = ['All', 'Platform', 'Add-on', 'Service', 'License'];
const CATEGORY_OPTIONS = ['Platform', 'Add-on', 'Service', 'License'];

export function Products() {
  const toast = useToast();
  const { session } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('All');
  const [search, setSearch] = useState('');
  const formDrawer = useDisclosure();
  const [editing, setEditing] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);
  const [detailProduct, setDetailProduct] = useState<Product | null>(null);
  const detailModal = useDisclosure();
  const [form, setForm] = useState({ name: '', category: 'Platform', price: 0, stock: 0, variants: 1, description: '', image_url: '' });

  const load = useCallback(async () => {
    if (!session?.user) return;
    setLoading(true);
    const { data } = await supabase.from('products').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false });
    setProducts((data ?? []) as Product[]);
    setLoading(false);
  }, [session]);

  useEffect(() => { load(); }, [load]);

  const filtered = products
    .filter((p) => category === 'All' || p.category === category)
    .filter((p) => !search || p.name.toLowerCase().includes(search.toLowerCase()));

  const computeStatus = (stock: number): string => stock === 0 ? 'Out of stock' : stock <= 15 ? 'Low stock' : 'In stock';

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', category: 'Platform', price: 0, stock: 0, variants: 1, description: '', image_url: '' });
    formDrawer.onOpen();
  };

  const openEdit = (product: Product) => {
    setEditing(product);
    setForm({ name: product.name, category: product.category, price: product.price, stock: product.stock, variants: product.variants, description: product.description, image_url: product.image_url });
    formDrawer.onOpen();
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) { toast({ title: 'Name is required', status: 'error', duration: 2000, position: 'top-right' }); return; }
    setSaving(true);
    const status = computeStatus(Number(form.stock));
    if (editing) {
      const { error } = await supabase.from('products').update({
        name: form.name, category: form.category, price: Number(form.price), stock: Number(form.stock),
        variants: Number(form.variants), status, description: form.description, image_url: form.image_url
      }).eq('id', editing.id).eq('user_id', session!.user.id);
      if (!error) toast({ title: 'Product updated', status: 'success', duration: 2000, position: 'top-right' });
    } else {
      const { error } = await supabase.from('products').insert({
        user_id: session!.user.id, name: form.name, category: form.category, price: Number(form.price),
        stock: Number(form.stock), variants: Number(form.variants), status, description: form.description, image_url: form.image_url
      });
      if (!error) toast({ title: 'Product created', status: 'success', duration: 2000, position: 'top-right' });
    }
    setSaving(false);
    formDrawer.onClose();
    load();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('products').delete().eq('id', id).eq('user_id', session!.user.id);
    if (!error) { toast({ title: 'Product deleted', status: 'success', duration: 1800, position: 'top-right' }); load(); }
  };

  const handleExport = () => {
    exportToCsv('products.csv', filtered.map((p) => ({ name: p.name, category: p.category, price: p.price, stock: p.stock, variants: p.variants, status: p.status })));
    toast({ title: 'Exported to CSV', status: 'success', duration: 1800, position: 'top-right' });
  };

  return (
    <>
      <PageHeader
        title="Products"
        subtitle="Catalog, pricing, and inventory."
        actions={
          <HStack spacing="6px">
            <Button size="sm" variant="outline" borderColor="app.border" borderRadius="9px" fontSize="12px" leftIcon={<DownloadIcon size={14} />} onClick={handleExport}>Export</Button>
            <Button size="sm" borderRadius="9px" bg="navy.600" color="white" _hover={{ bg: 'navy.500' }} leftIcon={<PlusIcon size={15} />} fontSize="12px" onClick={openCreate}>New product</Button>
          </HStack>
        } />

      <Flex gap="7px" mb="16px" flexWrap="wrap" align="center">
        {categories.map((cat) => (
          <Button key={cat} size="xs" borderRadius="full" variant={category === cat ? 'solid' : 'outline'} bg={category === cat ? 'navy.600' : 'transparent'} color={category === cat ? 'white' : 'app.subtle'} borderColor="app.border" _hover={{ bg: category === cat ? 'navy.500' : 'app.surfaceAlt' }} fontSize="11px" onClick={() => setCategory(cat)}>{cat}</Button>
        ))}
        <Input maxW="220px" size="sm" ml="auto" placeholder="Search products..." value={search} onChange={(e) => setSearch(e.target.value)} borderRadius="9px" bg="app.surfaceAlt" borderColor="app.border" fontSize="12px" />
      </Flex>

      {loading ? (
        <Flex py="60px" justify="center"><Spinner color="brand.500" /></Flex>
      ) : filtered.length === 0 ? (
        <Card><EmptyState icon={PackageIcon} title="No products found" description="Create a new product to add to your catalog." action={<Button size="sm" bg="navy.600" color="white" borderRadius="9px" fontSize="12px" leftIcon={<PlusIcon size={15} />} onClick={openCreate}>New product</Button>} /></Card>
      ) : (
        <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)', xl: 'repeat(3, 1fr)' }} gap="14px">
          {filtered.map((product) => (
            <Card key={product.id} p="18px" cursor="pointer" _hover={{ transform: 'translateY(-2px)' }} transition="transform .12s ease" onClick={() => { setDetailProduct(product); detailModal.onOpen(); }}>
              <Flex align="center" justify="space-between">
                <Flex w="40px" h="40px" align="center" justify="center" borderRadius="12px" bg="app.surfaceAlt">
                  <Icon as={PackageIcon} boxSize="19px" color="#e9683f" />
                </Flex>
                <StatusBadge status={product.status} />
              </Flex>
              <Text mt="14px" fontSize="15px" fontWeight="700">{product.name}</Text>
              <Text fontSize="11px" color="app.subtle">{product.category}</Text>
              {product.description && <Text mt="6px" fontSize="11px" color="app.faint" noOfLines={2}>{product.description}</Text>}
              <Flex mt="15px" pt="13px" borderTop="1px solid" borderColor="app.border" align="center">
                <Box>
                  <Text fontSize="10px" color="app.faint">Price</Text>
                  <Text fontSize="16px" fontWeight="800">${product.price.toLocaleString()}</Text>
                </Box>
                <Flex ml="auto" align="center" gap="4px" color="app.subtle">
                  <Icon as={LayersIcon} boxSize="13px" />
                  <Text fontSize="11px">{product.variants} variants</Text>
                </Flex>
              </Flex>
              <Flex mt="6px" align="center" justify="space-between">
                <Text fontSize="10px" color="app.faint">Stock: {product.stock}</Text>
                <Button size="xs" variant="ghost" color="#c23c3c" onClick={(e) => { e.stopPropagation(); handleDelete(product.id); }}><Trash2Icon size={13} /></Button>
              </Flex>
            </Card>
          ))}
        </Grid>
      )}

      <FormDrawer isOpen={formDrawer.isOpen} onClose={formDrawer.onClose} title={editing ? 'Edit product' : 'New product'} subtitle={editing ? 'Update product details' : 'Add a product to your catalog'} loading={saving} onSubmit={handleSubmit} submitLabel={editing ? 'Update' : 'Create'}>
        <FormControl>
          <FormLabel fontSize="12px">Name</FormLabel>
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Growth Suite" size="sm" borderRadius="9px" borderColor="app.border" fontSize="13px" />
        </FormControl>
        <FormControl>
          <FormLabel fontSize="12px">Category</FormLabel>
          <Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} size="sm" borderRadius="9px" borderColor="app.border" fontSize="13px">
            {CATEGORY_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
          </Select>
        </FormControl>
        <FormControl>
          <FormLabel fontSize="12px">Price ($)</FormLabel>
          <Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} size="sm" borderRadius="9px" borderColor="app.border" fontSize="13px" />
        </FormControl>
        <FormControl>
          <FormLabel fontSize="12px">Stock</FormLabel>
          <Input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })} size="sm" borderRadius="9px" borderColor="app.border" fontSize="13px" />
        </FormControl>
        <FormControl>
          <FormLabel fontSize="12px">Variants</FormLabel>
          <Input type="number" value={form.variants} onChange={(e) => setForm({ ...form, variants: Number(e.target.value) })} size="sm" borderRadius="9px" borderColor="app.border" fontSize="13px" />
        </FormControl>
        <FormControl>
          <FormLabel fontSize="12px">Description</FormLabel>
          <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Product description..." size="sm" borderRadius="9px" borderColor="app.border" fontSize="13px" />
        </FormControl>
        <FormControl>
          <FormLabel fontSize="12px">Image URL</FormLabel>
          <Input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} placeholder="https://..." size="sm" borderRadius="9px" borderColor="app.border" fontSize="13px" />
        </FormControl>
      </FormDrawer>

      {/* Floating product detail modal */}
      <Modal isOpen={detailModal.isOpen} onClose={detailModal.onClose} size="md" isCentered>
        <ModalOverlay backdropFilter="blur(4px)" />
        <ModalContent bg="app.surface" borderRadius="18px" overflow="hidden">
          <ModalHeader borderBottom="1px solid" borderColor="app.border" pb="14px">
            {detailProduct && (
              <Flex align="center" gap="10px">
                <Flex w="36px" h="36px" align="center" justify="center" borderRadius="10px" bg="app.surfaceAlt">
                  <Icon as={PackageIcon} boxSize="18px" color="#e9683f" />
                </Flex>
                <Text fontFamily="'Plus Jakarta Sans', sans-serif" fontWeight="800" fontSize="16px">{detailProduct.name}</Text>
              </Flex>
            )}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody py="18px">
            {detailProduct && (
              <Stack spacing="14px">
                <Flex gap="8px" flexWrap="wrap">
                  <StatusBadge status={detailProduct.status} />
                  <Badge fontSize="9px" borderRadius="full" px="8px" py="2px" bg="app.surfaceAlt" color="app.subtle">{detailProduct.category}</Badge>
                </Flex>
                <Grid templateColumns="1fr 1fr" gap="10px">
                  <Box p="14px" bg="app.surfaceAlt" borderRadius="12px">
                    <Text fontSize="10px" color="app.faint">Price</Text>
                    <Text mt="4px" fontSize="18px" fontWeight="800">${detailProduct.price.toLocaleString()}</Text>
                  </Box>
                  <Box p="14px" bg="app.surfaceAlt" borderRadius="12px">
                    <Text fontSize="10px" color="app.faint">Stock</Text>
                    <Text mt="4px" fontSize="18px" fontWeight="800">{detailProduct.stock}</Text>
                  </Box>
                </Grid>
                <Grid templateColumns="1fr 1fr" gap="10px">
                  <Box><Text fontSize="10px" color="app.faint">Variants</Text><Text fontSize="12px" fontWeight="600">{detailProduct.variants}</Text></Box>
                  <Box><Text fontSize="10px" color="app.faint">Category</Text><Text fontSize="12px" fontWeight="600">{detailProduct.category}</Text></Box>
                </Grid>
                {detailProduct.description && (
                  <Box p="14px" bg="app.surfaceAlt" borderRadius="12px">
                    <Text fontSize="10px" color="app.faint" mb="4px">DESCRIPTION</Text>
                    <Text fontSize="12px" color="app.subtle" lineHeight="1.5">{detailProduct.description}</Text>
                  </Box>
                )}
                {detailProduct.image_url && (
                  <Box p="14px" bg="app.surfaceAlt" borderRadius="12px">
                    <Text fontSize="10px" color="app.faint" mb="4px">IMAGE</Text>
                    <Text fontSize="11px" color="app.subtle" noOfLines={1}>{detailProduct.image_url}</Text>
                  </Box>
                )}
                <Flex gap="8px" pt="4px">
                  <Button size="sm" flex="1" bg="navy.600" color="white" _hover={{ bg: 'navy.500' }} borderRadius="9px" fontSize="12px" onClick={() => { detailModal.onClose(); openEdit(detailProduct); }}>Edit product</Button>
                  <Button size="sm" flex="1" variant="outline" borderColor="#c23c3c" color="#c23c3c" borderRadius="9px" fontSize="12px" leftIcon={<Trash2Icon size={13} />} onClick={() => { handleDelete(detailProduct.id); detailModal.onClose(); }}>Delete</Button>
                </Flex>
              </Stack>
            )}
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
}
