import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Flex,
  Icon,
  Input,
  InputGroup,
  InputLeftElement,
  Kbd,
  Modal,
  ModalBody,
  ModalContent,
  ModalOverlay,
  Text } from
'@chakra-ui/react';
import { CornerDownLeftIcon, SearchIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { navItems } from './navConfig';
export function CommandPalette({
  isOpen,
  onClose



}: {isOpen: boolean;onClose: () => void;}) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return navItems;
    return navItems.filter((i) => i.label.toLowerCase().includes(q));
  }, [query]);
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setActive(0);
    }
  }, [isOpen]);
  useEffect(() => {
    setActive(0);
  }, [query]);
  const select = (index: number) => {
    const item = results[index];
    if (!item) return;
    navigate(item.path);
    onClose();
  };
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      select(active);
    }
  };
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg" isCentered>
      <ModalOverlay bg="blackAlpha.500" backdropFilter="blur(2px)" />
      <ModalContent
        bg="app.surface"
        borderRadius="16px"
        overflow="hidden"
        mt="14vh">
        
        <InputGroup>
          <InputLeftElement pointerEvents="none" h="56px" pl="6px">
            <SearchIcon size={18} color="#8a93a6" />
          </InputLeftElement>
          <Input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search pages and actions..."
            h="56px"
            border="none"
            borderBottom="1px solid"
            borderColor="app.border"
            borderRadius="0"
            fontSize="15px"
            _focusVisible={{
              boxShadow: 'none'
            }} />
          
        </InputGroup>
        <ModalBody px="8px" py="8px" maxH="360px" overflowY="auto">
          {results.length === 0 ?
          <Text px="14px" py="20px" color="app.subtle" fontSize="13px">
              No matches found.
            </Text> :

          results.map((item, index) =>
          <Flex
            key={item.path}
            align="center"
            gap="11px"
            px="12px"
            py="10px"
            borderRadius="10px"
            cursor="pointer"
            bg={index === active ? 'app.surfaceAlt' : 'transparent'}
            onMouseEnter={() => setActive(index)}
            onClick={() => select(index)}>
            
                <Icon as={item.icon} boxSize="17px" color="app.subtle" />
                <Text fontSize="13px" fontWeight="600" flex="1">
                  {item.label}
                </Text>
                {index === active &&
            <Flex align="center" gap="4px" color="app.faint">
                    <Icon as={CornerDownLeftIcon} boxSize="13px" />
                    <Text fontSize="10px">Enter</Text>
                  </Flex>
            }
              </Flex>
          )
          }
        </ModalBody>
        <Flex
          px="16px"
          py="9px"
          borderTop="1px solid"
          borderColor="app.border"
          gap="12px"
          color="app.faint"
          fontSize="10px"
          align="center">
          
          <Flex gap="4px" align="center">
            <Kbd fontSize="9px">↑</Kbd>
            <Kbd fontSize="9px">↓</Kbd> navigate
          </Flex>
          <Flex gap="4px" align="center">
            <Kbd fontSize="9px">esc</Kbd> close
          </Flex>
        </Flex>
      </ModalContent>
    </Modal>);

}