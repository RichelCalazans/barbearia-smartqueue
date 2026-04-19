/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { lazy, Suspense } from 'react';
import type { ComponentType, ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { ScissorsLoading } from './components/ScissorsLoading';
import { Button } from './components/Button';
import { AppProvider } from './contexts/AppContext';
import { useAuth } from './hooks/useAuth';

class RouteErrorBoundary extends React.Component<
  { children: ReactNode },
  { hasError: boolean; message?: string }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, message: undefined };
  }

  static getDerivedStateFromError(error: unknown) {
    const message = error instanceof Error ? error.message : 'Falha ao carregar a página.';
    return { hasError: true, message };
  }

  componentDidCatch(error: unknown) {
    console.error('Route render error:', error);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen bg-[#0A0A0A] px-4 py-8 flex items-center justify-center">
        <div className="max-w-md w-full rounded-2xl border border-[#1E1E1E] bg-[#111111] p-6 space-y-4 text-center">
          <h1 className="text-lg font-bold text-[#F1F5F9]">Não foi possível abrir esta tela</h1>
          <p className="text-sm text-[#64748B]">
            {this.state.message || 'Tente atualizar a página para carregar a versão mais recente.'}
          </p>
          <Button className="w-full" onClick={() => window.location.reload()}>
            Atualizar Página
          </Button>
        </div>
      </div>
    );
  }
}

function isChunkLoadError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return (
    message.includes('failed to fetch dynamically imported module') ||
    message.includes('loading chunk') ||
    message.includes('chunkloaderror')
  );
}

function lazyWithRetry<T extends ComponentType<any>>(
  importer: () => Promise<{ default: T }>,
  retryKey: string
) {
  return lazy(async () => {
    try {
      const mod = await importer();
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem(`lazy-retry:${retryKey}`);
      }
      return mod;
    } catch (error) {
      if (
        typeof window !== 'undefined' &&
        isChunkLoadError(error) &&
        !sessionStorage.getItem(`lazy-retry:${retryKey}`)
      ) {
        sessionStorage.setItem(`lazy-retry:${retryKey}`, '1');
        window.location.reload();
      }
      throw error;
    }
  });
}

const ClientView = lazyWithRetry(
  () => import('./pages/ClientView').then(m => ({ default: m.ClientView })),
  'client-view'
);
const BarberDashboard = lazyWithRetry(
  () => import('./pages/BarberDashboard').then(m => ({ default: m.BarberDashboard })),
  'barber-dashboard'
);
const Login = lazyWithRetry(
  () => import('./pages/Login').then(m => ({ default: m.Login })),
  'login'
);

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
          <RouteErrorBoundary>
            <Suspense
              fallback={
                <div className="min-h-screen bg-[var(--color-bg)] flex items-center justify-center">
                  <ScissorsLoading />
                </div>
              }
            >
              <AnimatedRoutes />
            </Suspense>
          </RouteErrorBoundary>
        </div>
      </AppProvider>
    </BrowserRouter>
  );
}
