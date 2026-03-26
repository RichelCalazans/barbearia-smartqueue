/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'motion/react';
const ClientView = lazy(() => import('./pages/ClientView').then(m => ({ default: m.ClientView })));
const BarberDashboard = lazy(() => import('./pages/BarberDashboard').then(m => ({ default: m.BarberDashboard })));
const Login = lazy(() => import('./pages/Login').then(m => ({ default: m.Login })));
import { ConfigService } from './services/ConfigService';
import { ServiceService } from './services/ServiceService';
import { ScissorsLoading } from './components/ScissorsLoading';

export default function App() {
  const [loading, setLoading] = useState(true);
  const [path, setPath] = useState(window.location.pathname);

  useEffect(() => {
    const init = async () => {
      try {
        // Initialization moved to BarberDashboard for admin only
      } catch (err) {
        console.error('Initialization error:', err);
      } finally {
        setLoading(false);
      }
    };
    init();

    const handleLocationChange = () => setPath(window.location.pathname);
    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <ScissorsLoading />
      </div>
    );
  }

  const renderPage = () => {
    switch (path) {
      case '/barber':
        return <BarberDashboard />;
      case '/login':
        return <Login />;
      default:
        return <ClientView />;
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#F1F5F9] selection:bg-[#00D4A5]/30 selection:text-[#00D4A5]">
      <Suspense fallback={
        <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
          <ScissorsLoading />
        </div>
      }>
        <AnimatePresence mode="wait">
          <motion.div
            key={path}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            {renderPage()}
          </motion.div>
        </AnimatePresence>
      </Suspense>
    </div>
  );
}
