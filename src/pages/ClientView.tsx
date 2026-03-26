import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Scissors, User, Phone, CheckCircle2, XCircle, Clock, AlertCircle } from 'lucide-react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { ServiceChip } from '../components/ServiceChip';
import { ScissorsLoading } from '../components/ScissorsLoading';
import { ClientService } from '../services/ClientService';
import { ServiceService } from '../services/ServiceService';
import { QueueService } from '../services/QueueService';
import { ConfigService } from '../services/ConfigService';
import { Service, QueueItem, AppConfig, AppState } from '../types';
import { cn } from '../utils';

export function ClientView() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [state, setState] = useState<AppState | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [dataNascimento, setDataNascimento] = useState('');
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [isNewClient, setIsNewClient] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let configLoaded = false;
    let stateLoaded = false;

    const checkLoaded = () => {
      if (configLoaded && stateLoaded) {
        setLoading(false);
      }
    };

    const unsubConfig = ConfigService.onConfigChange((c) => {
      setConfig(c);
      configLoaded = true;
      checkLoaded();
    });

    const unsubState = ConfigService.onStateChange((s) => {
      setState(s);
      stateLoaded = true;
      checkLoaded();
    });
    
    ServiceService.listActive().then(setServices);
    
    // Fallback timeout in case documents don't exist
    const timeout = setTimeout(() => {
      setLoading(false);
    }, 3000);

    return () => {
      unsubConfig();
      unsubState();
      clearTimeout(timeout);
    };
  }, []);

  const handleCheckClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!telefone || telefone.length < 10) return;

    setSubmitting(true);
    setError(null);
    try {
      const client = await ClientService.findByTelefone(telefone);
      if (client) {
        setNome(client.nome);
        setDataNascimento(client.dataNascimento || '');
        setIsNewClient(false);
        setStep(4); // Go to confirmation
      } else {
        setIsNewClient(true);
        setStep(3); // Go to registration
      }
    } catch (err: any) {
      console.error('Error checking client:', err);
      let message = 'Erro ao verificar cadastro';
      try {
        const parsed = JSON.parse(err.message);
        message = parsed.error || message;
      } catch {
        message = err.message || message;
      }
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleJoinQueue = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!nome || !telefone || selectedServices.length === 0 || !config) {
      setError('Por favor, preencha todos os campos e selecione ao menos um serviço.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const { client } = await ClientService.findOrCreate(nome, telefone, dataNascimento);
      const chosenServices = services.filter(s => selectedServices.includes(s.id));
      const ticketId = await QueueService.addToQueue(client, chosenServices, config);
      
      localStorage.setItem('sq_ticket_id', ticketId);
      window.location.reload();
    } catch (err: any) {
      console.error('Error joining queue:', err);
      let message = 'Erro ao entrar na fila';
      try {
        const parsed = JSON.parse(err.message);
        message = parsed.error || message;
      } catch {
        message = err.message || message;
      }
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center"><ScissorsLoading /></div>;

  if (!state?.agendaAberta) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] p-6 flex flex-col items-center justify-center text-center space-y-6">
        <div className="h-24 w-24 rounded-full bg-[#111111] border border-[#1E1E1E] flex items-center justify-center">
          <AlertCircle className="h-10 w-10 text-[#64748B]" />
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tighter text-[#F1F5F9]">Agenda Fechada</h1>
          <p className="text-[#64748B] max-w-xs mx-auto">
            O barbeiro ainda não liberou a agenda para hoje. Tente novamente em instantes.
          </p>
        </div>
        <Button variant="secondary" onClick={() => window.location.reload()}>
          Atualizar Página
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] p-6 pb-24">
      <header className="mb-10 space-y-1">
        <h1 className="text-sm font-bold uppercase tracking-[0.2em] text-[#00D4A5]">
          {config?.SHOP_NAME || 'SmartQueue'}
        </h1>
        <p className="text-2xl font-bold tracking-tight text-[#F1F5F9]">
          Reserve seu lugar
        </p>
      </header>

      <main className="max-w-md mx-auto space-y-8">
        <Card className="space-y-8">
          {error && (
            <div className="p-4 rounded-xl bg-[#EF4444]/10 border border-[#EF4444]/20 text-[#EF4444] text-sm flex items-center gap-3 mb-4">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <div className="space-y-4">
                  <label className="text-sm font-medium text-[#64748B] ml-1">
                    Qual dia você quer cortar?
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="flex-1 p-4 rounded-xl bg-[#00D4A5]/10 border border-[#00D4A5] text-[#00D4A5] font-bold text-center"
                    >
                      Hoje
                    </button>
                    <button
                      type="button"
                      disabled
                      className="flex-1 p-4 rounded-xl bg-[#111111] border border-[#1E1E1E] text-[#64748B] text-center opacity-50 cursor-not-allowed"
                    >
                      Em breve...
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-sm font-medium text-[#64748B] ml-1">
                    O que vamos fazer hoje?
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {services.map((service) => (
                      <ServiceChip
                        key={service.id}
                        label={service.nome}
                        selected={selectedServices.includes(service.id)}
                        onClick={() => {
                          setSelectedServices(prev =>
                            prev.includes(service.id)
                              ? prev.filter(id => id !== service.id)
                              : [...prev, service.id]
                          );
                        }}
                      />
                    ))}
                  </div>
                </div>
                <Button
                  onClick={() => setStep(2)}
                  className="w-full h-14 text-lg font-bold"
                  disabled={selectedServices.length === 0}
                >
                  Próximo
                </Button>
              </motion.div>
            )}

            {step === 2 && (
              <motion.form
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                onSubmit={handleCheckClient}
                className="space-y-8"
              >
                <div className="space-y-4">
                  <Input
                    label="Seu WhatsApp"
                    placeholder="(00) 00000-0000"
                    value={telefone}
                    onChange={(e) => setTelefone(e.target.value.replace(/\D/g, ''))}
                    required
                  />
                </div>
                <div className="flex gap-3">
                  <Button variant="ghost" onClick={() => setStep(1)} className="flex-1">Voltar</Button>
                  <Button
                    type="submit"
                    className="flex-[2] h-14 text-lg font-bold"
                    loading={submitting}
                    disabled={telefone.length < 10}
                  >
                    Continuar
                  </Button>
                </div>
              </motion.form>
            )}

            {step === 3 && (
              <motion.form
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                onSubmit={handleJoinQueue}
                className="space-y-8"
              >
                <div className="space-y-4">
                  <p className="text-sm text-[#64748B] mb-4">
                    Parece que é sua primeira vez! Complete seu cadastro:
                  </p>
                  <Input
                    label="Nome Completo"
                    placeholder="Ex: João Silva"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    required
                  />
                  <Input
                    label="Data de Nascimento"
                    type="date"
                    value={dataNascimento}
                    onChange={(e) => setDataNascimento(e.target.value)}
                    required
                  />
                </div>
                <div className="flex gap-3">
                  <Button variant="ghost" onClick={() => setStep(2)} className="flex-1">Voltar</Button>
                  <Button type="submit" className="flex-[2] h-14 font-bold" loading={submitting}>Entrar na Fila</Button>
                </div>
              </motion.form>
            )}

            {step === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <div className="space-y-4 text-center">
                  <div className="h-20 w-20 rounded-full bg-[#00D4A5]/10 flex items-center justify-center mx-auto mb-4">
                    <User className="h-10 w-10 text-[#00D4A5]" />
                  </div>
                  <h3 className="text-xl font-bold text-[#F1F5F9]">Bem-vindo de volta, {nome}!</h3>
                  <p className="text-sm text-[#64748B]">
                    Tudo pronto para o seu atendimento. Clique abaixo para confirmar sua entrada na fila.
                  </p>
                </div>
                <div className="flex gap-3">
                  <Button variant="ghost" onClick={() => setStep(2)} className="flex-1">Voltar</Button>
                  <Button 
                    onClick={() => handleJoinQueue()} 
                    className="flex-[2] h-14 font-bold" 
                    loading={submitting}
                  >
                    Confirmar e Entrar
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>

        <footer className="text-center space-y-4">
          <p className="text-xs text-[#64748B] leading-relaxed">
            Ao entrar na fila, você concorda em receber notificações sobre o status do seu atendimento.
          </p>
          <div className="pt-4">
            <Button variant="ghost" size="sm" className="text-[#64748B]/50 hover:text-[#00D4A5]" onClick={() => window.location.href = '/login'}>
              Acesso do Barbeiro
            </Button>
          </div>
        </footer>
      </main>
    </div>
  );
}
