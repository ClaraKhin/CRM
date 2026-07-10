import { extendTheme, type ThemeConfig } from '@chakra-ui/react';

const config: ThemeConfig = {
  initialColorMode: 'light',
  useSystemColorMode: false
};

export const theme = extendTheme({
  config,
  fonts: {
    heading: "'Plus Jakarta Sans', sans-serif",
    body: "'DM Sans', sans-serif"
  },
  semanticTokens: {
    colors: {
      'app.bg': { default: '#f6f7fb', _dark: '#0f1523' },
      'app.surface': { default: '#ffffff', _dark: '#182033' },
      'app.surfaceAlt': { default: '#f8f9fc', _dark: '#121a2b' },
      'app.border': { default: '#edf0f5', _dark: 'rgba(255,255,255,0.08)' },
      'app.text': { default: '#1d273d', _dark: '#e7eaf2' },
      'app.subtle': { default: '#6b7488', _dark: '#98a2b8' },
      'app.faint': { default: '#98a1b2', _dark: '#6c778e' },
      'app.navy': { default: '#202a44', _dark: '#1a2butt' },
      'brand.500': { default: '#e9683f', _dark: '#ff7d52' }
    }
  },
  colors: {
    brand: {
      50: '#fff2ec',
      100: '#ffe0d4',
      200: '#ffc3ab',
      300: '#ff9c76',
      400: '#f47a4b',
      500: '#e9683f',
      600: '#d3521f',
      700: '#a94018'
    },
    navy: {
      500: '#2b385b',
      600: '#202a44',
      700: '#182033'
    }
  },
  styles: {
    global: {
      body: {
        fontFamily: "'DM Sans', sans-serif",
        bg: 'app.bg',
        color: 'app.text'
      }
    }
  }
});