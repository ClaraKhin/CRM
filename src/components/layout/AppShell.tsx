import React, { useCallback, useEffect, useState } from 'react';
import {
  Box,
  Drawer,
  DrawerContent,
  DrawerOverlay,
  Flex,
  useDisclosure } from
'@chakra-ui/react';
import { Outlet } from 'react-router-dom';
import { SidebarNav } from './SidebarNav';
import { Topbar } from './Topbar';
import { CommandPalette } from './CommandPalette';
export function AppShell() {
  const palette = useDisclosure();
  const drawer = useDisclosure();
  const [open, setOpen] = useState(false);
  const togglePalette = useCallback(() => {
    setOpen((prev) => !prev);
  }, []);
  useEffect(() => {
    if (open) palette.onOpen();else
    palette.onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);
  return (
    <Flex minH="100vh" bg="app.bg" color="app.text">
      <Box
        as="aside"
        display={{
          base: 'none',
          lg: 'block'
        }}
        position="fixed"
        zIndex="docked"
        h="100vh"
        w="256px"
        bg="app.surface"
        borderRight="1px solid"
        borderColor="app.border">
        
        <SidebarNav />
      </Box>

      <Drawer isOpen={drawer.isOpen} placement="left" onClose={drawer.onClose}>
        <DrawerOverlay />
        <DrawerContent bg="app.surface" maxW="256px">
          <SidebarNav onNavigate={drawer.onClose} />
        </DrawerContent>
      </Drawer>

      <Box
        ml={{
          base: 0,
          lg: '256px'
        }}
        minW="0"
        flex="1">
        
        <Topbar
          onOpenPalette={() => setOpen(true)}
          onOpenDrawer={drawer.onOpen} />
        
        <Box
          as="main"
          p={{
            base: '16px',
            md: '26px',
            xl: '30px'
          }}
          maxW="1640px"
          mx="auto">
          
          <Outlet />
        </Box>
      </Box>

      <CommandPalette isOpen={palette.isOpen} onClose={() => setOpen(false)} />
    </Flex>);

}