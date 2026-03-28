import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, CheckCircle2, XCircle, Clock, AlertCircle, Scissors } from 'lucide-react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { ServiceChip } from '../components/ServiceChip';
import { ScissorsLoading } from '../components/ScissorsLoading';
import { ClientService } from '../services/ClientService';
import { ServiceService } from '../services/ServiceService';
import { QueueService } from '../services/QueueService';
import { ConfigService } from '../services/ConfigService';
import { useQueue } from '../hooks/useQueue';
import { Service, QueueItem, AppConfig, AppState } from '../types';

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
  const [error, setError] = useState<string | null>(null);
  const [ticketId, setTicketId] = useState<string | null>(() => localStorage.getItem('sq_ticket_id'));
  const [activeTicket, setActiveTicket] = useState<QueueItem | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const { queue } = useQueue();

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

    const timeout = setTimeout(() => {
      setLoading(false);
    }, 3000);

    return () => {
      unsubConfig();
      unsubState();
      clearTimeout(timeout);
    };
  }, []);

  // Reactive listener: subscribes whenever ticketId changes
  useEffect(() => {
    if (!ticketId) {
      setActiveTicket(null);
      return;
    }
    const unsub = QueueService.onTicketChange(ticketId, (ticket) => {
      if (ticket && (ticket.status === 'AGUARDANDO' || ticket.status === 'EM_ATENDIMENTO')) {
        setActiveTicket(ticket);
      } else {
        localStorage.removeItem('sq_ticket_id');
        setTicketId(null);
        setActiveTicket(null);
      }
    });
    return unsub;
  }, [ticketId]);

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
        setStep(4);
      } else {
        setStep(3);
      }
    } catch (err: any) {
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
      const newTicketId = await QueueService.addToQueue(client, chosenServices, config);
      localStorage.setItem('sq_ticket_id', newTicketId);
      setTicketId(newTicketId);
    } catch (err: any) {
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

  const handleCancel = async () => {
    if (!activeTicket) return;
    setCancelling(true);
    try {
      await QueueService.updateStatus(activeTicket.id, 'CANCELADO');
      localStorage.removeItem('sq_ticket_id');
      setTicketId(null);
    } catch (err) {
      setError('Erro ao cancelar. Tente novamente.');
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <ScissorsLoading />
      </div>
    );
  }

  // === ACTIVE TICKET VIEW ===
  if (activeTicket) {
    const position = queue.findIndex(item => item.id === activeTicket.id) + 1;
    const isInService = activeTicket.status === 'EM_ATENDIMENTO';

    return (
      <div className="min-h-screen bg-[#0A0A0A] p-6 pb-24">
        <header className="mb-10 space-y-1">
          <h1 className="text-sm font-bold uppercase tracking-[0.2em] text-[#00D4A5]">
            {config?.SHOP_NAME || 'SmartQueue'}
          </h1>
          <p className="text-2xl font-bold tracking-tight text-[#F1F5F9]">
            {isInService ? 'É a sua vez!' : 'Você está na fila'}
          </p>
        </header>

        <main className="max-w-md mx-auto space-y-4">
          {error && (
            <div className="p-4 rounded-xl bg-[#EF4444]/10 border border-[#EF4444]/20 text-[#EF4444] text-sm flex items-center gap-3">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <Card className="space-y-6">
            {/* Status badge */}
            <div className={`flex items-center gap-3 p-4 rounded-xl ${
              isInService
                ? 'bg-[#00D4A5]/10 border border-[#00D4A5]/30'
                : 'bg-[#111111] border border-[#1E1E1E]'
            }`}>
              {isInService ? (
                <Scissors className="h-5 w-5 text-[#00D4A5] shrink-0" />
              ) : (
                <Clock className="h-5 w-5 text-[#64748B] shrink-0" />
              )}
              <div>
                <p className="text-xs text-[#64748B] uppercase tracking-wider">Status</p>
                <p className={`font-bold ${isInService ? 'text-[#00D4A5]' : 'text-[#F1F5F9]'}`}>
                  {isInService ? 'Em atendimento agora' : 'Aguardando'}
                </p>
              </div>
            </div>

            {/* Position + time */}
            {!isInService && (
              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 rounded-xl bg-[#111111] border border-[#1E1E1E] text-center">
                  <p className="text-xs text-[#64748B] uppercase tracking-wider mb-1">Posição</p>
                  <p className="text-3xl font-bold text-[#F1F5F9]">{position > 0 ? position : '—'}</p>
                </div>
                <div className="p-4 rounded-xl bg-[#111111] border border-[#1E1E1E] text-center">
                  <p className="text-xs text-[#64748B] uppercase tracking-wider mb-1">Previsão</p>
                  <p className="text-3xl font-bold text-[#F1F5F9]">{activeTicket.horaPrevista}</p>
                </div>
              </div>
            )}

            {/* Client info */}
            <div className="space-y-2">
              <p className="text-xs text-[#64748B] uppercase tracking-wider">Cliente</p>
              <p className="text-[#F1F5F9] font-medium">{activeTicket.clienteNome}</p>
            </div>

            {/* Services */}
            <div className="space-y-2">
              <p className="text-xs text-[#64748B] uppercase tracking-wider">Serviços</p>
              <p className="text-[#F1F5F9]">{activeTicket.servicos}</p>
            </div>

            {/* Estimated time */}
            <div className="space-y-2">
              <p className="text-xs text-[#64748B] uppercase tracking-wider">Tempo estimado</p>
              <p className="text-[#F1F5F9]">{activeTicket.tempoEstimado} min</p>
            </div>

            {/* Cancel button */}
            {!isInService && (
              <Button
                variant="ghost"
                className="w-full text-[#EF4444] hover:text-[#EF4444] border border-[#EF4444]/20 hover:bg-[#EF4444]/10"
                onClick={handleCancel}
                loading={cancelling}
              >
                Cancelar minha vez
              </Button>
            )}
          </Card>

          <p className="text-center text-xs text-[#64748B] leading-relaxed">
            Fique por perto. Atualizamos em tempo real.
          </p>
        </main>
      </div>
    );
  }

  // === AGENDA CLOSED ===
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

  // === BOOKING FORM ===
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
