import React from 'react';
import {
  Box,
  FormControl,
  FormErrorMessage,
  FormLabel,
  Input,
  InputGroup,
  InputLeftElement,
  InputRightElement,
  IconButton,
  useDisclosure
} from '@chakra-ui/react';
import { EyeIcon, EyeOffIcon, type LucideIcon } from 'lucide-react';

type AuthFieldProps = {
  label: string;
  name: string;
  type?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur?: () => void;
  placeholder?: string;
  icon?: LucideIcon;
  error?: string;
  isRequired?: boolean;
  autoComplete?: string;
  rightElement?: React.ReactNode;
};

export function AuthField({
  label,
  name,
  type = 'text',
  value,
  onChange,
  onBlur,
  placeholder,
  icon: Icon,
  error,
  isRequired,
  autoComplete,
  rightElement
}: AuthFieldProps) {
  const { isOpen, onToggle } = useDisclosure();
  const isPassword = type === 'password';
  const inputType = isPassword ? (isOpen ? 'text' : 'password') : type;

  return (
    <FormControl isInvalid={!!error} isRequired={isRequired}>
      <FormLabel fontSize="12px" fontWeight="600" mb="6px">
        {label}
      </FormLabel>
      <InputGroup>
        {Icon && (
          <InputLeftElement pointerEvents="none" h="42px" pl="10px">
            <Icon size={16} color="#8a93a6" />
          </InputLeftElement>
        )}
        <Input
          id={name}
          name={name}
          type={inputType}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          placeholder={placeholder}
          autoComplete={autoComplete}
          h="42px"
          borderRadius="10px"
          bg="app.surfaceAlt"
          borderColor={error ? '#c23c3c' : 'app.border'}
          fontSize="13px"
          pl={Icon ? '36px' : '14px'}
          pr={isPassword || rightElement ? '42px' : '14px'}
          _focus={{ borderColor: 'brand.500', boxShadow: '0 0 0 3px rgba(233,104,63,0.12)' }}
        />
        {isPassword && (
          <InputRightElement h="42px" pr="6px">
            <IconButton
              aria-label={isOpen ? 'Hide password' : 'Show password'}
              icon={isOpen ? <EyeOffIcon size={16} /> : <EyeIcon size={16} />}
              variant="ghost"
              size="sm"
              onClick={onToggle}
              color="app.faint"
            />
          </InputRightElement>
        )}
        {rightElement && !isPassword && (
          <InputRightElement h="42px" pr="6px">
            {rightElement}
          </InputRightElement>
        )}
      </InputGroup>
      {error && <FormErrorMessage fontSize="11px">{error}</FormErrorMessage>}
    </FormControl>
  );
}

export function AuthFormBox({ children }: { children: React.ReactNode }) {
  return <Box display="flex" flexDirection="column" gap="16px">{children}</Box>;
}
