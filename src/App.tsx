/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ReactNode } from 'react';
import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
const ClientView = lazy(() => import('./pages/ClientView').then(m => ({ default: m.ClientView })));
const BarberDashboard = lazy(() => import('./pages/BarberDashboard').then(m => ({ default: m.BarberDashboard })));
const Login = lazy(() => import('./pages/Login').then(m => ({ default: m.Login })));
import { ScissorsLoading } from './components/ScissorsLoading';
import { AppProvider } from './contexts/AppContext';
import { useAuth } from './hooks/useAuth';

function RequireAdmin({ children }: { children: ReactNode }) {
  const { user, canAccessDashboard, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <ScissorsLoading />
      </div>
    );
  }

  if (!user || !canAccessDashboard) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, x: 10 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -10 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
      >
        <Routes location={location}>
          <Route path="/" element={<ClientView />} />
          <Route path="/login" element={<Login />} />
          <Route
            path="/barber"
            element={
              <RequireAdmin>
                <BarberDashboard />
              </RequireAdmin>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)] selection:bg-[var(--color-primary)]/30 selection:text-[var(--color-primary)]">
          <Suspense
            fallback={
              <div className="min-h-screen bg-[var(--color-bg)] flex items-center justify-center">
                <ScissorsLoading />
              </div>
            }
          >
            <AnimatedRoutes />
          </Suspense>
        </div>
      </AppProvider>
    </BrowserRouter>
  );
}
