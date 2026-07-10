import React from 'react';
import {
  Avatar,
  Box,
  Divider,
  Flex,
  HStack,
  Icon,
  IconButton,
  Input,
  InputGroup,
  InputLeftElement,
  Menu,
  MenuButton,
  MenuDivider,
  MenuItem,
  MenuList,
  Popover,
  PopoverArrow,
  PopoverBody,
  PopoverContent,
  PopoverHeader,
  PopoverTrigger,
  Text,
  useColorMode } from
'@chakra-ui/react';
import {
  BellIcon,
  LogOutIcon,
  MenuIcon,
  MoonIcon,
  SearchIcon,
  SettingsIcon,
  SunIcon,
  UserIcon } from
'lucide-react';
import { useNavigate } from 'react-router-dom';
const notifications = [
{
  title: 'Maya Patel opened your quote',
  time: '5 min ago',
  dot: '#e9683f'
},
{
  title: 'Deal moved to Negotiation',
  time: '32 min ago',
  dot: '#6b3fd1'
},
{
  title: 'Invoice INV-2203 is overdue',
  time: '1 hr ago',
  dot: '#c23c3c'
}];

export function Topbar({
  onOpenPalette,
  onOpenDrawer



}: {onOpenPalette: () => void;onOpenDrawer: () => void;}) {
  const { colorMode, toggleColorMode } = useColorMode();
  const navigate = useNavigate();
  return (
    <Flex
      as="header"
      h="66px"
      px={{
        base: '14px',
        md: '26px'
      }}
      align="center"
      gap="12px"
      bg="app.surface"
      borderBottom="1px solid"
      borderColor="app.border"
      position="sticky"
      top="0"
      zIndex="sticky"
      backdropFilter="blur(14px)">
      
      <IconButton
        display={{
          base: 'flex',
          lg: 'none'
        }}
        aria-label="Open navigation"
        icon={<MenuIcon size={19} />}
        variant="ghost"
        onClick={onOpenDrawer} />
      

      <InputGroup
        display={{
          base: 'none',
          md: 'block'
        }}
        maxW="420px"
        onClick={onOpenPalette}
        cursor="pointer">
        
        <InputLeftElement pointerEvents="none">
          <SearchIcon size={16} color="#8a93a6" />
        </InputLeftElement>
        <Input
          readOnly
          aria-label="Open command palette"
          placeholder="Search anything..."
          size="sm"
          bg="app.surfaceAlt"
          borderColor="app.border"
          borderRadius="10px"
          fontSize="12px"
          cursor="pointer" />
        
        <Box
          position="absolute"
          right="9px"
          top="6px"
          border="1px solid"
          borderColor="app.border"
          borderRadius="4px"
          px="4px"
          color="app.faint"
          fontSize="9px">
          
          ⌘ K
        </Box>
      </InputGroup>

      <HStack ml="auto" spacing="4px">
        <IconButton
          aria-label="Search"
          display={{
            base: 'flex',
            md: 'none'
          }}
          icon={<SearchIcon size={17} />}
          variant="ghost"
          size="sm"
          onClick={onOpenPalette} />
        
        <IconButton
          aria-label="Toggle color mode"
          icon={
          colorMode === 'dark' ?
          <SunIcon size={17} /> :

          <MoonIcon size={17} />

          }
          variant="ghost"
          size="sm"
          onClick={toggleColorMode} />
        
        <Popover placement="bottom-end">
          <PopoverTrigger>
            <Box position="relative">
              <IconButton
                aria-label="Notifications"
                icon={<BellIcon size={17} />}
                variant="ghost"
                size="sm" />
              
              <Box
                position="absolute"
                top="6px"
                right="6px"
                w="7px"
                h="7px"
                bg="#e9683f"
                borderRadius="full" />
              
            </Box>
          </PopoverTrigger>
          <PopoverContent bg="app.surface" borderColor="app.border" w="300px">
            <PopoverArrow bg="app.surface" />
            <PopoverHeader border="none" fontWeight="700" fontSize="13px">
              Notifications
            </PopoverHeader>
            <PopoverBody px="0" pb="8px">
              {notifications.map((n, i) =>
              <Flex
                key={i}
                px="16px"
                py="9px"
                gap="9px"
                _hover={{
                  bg: 'app.surfaceAlt'
                }}>
                
                  <Box
                  mt="5px"
                  w="7px"
                  h="7px"
                  borderRadius="full"
                  bg={n.dot}
                  flexShrink={0} />
                
                  <Box>
                    <Text fontSize="12px" fontWeight="600">
                      {n.title}
                    </Text>
                    <Text fontSize="10px" color="app.subtle">
                      {n.time}
                    </Text>
                  </Box>
                </Flex>
              )}
            </PopoverBody>
          </PopoverContent>
        </Popover>

        <Menu placement="bottom-end">
          <MenuButton ml="2px">
            <Avatar
              size="sm"
              name="Renee Walker"
              bg="#ffdccb"
              color="#b6451e"
              fontSize="11px"
              cursor="pointer" />
            
          </MenuButton>
          <MenuList bg="app.surface" borderColor="app.border">
            <Box px="12px" py="6px">
              <Text fontSize="13px" fontWeight="700">
                Renee Walker
              </Text>
              <Text fontSize="11px" color="app.subtle">
                Sales Manager
              </Text>
            </Box>
            <MenuDivider />
            <MenuItem
              bg="app.surface"
              icon={<UserIcon size={15} />}
              fontSize="13px"
              onClick={() => navigate('/settings')}>
              
              Profile
            </MenuItem>
            <MenuItem
              bg="app.surface"
              icon={<SettingsIcon size={15} />}
              fontSize="13px"
              onClick={() => navigate('/settings')}>
              
              Settings
            </MenuItem>
            <MenuDivider />
            <MenuItem
              bg="app.surface"
              icon={<LogOutIcon size={15} />}
              fontSize="13px"
              color="#c23c3c">
              
              Sign out
            </MenuItem>
          </MenuList>
        </Menu>
      </HStack>
    </Flex>);

}