import React from 'react';
import { ChakraProvider, ColorModeScript } from '@chakra-ui/react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { theme } from './theme';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { AppShell } from './components/layout/AppShell';
import { Dashboard } from './pages/Dashboard';
import { Leads } from './pages/Leads';
import { Pipeline } from './pages/Pipeline';
import { Customers } from './pages/Customers';
import { Products } from './pages/Products';
import { Quotes } from './pages/Quotes';
import { Invoices } from './pages/Invoices';
import { Payments } from './pages/sales/Payments';
import { Tasks } from './pages/Tasks';
import { Calendar } from './pages/Calendar';
import { Reports } from './pages/Reports';
import { Assistant } from './pages/Assistant';
import { Automation } from './pages/Automation';
import { Settings } from './pages/Settings';
import { LeadScoring } from './pages/LeadScoring';
import { UserManagement } from './pages/UserManagement';
import { RoleManagement } from './pages/RoleManagement';
import { Documents } from './pages/Documents';
import { AuditLogs } from './pages/AuditLogs';
import { ActivityTimelinePage } from './pages/ActivityTimelinePage';
import { NotFound } from './pages/NotFound';
import { Login } from './pages/auth/Login';
import { SignUp } from './pages/auth/SignUp';
import { ForgotPassword } from './pages/auth/ForgotPassword';
import { ResetPassword } from './pages/auth/ResetPassword';
import { VerifyEmail } from './pages/auth/VerifyEmail';

function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
  const { session, loading, pending2FA } = useAuth();
  if (loading || pending2FA) return <>{children}</>;
  if (session) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export function App() {
  return (
    <>
      <ColorModeScript initialColorMode={theme.config.initialColorMode} />
      <ChakraProvider theme={theme}>
        <ErrorBoundary>
          <AuthProvider>
            <BrowserRouter>
              <Routes>
                {/* Public auth routes — redirect to app if already signed in */}
                <Route path="/login" element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />
                <Route path="/signup" element={<PublicOnlyRoute><SignUp /></PublicOnlyRoute>} />
                <Route path="/forgot-password" element={<PublicOnlyRoute><ForgotPassword /></PublicOnlyRoute>} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/verify-email" element={<VerifyEmail />} />

                {/* Protected app routes */}
                <Route
                  element={
                    <ProtectedRoute>
                      <AppShell />
                    </ProtectedRoute>
                  }>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/leads" element={<Leads />} />
                  <Route path="/pipeline" element={<Pipeline />} />
                  <Route path="/customers" element={<Customers />} />
                  <Route path="/products" element={<Products />} />
                  <Route path="/quotes" element={<Quotes />} />
                  <Route path="/invoices" element={<Invoices />} />
                  <Route path="/payments" element={<Payments />} />
                  <Route path="/tasks" element={<Tasks />} />
                  <Route path="/calendar" element={<Calendar />} />
                  <Route path="/reports" element={<Reports />} />
                  <Route path="/assistant" element={<Assistant />} />
                  <Route path="/automation" element={<Automation />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/lead-scoring" element={<LeadScoring />} />
                  <Route path="/users" element={<UserManagement />} />
                  <Route path="/roles" element={<RoleManagement />} />
                  <Route path="/documents" element={<Documents />} />
                  <Route path="/audit-logs" element={<AuditLogs />} />
                  <Route path="/activity" element={<ActivityTimelinePage />} />
                  <Route path="*" element={<NotFound />} />
                </Route>
              </Routes>
            </BrowserRouter>
          </AuthProvider>
        </ErrorBoundary>
      </ChakraProvider>
    </>
  );
}
