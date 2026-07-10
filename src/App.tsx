import React from 'react';
import { ChakraProvider, ColorModeScript } from '@chakra-ui/react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { theme } from './theme';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AppShell } from './components/layout/AppShell';
import { Dashboard } from './pages/Dashboard';
import { Leads } from './pages/Leads';
import { Pipeline } from './pages/Pipeline';
import { Customers } from './pages/Customers';
import { Products } from './pages/Products';
import { Quotes } from './pages/Quotes';
import { Invoices } from './pages/Invoices';
import { Tasks } from './pages/Tasks';
import { Calendar } from './pages/Calendar';
import { Reports } from './pages/Reports';
import { Assistant } from './pages/Assistant';
import { Automation } from './pages/Automation';
import { Settings } from './pages/Settings';
import { NotFound } from './pages/NotFound';
export function App() {
  return (
    <>
      <ColorModeScript initialColorMode={theme.config.initialColorMode} />
      <ChakraProvider theme={theme}>
        <ErrorBoundary>
          <BrowserRouter>
            <Routes>
              <Route element={<AppShell />}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/leads" element={<Leads />} />
                <Route path="/pipeline" element={<Pipeline />} />
                <Route path="/customers" element={<Customers />} />
                <Route path="/products" element={<Products />} />
                <Route path="/quotes" element={<Quotes />} />
                <Route path="/invoices" element={<Invoices />} />
                <Route path="/tasks" element={<Tasks />} />
                <Route path="/calendar" element={<Calendar />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/assistant" element={<Assistant />} />
                <Route path="/automation" element={<Automation />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="*" element={<NotFound />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </ErrorBoundary>
      </ChakraProvider>
    </>);

}