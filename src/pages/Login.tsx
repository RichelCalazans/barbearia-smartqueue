import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Scissors, LogIn, AlertCircle } from 'lucide-react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { signIn, signInWithGoogle } from '../firebase';
import { useAuth } from '../hooks/useAuth';

const GOOGLE_LOGIN_TIMEOUT_MS = 10_000;

export function Login() {
  const navigate = useNavigate();
  const { user, canAccessDashboard, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [googleTimedOut, setGoogleTimedOut] = useState(false);

  useEffect(() => {
    if (user && canAccessDashboard) {
      navigate('/barber', { replace: true });
    }
  }, [user, canAccessDashboard, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Preencha email e senha');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await signIn(email, password);
    } catch (err: any) {
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        setError('Email ou senha incorretos');
      } else {
        setError(err.message || 'Erro ao fazer login');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    setSubmitting(true);
    setError(null);
    setGoogleTimedOut(false);

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('google-login-timeout')), GOOGLE_LOGIN_TIMEOUT_MS);
    });

    try {
      await Promise.race([signInWithGoogle(), timeoutPromise]);
    } catch (err: any) {
      if (err.message === 'google-login-timeout') {
        setGoogleTimedOut(true);
        setError('O login com Google demorou demais. Tente novamente.');
      } else if (err.code !== 'auth/popup-closed-by-user') {
        setError(err.message || 'Erro ao entrar com Google');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (user && canAccessDashboard) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center p-4 sm:p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md space-y-7 text-center"
      >
        <div className="space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-brand to-brand-dark shadow-2xl shadow-brand/20 rotate-12 sm:h-20 sm:w-20">
            <Scissors className="h-8 w-8 text-white sm:h-10 sm:w-10" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tighter text-[#F1F5F9]">SmartQueue</h1>
            <p className="text-[#64748B] font-medium uppercase tracking-[0.2em] text-xs">Acesso Administrativo</p>
          </div>
        </div>

        <Card className="p-5 sm:p-8">
          <form onSubmit={handleLogin} className="space-y-5 sm:space-y-6">
            <p className="text-[#64748B] text-sm leading-relaxed">
              Para gerenciar a agenda e os atendimentos, faça login com suas credenciais.
            </p>

            {error && (
              <div className="p-4 rounded-xl bg-[#EF4444]/10 border border-[#EF4444]/20 text-[#EF4444] text-sm flex items-center gap-3 text-left">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            {user && !canAccessDashboard && (
              <div className="p-4 rounded-xl bg-[#F59E0B]/10 border border-[#F59E0B]/20 text-[#F59E0B] text-sm flex items-center gap-3 text-left">
                <AlertCircle className="h-4 w-4 shrink-0" />
                Sua conta ({user.email}) não tem permissão para acessar o painel.
              </div>
            )}

            <Input
              label="Email"
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <Input
              label="Senha"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <Button
              type="submit"
              className="h-12 w-full font-bold sm:h-14 sm:text-lg"
              loading={submitting || loading}
            >
              <LogIn className="mr-2 h-5 w-5" /> Entrar
            </Button>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-[#1E1E1E]" />
              <span className="text-xs text-[#64748B] uppercase tracking-widest">ou</span>
              <div className="flex-1 h-px bg-[#1E1E1E]" />
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full h-12 font-medium"
              onClick={handleGoogleLogin}
              loading={submitting || loading}
            >
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              {googleTimedOut ? 'Tentar novamente com Google' : 'Entrar com Google'}
            </Button>
          </form>
        </Card>

        <footer className="pt-8">
          <Button variant="ghost" className="text-[#64748B]" onClick={() => navigate('/')}>
            Voltar para Visão do Cliente
          </Button>
        </footer>
      </motion.div>
    </div>
  );
}
