import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { User, Clock, AlertCircle, Scissors, Calendar, MessageCircle } from 'lucide-react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { ServiceChip } from '../components/ServiceChip';
import { ScissorsLoading } from '../components/ScissorsLoading';
import { BarberStatusBanner } from '../components/BarberStatusBanner';
import { ClientService } from '../services/ClientService';
import { NotificationService } from '../services/NotificationService';
import { ServiceService } from '../services/ServiceService';
import { QueueService } from '../services/QueueService';
import { ConfigService } from '../services/ConfigService';
import { useQueue } from '../hooks/useQueue';
import { useApp } from '../contexts/AppContext';
import { Service, QueueItem, AppConfig, AppState, Client } from '../types';
import { getAvailableDates, getScheduleForDate } from '../utils';
import {
  validateNome,
  validateTelefone,
  validateDataNascimento,
  validateDataAgendamento,
} from '../validation';

function ShopLogo({ url, name, invert }: { url?: string; name: string; invert?: boolean }) {
  const [failed, setFailed] = useState(false);

  if (!url || failed) {
    return (
      <h1 className="text-sm font-bold uppercase tracking-[0.2em]" style={{ color: 'var(--color-primary)' }}>
        {name}
      </h1>
    );
  }

  return (
    <img
      src={url}
      alt=""
      className={`h-14 w-14 object-cover rounded-full mb-3 opacity-60 ${invert ? 'invert' : ''}`}
      onError={() => setFailed(true)}
    />
  );
}

export function ClientView() {
  const navigate = useNavigate();
  const { config: appConfig } = useApp();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [state, setState] = useState<AppState | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [dataNascimento, setDataNascimento] = useState('');
  const [dataAgendamento, setDataAgendamento] = useState('');
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [matchedClient, setMatchedClient] = useState<Client | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ticketId, setTicketId] = useState<string | null>(() => localStorage.getItem('sq_ticket_id'));
  const [activeTicket, setActiveTicket] = useState<QueueItem | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [showDateSelector, setShowDateSelector] = useState(false);
  const [availableDates, setAvailableDates] = useState<{ date: string; label: string; disabled: boolean; remainingSlots?: number }[]>([]);
  const [checkingDates, setCheckingDates] = useState(false);
  const [selectedDateInfo, setSelectedDateInfo] = useState<{ date: string; label: string; schedule?: any } | null>(null);
  const [barberDelayMinutes, setBarberDelayMinutes] = useState<number>(0);

  const { queue } = useQueue();

  useEffect(() => {
    const loaded = { config: false, state: false };
    let mounted = true;

    const checkLoaded = () => {
      if (loaded.config && loaded.state && mounted) {
        setLoading(false);
      }
    };

    const unsubConfig = ConfigService.onConfigChange((c) => {
      setConfig(c);
      loaded.config = true;

      // Load available dates when config changes
      setCheckingDates(true);
      const dates = getAvailableDates(c, 7);

      Promise.all(
        dates.map(async (dateInfo) => {
          if (!dateInfo.disabled) {
            try {
              const availability = await QueueService.checkDateAvailability(dateInfo.date, c);
              return {
                ...dateInfo,
                disabled: !availability.available,
                remainingSlots: availability.remainingSlots,
              };
            } catch (err) {
              console.warn('Error checking date availability:', dateInfo.date, err);
              return dateInfo;
            }
          }
          return dateInfo;
        })
      ).then((updatedDates) => {
        setAvailableDates(updatedDates);
        setCheckingDates(false);
      }).catch((err) => {
        console.error('Error loading available dates:', err);
        setAvailableDates(dates);
        setCheckingDates(false);
      });

      checkLoaded();
    });

    const unsubState = ConfigService.onStateChange((s) => {
      setState(s);
      loaded.state = true;
      checkLoaded();
    });

    ServiceService.listActive().then(setServices);

    const timeout = setTimeout(() => {
      if (mounted) {
        setLoading(false);
        setState((prev: AppState | null) => prev ?? {
          agendaAberta: false,
          agendaPausada: false,
          dataAbertura: null,
          barberStatus: 'FILA_FECHADA',
          barberStatusStartedAt: Date.now(),
          barberStatusLastAction: 'INICIALIZACAO',
        });
      }
    }, 3000);

    return () => {
      mounted = false;
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
    let prevStatus: string | null = null;
    const unsub = QueueService.onTicketChange(ticketId, (ticket) => {
      if (ticket && (ticket.status === 'AGUARDANDO' || ticket.status === 'EM_ATENDIMENTO')) {
        // Notify when status changes to EM_ATENDIMENTO
        if (prevStatus && prevStatus !== ticket.status && ticket.status === 'EM_ATENDIMENTO') {
          NotificationService.notifyCalled(ticket.clienteNome);
        }
        prevStatus = ticket.status;
        setActiveTicket(ticket);
      } else {
        localStorage.removeItem('sq_ticket_id');
        setTicketId(null);
        setActiveTicket(null);
      }
    });
    return unsub;
  }, [ticketId]);

  // Calculate barber delay when there's a client in service
  useEffect(() => {
    const inService = queue.find(item => item.status === 'EM_ATENDIMENTO');
    if (!inService || !inService.horaChamada) {
      setBarberDelayMinutes(0);
      return;
    }

    const calculateDelay = () => {
      const startTime = inService.horaChamada || Date.now();
      const elapsed = Date.now() - startTime;
      const estimatedMs = inService.tempoEstimado * 60 * 1000;
      const overtime = elapsed - estimatedMs;

      if (overtime > 0) {
        setBarberDelayMinutes(Math.ceil(overtime / 60000));
      } else {
        setBarberDelayMinutes(0);
      }
    };

    calculateDelay();
    const interval = setInterval(calculateDelay, 10000); // Check every 10 seconds
    return () => clearInterval(interval);
  }, [queue]);

  const handleDateNascimentoChange = (value: string) => {
    // Remove non-numeric characters
    let cleaned = value.replace(/\D/g, '');

    // Auto-format as DD/MM/YYYY
    if (cleaned.length >= 2) {
      cleaned = cleaned.slice(0, 2) + (cleaned.length > 2 ? '/' + cleaned.slice(2) : '');
    }
    if (cleaned.length >= 5) {
      cleaned = cleaned.slice(0, 5) + (cleaned.length > 5 ? '/' + cleaned.slice(5, 9) : '');
    }

    // If complete (DD/MM/YYYY), convert to YYYY-MM-DD format for storage
    if (cleaned.length === 10) {
      const [day, month, year] = cleaned.split('/');
      const isoDate = `${year}-${month}-${day}`;
      // Validate date
      const date = new Date(isoDate + 'T00:00:00');
      if (!isNaN(date.getTime())) {
        setDataNascimento(isoDate);
        return;
      }
    }

    // Store the formatted display value
    setDataNascimento(cleaned as any);
  };

  const handleCheckClient = async (e: React.FormEvent) => {
    e.preventDefault();
    const telefoneError = validateTelefone(telefone);
    if (telefoneError) {
      setError(telefoneError);
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const client = await ClientService.findByTelefone(telefone);
      if (client) {
        setMatchedClient(client);
        setNome(client.nome);
        setDataNascimento(client.dataNascimento || '');
        if (client.registrationStatus === 'ACTIVE' || client.hasCompletedSignup) {
          setStep(4);
        } else {
          setStep(5);
        }
      } else {
        setMatchedClient(null);
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
    if (!config) {
      setError('Configuração indisponível. Recarregue a página.');
      return;
    }
    if (selectedServices.length === 0) {
      setError('Selecione ao menos um serviço.');
      return;
    }
    const nomeError = validateNome(nome);
    if (nomeError) {
      setError(nomeError);
      return;
    }
    const telefoneError = validateTelefone(telefone);
    if (telefoneError) {
      setError(telefoneError);
      return;
    }
    // Birth date is required for new clients and pre-registration completion.
    if (step === 3 || step === 5) {
      const birthError = validateDataNascimento(dataNascimento);
      if (birthError) {
        setError(birthError);
        return;
      }
    }
    const dateError = validateDataAgendamento(dataAgendamento);
    if (dateError) {
      setError(dateError);
      return;
    }

    // Determine target date: empty means "Hoje" was selected
    const targetDate = dataAgendamento || new Date().toISOString().split('T')[0];

    setSubmitting(true);
    setError(null);
    try {
      let client: Client;

      if (step === 5 && matchedClient) {
        client = await ClientService.completeExistingClientRegistration(matchedClient.id, {
          nome,
          telefone,
          dataNascimento,
        });
      } else if (step === 4 && matchedClient) {
        client = matchedClient;
      } else {
        const createdOrFound = await ClientService.findOrCreate(
          nome,
          telefone,
          step === 3 ? dataNascimento : undefined
        );
        client = createdOrFound.client;
      }

      const chosenServices = services.filter(s => selectedServices.includes(s.id));

      // Request browser notification permission
      await NotificationService.requestPermission();

      const existingTicket = await QueueService.findActiveTicketByClient(client.id, targetDate);
      if (existingTicket) {
        localStorage.setItem('sq_ticket_id', existingTicket.id);
        setTicketId(existingTicket.id);
        return;
      }

      const newTicketId = await QueueService.addToQueue(client, chosenServices, config, targetDate);
      if (!newTicketId) {
        throw new Error('Não foi possível entrar na fila. Tente novamente.');
      }
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
      // Recalculation of other tickets happens on the barber dashboard listener
      // (firestore rules block non-admin from updating other tickets' horaPrevista).
      localStorage.removeItem('sq_ticket_id');
      setTicketId(null);

      // Resetar estados do formulario para tela inicial
      setSelectedServices([]);
      setDataAgendamento('');
      setSelectedDateInfo(null);
      setShowDateSelector(false);
      setStep(1);
      setMatchedClient(null);
      setError(null);
    } catch (err) {
      setError('Erro ao cancelar. Tente novamente.');
    } finally {
      setCancelling(false);
    }
  };

  const toWhatsAppNumber = (input: string): string => {
    const digits = (input || '').replace(/\D/g, '');
    if (!digits) return '';

    if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) {
      return digits;
    }
    if (digits.length === 10 || digits.length === 11) {
      return `55${digits}`;
    }
    return '';
  };

  const handleContactBarberWhatsApp = () => {
    if (!activeTicket) return;

    const sourcePhone = config?.BARBER_WHATSAPP || '';
    const phoneNumber = toWhatsAppNumber(sourcePhone);
    if (!phoneNumber) {
      setError('WhatsApp do barbeiro não configurado. Peça para atualizar em Configurações.');
      return;
    }

    const dateLabel = activeTicket.data ? activeTicket.data.split('-').reverse().join('/') : '';
    const message = [
      `Oi ${config?.BARBER_NAME || 'barbeiro'}!`,
      `Acabei de reservar minha vez na fila.`,
      `Cliente: ${activeTicket.clienteNome}`,
      `Serviços: ${activeTicket.servicos}`,
      dateLabel ? `Data: ${dateLabel}` : '',
      `Previsão: ${activeTicket.horaPrevista || '--:--'}`,
    ].filter(Boolean).join('\n');

    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
    const popup = window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    if (!popup) {
      window.location.href = whatsappUrl;
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
      <div className="min-h-screen bg-[var(--color-bg)] px-4 pt-6 pb-[calc(env(safe-area-inset-bottom)+5.5rem)] sm:px-6 sm:pb-24">
        <header className="mb-7 space-y-1 sm:mb-10">
          <ShopLogo url={appConfig?.LOGO_URL} name={config?.SHOP_NAME || 'SmartQueue'} invert />
          <p className="text-xl sm:text-2xl font-bold tracking-tight" style={{ color: 'var(--color-text)' }}>
            {isInService ? 'É a sua vez!' : 'Você está na fila'}
          </p>
        </header>

        {/* Barber Status Banner */}
        {state?.barberStatus && (
          <div className="max-w-md mx-auto mb-4">
            <BarberStatusBanner
              status={state.barberStatus}
              delayMinutes={barberDelayMinutes}
            />
          </div>
        )}

        <main className="mx-auto max-w-md space-y-4">
          {error && (
            <div className="p-4 rounded-xl bg-[#EF4444]/10 border border-[#EF4444]/20 text-[#EF4444] text-sm flex items-center gap-3">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <Card className="space-y-5 sm:space-y-6">
            {/* Status badge */}
            <div className={`flex items-center gap-3 p-4 rounded-xl ${
              isInService
                ? 'bg-brand/10 border border-brand/30'
                : 'bg-[#111111] border border-[#1E1E1E]'
            }`}>
              {isInService ? (
                <Scissors className="h-5 w-5 text-brand shrink-0" />
              ) : (
                <Clock className="h-5 w-5 text-[#64748B] shrink-0" />
              )}
              <div>
                <p className="text-xs text-[#64748B] uppercase tracking-wider">Status</p>
                <p className={`font-bold ${isInService ? 'text-brand' : 'text-[#F1F5F9]'}`}>
                  {isInService ? 'Em atendimento agora' : 'Aguardando'}
                </p>
              </div>
            </div>

            {/* Position + time */}
            {!isInService && (
              <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                <div className="p-4 rounded-xl bg-[#111111] border border-[#1E1E1E] text-center">
                  <p className="text-xs text-[#64748B] uppercase tracking-wider mb-1">Posição</p>
                  <p className="text-2xl sm:text-3xl font-bold text-[#F1F5F9]">{position > 0 ? position : '—'}</p>
                </div>
                <div className="p-4 rounded-xl bg-[#111111] border border-[#1E1E1E] text-center">
                  <p className="text-xs text-[#64748B] uppercase tracking-wider mb-1">Previsão</p>
                  <p className="text-2xl sm:text-3xl font-bold text-[#F1F5F9]">
                    {typeof activeTicket.horaPrevista === 'string' && activeTicket.horaPrevista.match(/^\d{2}:\d{2}$/)
                      ? activeTicket.horaPrevista
                      : typeof activeTicket.horaPrevista === 'string'
                      ? activeTicket.horaPrevista.substring(0, 5)
                      : '--:--'}
                  </p>
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

            <Button
              variant="outline"
              className="w-full border-[#25D366]/40 text-[#25D366] hover:bg-[#25D366]/10"
              onClick={handleContactBarberWhatsApp}
            >
              <MessageCircle className="mr-2 h-4 w-4" /> Avisar barbeiro no WhatsApp
            </Button>
          </Card>

          <p className="text-center text-xs text-[#64748B] leading-relaxed">
            Fique por perto. Atualizamos em tempo real.
          </p>
        </main>
      </div>
    );
  }

  // === STATE STILL LOADING ===
  if (!state) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <ScissorsLoading />
      </div>
    );
  }

  // === AGENDA CLOSED ===
  if (!state.agendaAberta) {
    // Check for future dates available
    const today = new Date().toISOString().split('T')[0];
    const futureDatesAvailable = availableDates.filter(d => !d.disabled && d.date !== today);
    const hasFutureDates = futureDatesAvailable.length > 0;

    // Handler to start booking flow for a future date
    const handleSelectFutureDate = (dateInfo: { date: string; label: string; remainingSlots?: number }) => {
      const schedule = getScheduleForDate(dateInfo.date, config!);
      setDataAgendamento(dateInfo.date);
      setSelectedDateInfo({
        date: dateInfo.date,
        label: dateInfo.label,
        schedule,
      });
      // Force re-render with agendaAberta temporarily bypassed for future dates
      // We'll render the booking form by updating state
      setState(prev => prev ? { ...prev, agendaAberta: true } : prev);
    };

    return (
      <div className="min-h-screen bg-[var(--color-bg)] px-4 pt-6 pb-[calc(env(safe-area-inset-bottom)+5.5rem)] sm:px-6 sm:pb-24">
        <header className="mb-7 space-y-1 sm:mb-10">
          <ShopLogo url={appConfig?.LOGO_URL} name={config?.SHOP_NAME || 'SmartQueue'} invert />
        </header>

        <main className="mx-auto max-w-md space-y-5 sm:space-y-6">
          {/* Mensagem de agenda fechada hoje */}
          <Card className="text-center space-y-4">
            <div className="h-16 w-16 mx-auto rounded-full bg-[#111111] border border-[#1E1E1E] flex items-center justify-center">
              <AlertCircle className="h-8 w-8 text-[#64748B]" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-[#F1F5F9]">Agenda Fechada Hoje</h2>
              <p className="text-[#64748B] text-sm">
                O barbeiro ainda nao liberou a agenda para hoje.
              </p>
            </div>
            <Button variant="secondary" onClick={() => window.location.reload()}>
              Atualizar
            </Button>
          </Card>

          {/* Opcao de agendar para outros dias */}
          {hasFutureDates && (
            <Card className="space-y-4">
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-[#F1F5F9]">Agendar para outro dia</h3>
                <p className="text-[#64748B] text-sm">
                  Voce pode reservar seu lugar para os proximos dias.
                </p>
              </div>

              {checkingDates ? (
                <div className="text-center text-[#64748B] text-sm py-4">
                  Verificando disponibilidade...
                </div>
              ) : (
                <div className="space-y-3">
                  {futureDatesAvailable
                    .slice(0, 5)
                    .map((dateInfo) => {
                      const schedule = getScheduleForDate(dateInfo.date, config!);
                      return (
                        <button
                          key={dateInfo.date}
                          onClick={() => handleSelectFutureDate(dateInfo)}
                          className="w-full p-3 rounded-xl border bg-[#111111] border-[#1E1E1E] text-[#F1F5F9] hover:border-brand/30 hover:text-brand text-left transition-all flex items-center justify-between"
                        >
                          <div>
                            <p className="font-medium capitalize">{dateInfo.label}</p>
                            {schedule && (
                              <p className="text-xs text-[#64748B] mt-0.5">
                                {schedule.openTime} - {schedule.closeTime}
                              </p>
                            )}
                          </div>
                          {dateInfo.remainingSlots !== undefined && (
                            <span className="text-xs text-[#64748B]">
                              {dateInfo.remainingSlots} {dateInfo.remainingSlots === 1 ? 'vaga' : 'vagas'}
                            </span>
                          )}
                        </button>
                      );
                    })}
                </div>
              )}
            </Card>
          )}
        </main>
      </div>
    );
  }

  // === BOOKING FORM ===
  return (
    <div className="min-h-screen bg-[var(--color-bg)] px-4 pt-6 pb-[calc(env(safe-area-inset-bottom)+5.5rem)] sm:px-6 sm:pb-24">
      <header className="mb-7 space-y-1 sm:mb-10">
        <ShopLogo url={appConfig?.LOGO_URL} name={config?.SHOP_NAME || 'SmartQueue'} />
        <p className="text-xl sm:text-2xl font-bold tracking-tight" style={{ color: 'var(--color-text)' }}>
          Reserve seu lugar
        </p>
      </header>

      <main className="mx-auto max-w-md space-y-6 sm:space-y-8">
        <Card className="space-y-6 sm:space-y-8">
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
                className="space-y-6 sm:space-y-8"
              >
                <div className="space-y-4">
                  <label className="text-sm font-medium text-[#64748B] ml-1">
                    Qual dia você quer cortar?
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setDataAgendamento('');
                        setSelectedDateInfo(null);
                        setShowDateSelector(false);
                      }}
                      className={`flex-1 p-4 rounded-xl font-bold text-center transition-all ${
                        !dataAgendamento
                          ? 'bg-brand/10 border border-brand text-brand'
                          : 'bg-[#111111] border border-[#1E1E1E] text-[#64748B] hover:border-brand/30 hover:text-brand'
                      }`}
                    >
                      Hoje
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowDateSelector(!showDateSelector)}
                      className={`flex-1 p-4 rounded-xl font-bold text-center transition-all ${
                        dataAgendamento
                          ? 'bg-brand/10 border border-brand text-brand'
                          : 'bg-[#111111] border border-[#1E1E1E] text-[#64748B] hover:border-brand/30 hover:text-brand'
                      }`}
                    >
                      Em breve...
                    </button>
                  </div>

                  {showDateSelector && (
                    <div className="pt-2 space-y-3">
                      <div className="flex items-center gap-2 text-xs text-[#64748B] mb-2">
                        <Calendar className="h-4 w-4" />
                        <span>Próximos dias disponíveis</span>
                      </div>
                      
                      {checkingDates ? (
                        <div className="text-center text-[#64748B] text-sm py-4">
                          Verificando disponibilidade...
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto">
                          {availableDates.map((dateInfo) => {
                            const isSelected = dataAgendamento === dateInfo.date;
                            const schedule = getScheduleForDate(dateInfo.date, config!);
                            
                            return (
                              <button
                                key={dateInfo.date}
                                type="button"
                                disabled={dateInfo.disabled}
                                onClick={() => {
                                  setDataAgendamento(dateInfo.date);
                                  setSelectedDateInfo({
                                    date: dateInfo.date,
                                    label: dateInfo.label,
                                    schedule,
                                  });
                                  setShowDateSelector(false);
                                }}
                                className={`p-3 rounded-xl border text-left transition-all flex items-center justify-between ${
                                  dateInfo.disabled
                                    ? 'bg-[#111111] border-[#1E1E1E] text-[#64748B] opacity-50 cursor-not-allowed'
                                    : isSelected
                                    ? 'bg-brand/10 border-brand text-brand'
                                    : 'bg-[#111111] border-[#1E1E1E] text-[#F1F5F9] hover:border-brand/30 hover:text-brand'
                                }`}
                              >
                                <div>
                                  <p className="font-medium capitalize">{dateInfo.label}</p>
                                  {schedule && !dateInfo.disabled && (
                                    <p className="text-xs text-[#64748B] mt-0.5">
                                      {schedule.openTime} - {schedule.closeTime}
                                    </p>
                                  )}
                                </div>
                                {dateInfo.remainingSlots !== undefined && !dateInfo.disabled && (
                                  <span className="text-xs text-[#64748B]">
                                    {dateInfo.remainingSlots} {dateInfo.remainingSlots === 1 ? 'vaga' : 'vagas'}
                                  </span>
                                )}
                                {dateInfo.disabled && (
                                  <span className="text-xs">Indisponível</span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                  
                  {selectedDateInfo && (
                    <div className="p-3 rounded-xl bg-brand/10 border border-brand/30 flex items-center gap-3">
                      <Calendar className="h-5 w-5 text-brand" />
                      <div>
                        <p className="text-sm font-medium text-brand">
                          {selectedDateInfo.label}
                        </p>
                        {selectedDateInfo.schedule && (
                          <p className="text-xs text-brand/80">
                            {selectedDateInfo.schedule.openTime} - {selectedDateInfo.schedule.closeTime}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <label className="text-sm font-medium text-[#64748B] ml-1">
                    O que vamos fazer {dataAgendamento ? 'neste dia' : 'hoje'}?
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
                  className="h-12 w-full font-bold sm:h-14 sm:text-lg"
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
                className="space-y-6 sm:space-y-8"
              >
                <div className="space-y-4">
                  <Input
                    label="Seu WhatsApp"
                    placeholder="(00) 00000-0000"
                    value={telefone}
                    onChange={(e) => {
                      setTelefone(e.target.value.replace(/\D/g, ''));
                      setMatchedClient(null);
                    }}
                    required
                  />
                </div>
                <div className="flex flex-col gap-2.5 sm:flex-row sm:gap-3">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setMatchedClient(null);
                      setStep(1);
                    }}
                    className="w-full sm:flex-1"
                  >
                    Voltar
                  </Button>
                  <Button
                    type="submit"
                    className="h-12 w-full font-bold sm:h-14 sm:flex-[2] sm:text-lg"
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
                className="space-y-6 sm:space-y-8"
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
                    type="text"
                    placeholder="DD/MM/YYYY"
                    value={dataNascimento.includes('-') ? dataNascimento.split('-').reverse().join('/') : dataNascimento}
                    onChange={(e) => handleDateNascimentoChange(e.target.value)}
                    maxLength={10}
                    required
                  />
                </div>
                <div className="flex flex-col gap-2.5 sm:flex-row sm:gap-3">
                  <Button variant="ghost" onClick={() => setStep(2)} className="w-full sm:flex-1">Voltar</Button>
                  <Button type="submit" className="h-12 w-full font-bold sm:h-14 sm:flex-[2]" loading={submitting}>Entrar na Fila</Button>
                </div>
              </motion.form>
            )}

            {step === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6 sm:space-y-8"
              >
                <div className="space-y-4 text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand/10 sm:h-20 sm:w-20">
                    <User className="h-8 w-8 text-brand sm:h-10 sm:w-10" />
                  </div>
                  <h3 className="text-xl font-bold text-[#F1F5F9]">Bem-vindo de volta, {nome}!</h3>
                  <p className="text-sm text-[#64748B]">
                    Tudo pronto para o seu atendimento. Clique abaixo para confirmar sua entrada na fila.
                  </p>
                </div>
                <div className="flex flex-col gap-2.5 sm:flex-row sm:gap-3">
                  <Button variant="ghost" onClick={() => setStep(2)} className="w-full sm:flex-1">Voltar</Button>
                  <Button
                    onClick={() => handleJoinQueue()}
                    className="h-12 w-full font-bold sm:h-14 sm:flex-[2]"
                    loading={submitting}
                  >
                    Confirmar e Entrar
                  </Button>
                </div>
              </motion.div>
            )}

            {step === 5 && (
              <motion.form
                key="step5"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                onSubmit={handleJoinQueue}
                className="space-y-6 sm:space-y-8"
              >
                <div className="space-y-4">
                  <div className="rounded-xl border border-brand/30 bg-brand/10 p-3 text-sm text-brand">
                    Encontramos seu pré-cadastro. Complete apenas os dados faltantes para continuar.
                  </div>
                  <Input
                    label="Nome Completo"
                    placeholder="Ex: João Silva"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    required
                  />
                  <Input
                    label="Data de Nascimento"
                    type="text"
                    placeholder="DD/MM/YYYY"
                    value={dataNascimento.includes('-') ? dataNascimento.split('-').reverse().join('/') : dataNascimento}
                    onChange={(e) => handleDateNascimentoChange(e.target.value)}
                    maxLength={10}
                    required
                  />
                </div>
                <div className="flex flex-col gap-2.5 sm:flex-row sm:gap-3">
                  <Button variant="ghost" onClick={() => setStep(2)} className="w-full sm:flex-1">Voltar</Button>
                  <Button type="submit" className="h-12 w-full font-bold sm:h-14 sm:flex-[2]" loading={submitting}>
                    Completar e Entrar
                  </Button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>
        </Card>

        <footer className="text-center space-y-4">
          <p className="text-xs text-[#64748B] leading-relaxed">
            Ao entrar na fila, você concorda em receber notificações sobre o status do seu atendimento.
          </p>
          <div className="pt-4">
            <Button variant="ghost" size="sm" className="text-[#64748B]/50 hover:text-brand" onClick={() => navigate('/login')}>
              Acesso do Barbeiro
            </Button>
          </div>
        </footer>
      </main>
    </div>
  );
}
