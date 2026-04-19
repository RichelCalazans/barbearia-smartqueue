import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Scissors,
  User,
  Clock,
  AlertCircle,
  Play,
  Check,
  UserMinus,
  Lock,
  TrendingUp,
  Users,
  Timer as TimerIcon,
  Settings,
  Calendar,
  UserPlus,
  Shield,
  Mail,
  Plus,
  Pencil,
  Trash2,
  MessageCircle,
} from 'lucide-react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';
import { Timer } from '../components/Timer';
import { ScissorsLoading } from '../components/ScissorsLoading';
import { QueueService } from '../services/QueueService';
import { AttendanceService } from '../services/AttendanceService';
import { ConfigService } from '../services/ConfigService';
import { ServiceService } from '../services/ServiceService';
import { AnalyticsService } from '../services/AnalyticsService';
import { UserService } from '../services/UserService';
import { useQueue } from '../hooks/useQueue';
import { useAuth } from '../hooks/useAuth';
import { AppConfig, AppState, AppUser, UserRole } from '../types';
import { cn } from '../utils';
import { MetricsPage } from './MetricsPage';
import { ClientsPage } from './ClientsPage';
import { BottomNavigation, AdminTab } from '../components/BottomNavigation';
import { ResetEstimativasModal } from '../components/ResetEstimativasModal';
import { DelayAlertBanner } from '../components/DelayAlertBanner';
import { AgendaControls } from '../components/AgendaControls';
import { SettingsForm } from '../components/SettingsForm';

export function BarberDashboard() {
  const navigate = useNavigate();
  const { user, isAdmin, isSuperAdmin, loading: authLoading, signOut } = useAuth();
  const today = new Date().toISOString().split('T')[0];
  const [selectedQueueDate, setSelectedQueueDate] = useState<string>(today);
  const { queue, waiting, inService, loading: queueLoading } = useQueue(selectedQueueDate);
  const isViewingFutureDate = selectedQueueDate > today;
  
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [state, setState] = useState<AppState | null>(null);
  const [metrics, setMetrics] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'FINALIZE' | 'ABSENT' | 'OPEN_AGENDA' | 'CLOSE_AGENDA' | 'CLOSE_AGENDA_CHOICE' | 'CLOSE_AGENDA_CLEAR' | 'CLOSE_AGENDA_KEEP' | 'PAUSE_AGENDA' | 'PAUSE_TIME' | 'RESUME_AGENDA' | 'SETTINGS' | 'MANAGE_USERS' | 'MANAGE_SERVICES' | 'RESET_ESTIMATIVAS' | null>(null);
  const [pauseMinutes, setPauseMinutes] = useState<number>(15);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [tempConfig, setTempConfig] = useState<AppConfig | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [showAddUserForm, setShowAddUserForm] = useState(false);
  const [newUser, setNewUser] = useState({ email: '', nome: '', role: 'BARBEIRO' as UserRole });
  const [userError, setUserError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<AdminTab>('FILA');
  const [services, setServices] = useState<any[]>([]);
  const [showAddServiceForm, setShowAddServiceForm] = useState(false);
  const [editingService, setEditingService] = useState<any | null>(null);
  const [newService, setNewService] = useState({ nome: '', tempoBase: 30, preco: 0 });
  const [serviceError, setServiceError] = useState<string | null>(null);
  const [delayMinutes, setDelayMinutes] = useState<number>(0);
  const [showDelayAlert, setShowDelayAlert] = useState<boolean>(false);
  const [skipPauseConfirm, setSkipPauseConfirm] = useState<boolean>(() => {
    return localStorage.getItem('sq_skip_pause_confirm') === 'true';
  });

  useEffect(() => {
    if (isAdmin && config && state) {
      ConfigService.checkAutoOpenClose(config, state);
      const interval = setInterval(() => {
        ConfigService.checkAutoOpenClose(config, state);
      }, 60000);
      return () => clearInterval(interval);
    }
  }, [isAdmin, config, state]);

  useEffect(() => {
    if (isAdmin) {
      ConfigService.initialize().catch(err => {
        console.error('Config init error:', err);
        setError('Erro ao inicializar configurações. Verifique sua conexão.');
      });
      ServiceService.initialize().catch(err => {
        console.error('Service init error:', err);
      });
    }

    const unsubConfig = ConfigService.onConfigChange(setConfig);
    const unsubState = ConfigService.onStateChange(setState);
    
    AnalyticsService.getDailyMetrics().then(setMetrics);
    
    return () => {
      unsubConfig();
      unsubState();
    };
  }, [isAdmin]);

  // Auto-resume when pause time expires
  useEffect(() => {
    if (!state?.agendaPausada || !state?.tempoRetomada) return;

    const checkAndResume = async () => {
      const remaining = Math.max(0, state.tempoRetomada! - Date.now());
      setTimeRemaining(Math.ceil(remaining / 1000)); // Convert to seconds

      if (remaining <= 0) {
        try {
          await ConfigService.togglePause(false);
        } catch (err) {
          console.error('Error auto-resuming:', err);
        }
      }
    };

    checkAndResume();
    const interval = setInterval(checkAndResume, 1000); // Check every second for accurate countdown
    return () => clearInterval(interval);
  }, [state?.agendaPausada, state?.tempoRetomada]);

  // Recalculate queue when pause state changes
  useEffect(() => {
    if (!config) return;
    QueueService.recalculateQueue(config);
  }, [config, state?.agendaPausada, state?.tempoRetomada]);

  // Recalculate queue when a waiting client disappears (cancel/absent)
  // Uses waiting.length as a trigger — when it decreases, we know someone left
  // the queue without being served, and downstream predictions need refreshing.
  const prevWaitingLengthRef = React.useRef<number>(waiting.length);
  useEffect(() => {
    if (!config) return;
    if (waiting.length < prevWaitingLengthRef.current) {
      QueueService.recalculateQueue(config);
    }
    prevWaitingLengthRef.current = waiting.length;
  }, [waiting.length, config]);

  // Auto-update barber status based on queue state
  useEffect(() => {
    if (!state) return;

    const updateBarberStatus = async () => {
      await ConfigService.syncBarberStatusFromRuntime(
        !!state.agendaAberta,
        !!state.agendaPausada,
        !!inService
      );
    };

    updateBarberStatus();
  }, [state?.agendaAberta, state?.agendaPausada, inService, waiting.length]);

  // Delay detection and stopwatch
  useEffect(() => {
    if (!inService || !config) {
      setDelayMinutes(0);
      setShowDelayAlert(false);
      return;
    }

    const checkDelay = () => {
      const startTime = inService.horaChamada || Date.now();
      const elapsed = Date.now() - startTime;
      const estimatedMs = inService.tempoEstimado * 60 * 1000;
      const overtime = elapsed - estimatedMs;

      if (overtime > 0) {
        const minutes = Math.ceil(overtime / 60000);
        setDelayMinutes(minutes);

        // Start delay alert if not already started
        if (!state?.delayAlertStartedAt) {
          ConfigService.setDelayAlert(true);
          setShowDelayAlert(true);
        } else {
          setShowDelayAlert(true);
        }
      } else {
        setDelayMinutes(0);
        setShowDelayAlert(false);
      }
    };

    checkDelay();
    const interval = setInterval(checkDelay, 10000); // Check every 10 seconds
    return () => clearInterval(interval);
  }, [inService, config, state?.delayAlertStartedAt]);

  const handleAction = async () => {
    if (!modalType || !config) return;
    setSubmitting(true);
    try {
      switch (modalType) {
        case 'FINALIZE':
          if (inService) {
            await AttendanceService.finalizeAttendance(inService, config, user?.email || '');
            if (state) {
              await ConfigService.syncBarberStatusFromRuntime(
                !!state.agendaAberta,
                !!state.agendaPausada,
                false
              );
            } else {
              await ConfigService.setBarberStatusFromAction('AGUARDANDO_CLIENTE', 'FINALIZOU_ATENDIMENTO');
            }
          }
          break;
        case 'ABSENT':
          if (inService) {
            await AttendanceService.markAsAbsent(inService, config);
            if (state) {
              await ConfigService.syncBarberStatusFromRuntime(
                !!state.agendaAberta,
                !!state.agendaPausada,
                false
              );
            } else {
              await ConfigService.setBarberStatusFromAction('AGUARDANDO_CLIENTE', 'SEM_CLIENTE_CHAMADO');
            }
          }
          break;
        case 'OPEN_AGENDA':
          await ConfigService.toggleAgenda(true);
          break;
        case 'CLOSE_AGENDA':
          // Se tem clientes na fila, mostrar opções
          if (waiting.length > 0) {
            setSubmitting(false);
            setModalType('CLOSE_AGENDA_CHOICE');
            return;
          }
          await ConfigService.toggleAgenda(false);
          break;
        case 'CLOSE_AGENDA_CLEAR':
          // Limpar fila e fechar
          for (const item of queue) {
            if (item.status === 'AGUARDANDO') {
              await QueueService.updateStatus(item.id, 'CANCELADO');
            }
          }
          await ConfigService.toggleAgenda(false);
          break;
        case 'CLOSE_AGENDA_KEEP':
          // Manter fila e fechar
          await ConfigService.toggleAgenda(false);
          break;
        case 'PAUSE_AGENDA':
          // Show time selection modal
          setSubmitting(false);
          setModalType('PAUSE_TIME');
          return;
        case 'PAUSE_TIME':
          await ConfigService.togglePause(true, pauseMinutes);
          break;
        case 'RESUME_AGENDA':
          await ConfigService.togglePause(false);
          break;
        case 'SETTINGS':
          if (tempConfig) {
            // Validar horários do WEEKLY_SCHEDULE
            if (tempConfig.WEEKLY_SCHEDULE) {
              for (const schedule of tempConfig.WEEKLY_SCHEDULE) {
                if (schedule.enabled) {
                  // Validar que horário de abertura não é 00:00 (meia-noite)
                  if (schedule.openTime === '00:00') {
                    setError(`Horário de abertura inválido para ${['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'][schedule.day]}. Use um horário válido (ex: 09:00).`);
                    setSubmitting(false);
                    return;
                  }
                  // Validar que horário de fechamento é depois da abertura
                  if (schedule.openTime >= schedule.closeTime) {
                    setError(`Horário de fechamento deve ser depois da abertura para ${['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'][schedule.day]}.`);
                    setSubmitting(false);
                    return;
                  }
                }
              }
            }
            await ConfigService.updateConfig(tempConfig);
          }
          break;
      }
      setIsModalOpen(false);
      setError(null); // Clear error on success
      // Refresh metrics
      AnalyticsService.getDailyMetrics().then(setMetrics);
    } catch (err: any) {
      console.error(err);
      setError('Falha ao realizar ação. Verifique se você tem permissão.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCallNext = async () => {
    if (waiting.length === 0) return;
    setSubmitting(true);
    try {
      await QueueService.updateStatus(waiting[0].id, 'EM_ATENDIMENTO');
      await ConfigService.setBarberStatusFromAction('EM_CORTE', 'CHAMOU_PROXIMO_CLIENTE');
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleWhatsApp = (telefone: string, clienteNome: string) => {
    // Remove any non-numeric characters from phone
    const phoneNumber = telefone.replace(/\D/g, '');
    const message = `Oi ${clienteNome}! 👋 Você é o próximo para atendimento! Estou pronto aqui. 💈`;
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleDelayAlertContinue = async () => {
    // Continue current service, dismiss alert
    setShowDelayAlert(false);
  };

  const handleDelayAlertCallNext = async () => {
    // Finalize current service (mark as complete) and call next
    if (inService && waiting.length > 0) {
      setSubmitting(true);
      try {
        // Finalize current
        if (config) {
          await AttendanceService.finalizeAttendance(inService, config, user?.email || '');
        }
        // Call next
        await QueueService.updateStatus(waiting[0].id, 'EM_ATENDIMENTO');
        await ConfigService.setBarberStatusFromAction('EM_CORTE', 'CHAMOU_PROXIMO_CLIENTE');
        setShowDelayAlert(false);
        setDelayMinutes(0);
      } catch (err) {
        console.error('Error handling delay alert:', err);
        setError('Erro ao chamar próximo cliente.');
      } finally {
        setSubmitting(false);
      }
    }
  };

  const openManageUsers = async () => {
    setShowAddUserForm(false);
    setNewUser({ email: '', nome: '', role: 'BARBEIRO' });
    setUserError(null);
    setModalType('MANAGE_USERS');
    setIsModalOpen(true);
    const list = await UserService.listUsers();
    setUsers(list);
  };

  const handleAddUser = async () => {
    if (!newUser.email || !newUser.nome) {
      setUserError('Preencha email e nome.');
      return;
    }
    setSubmitting(true);
    setUserError(null);
    try {
      await UserService.createUser(newUser.email, newUser.nome, newUser.role as UserRole);
      const list = await UserService.listUsers();
      setUsers(list);
      setShowAddUserForm(false);
      setNewUser({ email: '', nome: '', role: 'BARBEIRO' });
    } catch (err: any) {
      setUserError(err.message || 'Erro ao criar usuário.');
    } finally {
      setSubmitting(false);
    }
  };

  const ROLES: UserRole[] = ['RECEPCIONISTA', 'BARBEIRO', 'ADMIN', 'SUPER_ADMIN'];

  const handleToggleRole = async (u: AppUser) => {
    const currentIndex = ROLES.indexOf(u.role);
    const nextRole = ROLES[(currentIndex + 1) % ROLES.length];
    try {
      await UserService.updateRole(u.id, nextRole);
      setUsers(prev => prev.map(x => x.id === u.id ? { ...x, role: nextRole } : x));
    } catch {
      setUserError('Erro ao atualizar permissão.');
    }
  };

  const handleDeleteUser = async (u: AppUser) => {
    if (!confirm(`Remover "${u.nome}" (${u.email})? Essa ação não pode ser desfeita.`)) return;
    try {
      await UserService.deleteUser(u.id);
      setUsers(prev => prev.filter(x => x.id !== u.id));
    } catch {
      setUserError('Erro ao remover usuário.');
    }
  };

  const openManageServices = async () => {
    setShowAddServiceForm(false);
    setEditingService(null);
    setNewService({ nome: '', tempoBase: 30, preco: 0 });
    setServiceError(null);
    setModalType('MANAGE_SERVICES');
    setIsModalOpen(true);
    const list = await ServiceService.listAll();
    setServices(list);
  };

  const handleAddService = async () => {
    if (!newService.nome) {
      setServiceError('Preencha o nome do serviço.');
      return;
    }
    setSubmitting(true);
    setServiceError(null);
    try {
      await ServiceService.create({ ...newService, ativo: true });
      const list = await ServiceService.listAll();
      setServices(list);
      setShowAddServiceForm(false);
      setNewService({ nome: '', tempoBase: 30, preco: 0 });
    } catch (err: any) {
      setServiceError(err.message || 'Erro ao criar serviço.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateService = async () => {
    if (!editingService || !editingService.nome) {
      setServiceError('Preencha o nome do serviço.');
      return;
    }
    setSubmitting(true);
    setServiceError(null);
    try {
      await ServiceService.update(editingService);
      const list = await ServiceService.listAll();
      setServices(list);
      setEditingService(null);
    } catch (err: any) {
      setServiceError(err.message || 'Erro ao atualizar serviço.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteService = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este serviço?')) return;
    setSubmitting(true);
    try {
      await ServiceService.delete(id);
      const list = await ServiceService.listAll();
      setServices(list);
    } catch (err: any) {
      setServiceError(err.message || 'Erro ao excluir serviço.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleServiceActive = async (s: any) => {
    try {
      await ServiceService.update({ ...s, ativo: !s.ativo });
      setServices(prev => prev.map(x => x.id === s.id ? { ...x, ativo: !s.ativo } : x));
    } catch {
      setServiceError('Erro ao atualizar serviço.');
    }
  };

  if (authLoading || queueLoading) return <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center"><ScissorsLoading /></div>;

  if (!user) {
    // RequireAdmin guard should handle this, but keep a safety net.
    return null;
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] p-6 flex flex-col items-center justify-center text-center space-y-6">
        <Lock className="h-12 w-12 text-[#EF4444]" />
        <h1 className="text-2xl font-bold text-[#F1F5F9]">Acesso Negado</h1>
        <p className="text-[#64748B]">Sua conta ({user.email}) não tem permissão de administrador.</p>
        <Button onClick={() => navigate('/login')}>Fazer login com outra conta</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      {/* Header sticky — visível em todas as tabs */}
      <header className="sticky top-0 z-40 border-b border-[#1E1E1E] bg-[#0A0A0A]/95 px-4 py-3 backdrop-blur-sm sm:px-6 sm:py-4">
        <div className="mx-auto max-w-4xl space-y-2.5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h1 className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand sm:text-xs">
                {activeTab === 'FILA' ? 'Painel do Barbeiro' : activeTab === 'METRICAS' ? 'Métricas' : 'Clientes'}
              </h1>
              <p className="truncate text-base font-bold tracking-tight text-[#F1F5F9] sm:text-lg">
                {activeTab === 'FILA' ? `Olá, ${config?.BARBER_NAME}` : activeTab === 'METRICAS' ? 'Análise de desempenho' : 'Gerenciar clientes'}
              </p>
            </div>

            <div className="hidden items-center gap-2 md:flex">
              <Button variant="ghost" size="icon" onClick={openManageServices} title="Gerenciar serviços">
                <Scissors className="h-5 w-5 text-[#64748B]" />
              </Button>
              <Button variant="ghost" size="icon" onClick={openManageUsers} title="Gerenciar usuários">
                <UserPlus className="h-5 w-5 text-[#64748B]" />
              </Button>
              {isSuperAdmin && (
                <Button variant="ghost" size="icon" onClick={() => { setModalType('RESET_ESTIMATIVAS'); setIsModalOpen(true); }} title="Estimativas de tempo">
                  <TimerIcon className="h-5 w-5 text-[#64748B]" />
                </Button>
              )}
              <Button variant="ghost" size="icon" onClick={() => { setTempConfig(config); setModalType('SETTINGS'); setIsModalOpen(true); }} title="Configurações">
                <Settings className="h-5 w-5 text-[#64748B]" />
              </Button>
              <Button variant="ghost" size="icon" onClick={signOut} title="Sair">
                <UserMinus className="h-5 w-5 text-[#64748B]" />
              </Button>
            </div>

            <div className="flex items-center gap-1 md:hidden">
              <Button variant="ghost" size="icon" onClick={() => { setTempConfig(config); setModalType('SETTINGS'); setIsModalOpen(true); }} title="Configurações">
                <Settings className="h-4 w-4 text-[#64748B]" />
              </Button>
              <Button variant="ghost" size="icon" onClick={signOut} title="Sair">
                <UserMinus className="h-4 w-4 text-[#64748B]" />
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:hidden">
            <Button variant="ghost" size="icon" onClick={openManageServices} title="Gerenciar serviços" className="shrink-0 border border-[#1E1E1E] bg-[#111111]">
              <Scissors className="h-4 w-4 text-[#64748B]" />
            </Button>
            <Button variant="ghost" size="icon" onClick={openManageUsers} title="Gerenciar usuários" className="shrink-0 border border-[#1E1E1E] bg-[#111111]">
              <UserPlus className="h-4 w-4 text-[#64748B]" />
            </Button>
            {isSuperAdmin && (
              <Button variant="ghost" size="icon" onClick={() => { setModalType('RESET_ESTIMATIVAS'); setIsModalOpen(true); }} title="Estimativas de tempo" className="shrink-0 border border-[#1E1E1E] bg-[#111111]">
                <TimerIcon className="h-4 w-4 text-[#64748B]" />
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Conteúdo por tab */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'FILA' && (
          <main className="mx-auto max-w-4xl space-y-6 px-4 py-5 pb-[calc(env(safe-area-inset-bottom)+5.5rem)] sm:space-y-8 sm:px-6 sm:py-6 sm:pb-24">
        {error && (
          <div className="p-4 rounded-xl bg-[#EF4444]/10 border border-[#EF4444]/20 text-[#EF4444] text-sm flex items-center gap-3">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}
        {/* Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
          <Card className="p-3 md:p-4 space-y-2">
            <Users className="h-3.5 md:h-4 w-3.5 md:w-4 text-[#64748B]" />
            <p className="text-xl md:text-2xl font-bold text-[#F1F5F9]">{metrics?.totalAttended || 0}</p>
            <p className="text-[10px] md:text-xs font-medium text-[#64748B] uppercase">Atendidos</p>
          </Card>
          <Card className="p-3 md:p-4 space-y-2">
            <TimerIcon className="h-3.5 md:h-4 w-3.5 md:w-4 text-[#64748B]" />
            <p className="text-xl md:text-2xl font-bold text-[#F1F5F9]">{metrics?.averageTime || 0}m</p>
            <p className="text-[10px] md:text-xs font-medium text-[#64748B] uppercase">Média</p>
          </Card>
          <Card className="p-3 md:p-4 space-y-2">
            <TrendingUp className="h-3.5 md:h-4 w-3.5 md:w-4 text-[#64748B]" />
            <p className="text-xl md:text-2xl font-bold text-[#F1F5F9]">{metrics?.adherence || 100}%</p>
            <p className="text-[10px] md:text-xs font-medium text-[#64748B] uppercase">Aderência</p>
          </Card>
          <Card className="p-3 md:p-4 space-y-2">
            <Clock className="h-3.5 md:h-4 w-3.5 md:w-4 text-[#64748B]" />
            <p className="text-xl md:text-2xl font-bold text-[#F1F5F9]">{waiting.length}</p>
            <p className="text-[10px] md:text-xs font-medium text-[#64748B] uppercase">Fila</p>
          </Card>
        </div>

        {showDelayAlert && inService && delayMinutes > 0 && (
          <DelayAlertBanner
            delayMinutes={delayMinutes}
            submitting={submitting}
            callNextDisabled={waiting.length === 0 || submitting}
            onContinue={handleDelayAlertContinue}
            onCallNext={handleDelayAlertCallNext}
          />
        )}

        {/* Current Service Section */}
        <section className="space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-widest text-[#64748B] ml-1">Atendimento Atual</h2>
          {inService ? (
            <Card className="relative overflow-hidden border-brand/20">
              <div className="flex flex-col items-center gap-6 md:gap-8 md:flex-row md:items-start">
                <Timer
                  startTime={inService.horaChamada || Date.now()}
                  estimatedMinutes={inService.tempoEstimado}
                  className="shrink-0"
                />
                <div className="flex-1 space-y-5 md:space-y-6 text-center md:text-left w-full">
                  <div className="space-y-1 md:space-y-2">
                    <h3 className="text-2xl md:text-3xl font-bold text-[#F1F5F9] tracking-tight break-words">{inService.clienteNome}</h3>
                    <p className="text-sm md:text-base text-brand font-medium">{inService.servicos}</p>
                  </div>
                  <div className="grid grid-cols-1 gap-2 md:flex md:flex-wrap md:items-center md:justify-start md:gap-3">
                    <Button
                      className="w-full md:w-auto h-11 md:h-12 md:px-8 font-bold bg-[#25D366] hover:bg-[#25D366]/90 text-white text-sm md:text-base"
                      onClick={() => handleWhatsApp(inService.telefone, inService.clienteNome)}
                      title="Enviar mensagem via WhatsApp"
                    >
                      <MessageCircle className="mr-2 h-4 md:h-5 w-4 md:w-5" /> WhatsApp
                    </Button>
                    <Button
                      className="w-full md:w-auto h-11 md:h-12 md:px-8 font-bold text-sm md:text-base"
                      onClick={() => { setModalType('FINALIZE'); setIsModalOpen(true); }}
                      disabled={isViewingFutureDate}
                      title={isViewingFutureDate ? 'Acao disponivel apenas para o dia atual' : ''}
                    >
                      <Check className="mr-2 h-4 md:h-5 w-4 md:w-5" /> Finalizar
                    </Button>
                    <Button
                      variant="secondary"
                      className="w-full md:w-auto h-11 md:h-12 md:px-8 font-bold text-sm md:text-base"
                      onClick={() => { setModalType('ABSENT'); setIsModalOpen(true); }}
                      disabled={isViewingFutureDate}
                      title={isViewingFutureDate ? 'Acao disponivel apenas para o dia atual' : ''}
                    >
                      <UserMinus className="mr-2 h-4 md:h-5 w-4 md:w-5" /> Ausente
                    </Button>
                  </div>
                  {isViewingFutureDate && (
                    <p className="text-xs text-[#F59E0B]">Acoes de gerenciamento disponiveis apenas para o dia atual</p>
                  )}
                </div>
              </div>
            </Card>
          ) : (
            <Card className="min-h-40 md:h-48 flex flex-col items-center justify-center text-center space-y-3 md:space-y-4 border-dashed p-4 md:p-6">
              <div className="h-10 w-10 md:h-12 md:w-12 rounded-full bg-[#1A1A1A] flex items-center justify-center">
                <Scissors className="h-5 w-5 md:h-6 md:w-6 text-[#64748B]" />
              </div>
              <p className="text-sm md:text-base text-[#64748B] font-medium">
                {isViewingFutureDate ? 'Visualizando agendamentos futuros' : 'Nenhum cliente em atendimento'}
              </p>
              {waiting.length > 0 && !isViewingFutureDate && (
                <Button onClick={handleCallNext} loading={submitting} className="text-sm md:text-base">
                  <Play className="mr-2 h-4 w-4" /> Chamar Proximo ({waiting[0].clienteNome})
                </Button>
              )}
              {isViewingFutureDate && waiting.length > 0 && (
                <p className="text-xs text-[#F59E0B]">Acoes disponiveis apenas para o dia atual</p>
              )}
            </Card>
          )}
        </section>

        {/* Queue List */}
        <section className="space-y-4">
          {/* Date Selector */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 mb-4">
            <button
              onClick={() => setSelectedQueueDate(today)}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap",
                selectedQueueDate === today
                  ? "bg-brand text-[#0A0A0A]"
                  : "bg-[#1A1A1A] text-[#64748B] hover:bg-[#252525]"
              )}
            >
              Hoje
            </button>
            <input
              type="date"
              value={selectedQueueDate}
              onChange={(e) => setSelectedQueueDate(e.target.value)}
              min={today}
              className="px-3 py-2 rounded-lg bg-[#1A1A1A] border border-[#333] text-[#F1F5F9] text-sm font-medium focus:outline-none focus:border-brand transition-all flex-1 sm:flex-none"
            />
            {isViewingFutureDate && (
              <span className="text-xs text-[#F59E0B] font-medium flex items-center gap-1 sm:col-span-2">
                <Calendar className="h-3 w-3 shrink-0" />
                <span>Visualizando agendamentos futuros</span>
              </span>
            )}
          </div>

          <div className="flex items-center justify-between ml-1">
            <h2 className="text-xs font-bold uppercase tracking-widest text-[#64748B]">
              {isViewingFutureDate ? 'Agendamentos do Dia' : 'Próximos na Fila'}
            </h2>
            <span className="text-xs font-bold text-brand">
              {waiting.length} cliente{waiting.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="space-y-2 md:space-y-3">
            {waiting.map((item, index) => (
              <Card key={item.id} className="p-3 md:p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 group hover:border-brand/30 transition-all">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-8 w-8 md:h-10 md:w-10 rounded-lg md:rounded-xl bg-[#1A1A1A] flex items-center justify-center text-xs md:text-sm font-bold text-[#64748B] shrink-0">
                    {index + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-[#F1F5F9] text-sm md:text-base truncate">{item.clienteNome}</p>
                    <p className="text-xs text-[#64748B] truncate">{item.servicos}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-3 sm:gap-3">
                  <button
                    onClick={() => handleWhatsApp(item.telefone, item.clienteNome)}
                    className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity p-1.5 md:p-2 hover:bg-brand/10 rounded-lg shrink-0"
                    title="Chamar via WhatsApp"
                  >
                    <MessageCircle className="h-4 w-4 md:h-5 md:w-5 text-brand" />
                  </button>
                  <div className="text-right shrink-0">
                    <p className="text-xs md:text-sm font-bold text-[#F1F5F9]">
                      {typeof item.horaPrevista === 'string'
                        ? item.horaPrevista.match(/^\d{2}:\d{2}/)
                          ? item.horaPrevista
                          : item.horaPrevista.substring(0, 5)
                        : '00:00'}
                    </p>
                    <p className="text-[9px] md:text-[10px] uppercase tracking-wider text-[#64748B] font-bold">Previsto</p>
                  </div>
                </div>
              </Card>
            ))}
            {waiting.length === 0 && (
              <div className="py-12 text-center space-y-2">
                <p className="text-[#64748B] font-medium">
                  {isViewingFutureDate ? 'Nenhum agendamento para esta data' : 'Fila vazia'}
                </p>
                <p className="text-xs text-[#64748B]/50 uppercase tracking-widest">
                  {isViewingFutureDate ? 'Nenhum cliente agendou para este dia' : 'Aguardando novos clientes'}
                </p>
              </div>
            )}
          </div>
        </section>

        <AgendaControls
          agendaAberta={!!state?.agendaAberta}
          agendaPausada={!!state?.agendaPausada}
          timeRemaining={timeRemaining}
          onOpen={() => {
            setModalType('OPEN_AGENDA');
            setIsModalOpen(true);
          }}
          onPauseToggle={() => {
            if (!state?.agendaPausada && skipPauseConfirm) {
              setModalType('PAUSE_TIME');
            } else {
              setModalType(state?.agendaPausada ? 'RESUME_AGENDA' : 'PAUSE_AGENDA');
            }
            setIsModalOpen(true);
          }}
          onClose={() => {
            setModalType(waiting.length > 0 ? 'CLOSE_AGENDA_CHOICE' : 'CLOSE_AGENDA');
            setIsModalOpen(true);
          }}
        />
          </main>
          )}

          {activeTab === 'METRICAS' && config && (
            <MetricsPage config={config} />
          )}

          {activeTab === 'CLIENTES' && config && (
            <ClientsPage config={config} />
          )}
        </motion.div>
      </AnimatePresence>

      {/* Bottom Navigation */}
      <BottomNavigation activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Action Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={
          modalType === 'FINALIZE' ? 'Finalizar Atendimento' :
          modalType === 'ABSENT' ? 'Marcar como Ausente' :
          modalType === 'OPEN_AGENDA' ? 'Abrir Agenda' :
          modalType === 'PAUSE_AGENDA' ? 'Pausar Agenda' :
          modalType === 'PAUSE_TIME' ? 'Quanto Tempo Pausar?' :
          modalType === 'RESUME_AGENDA' ? 'Retomar Agenda' :
          modalType === 'CLOSE_AGENDA_CHOICE' ? 'Encerrar Dia' :
          modalType === 'CLOSE_AGENDA_CLEAR' ? 'Encerrar Dia e Fila' :
          modalType === 'CLOSE_AGENDA_KEEP' ? 'Encerrar Dia (Manter Fila)' :
          modalType === 'SETTINGS' ? 'Configurações Automáticas' :
          modalType === 'MANAGE_USERS' ? 'Gerenciar Usuários' :
          modalType === 'MANAGE_SERVICES' ? 'Gerenciar Serviços' :
          modalType === 'RESET_ESTIMATIVAS' ? 'Estimativas de Tempo' : 'Fechar Agenda'
        }
        footer={
          modalType === 'PAUSE_TIME' ? (
            <>
              <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
              <Button
                variant="primary"
                onClick={handleAction}
                loading={submitting}
              >
                Pausar por {pauseMinutes > 60 ? `${Math.floor(pauseMinutes / 60)}h ${pauseMinutes % 60}m` : `${pauseMinutes}m`}
              </Button>
            </>
          ) : modalType === 'CLOSE_AGENDA_CHOICE' ? (
            <>
              <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
              <div className="grid w-full grid-cols-1 gap-2 sm:flex-1 sm:grid-cols-2">
                <Button
                  variant="outline"
                  onClick={() => { setModalType('CLOSE_AGENDA_KEEP'); }}
                  className="flex-1"
                >
                  Manter Fila
                </Button>
                <Button
                  variant="danger"
                  onClick={() => { setModalType('CLOSE_AGENDA_CLEAR'); }}
                  className="flex-1"
                >
                  Limpar Fila
                </Button>
              </div>
            </>
          ) : modalType !== 'MANAGE_USERS' && modalType !== 'MANAGE_SERVICES' && modalType !== 'RESET_ESTIMATIVAS' ? (
            <>
              <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
              <Button
                variant={modalType === 'ABSENT' || modalType === 'CLOSE_AGENDA' || modalType === 'CLOSE_AGENDA_CLEAR' ? 'danger' : 'primary'}
                onClick={handleAction}
                loading={submitting}
              >
                {modalType === 'SETTINGS' ? 'Salvar' : 'Confirmar'}
              </Button>
            </>
          ) : undefined
        }
      >
        {modalType === 'MANAGE_USERS' ? (
          <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
            {userError && (
              <div className="p-3 rounded-xl bg-[#EF4444]/10 border border-[#EF4444]/20 text-[#EF4444] text-sm flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {userError}
              </div>
            )}

            {/* User list */}
            <div className="space-y-2">
              {users.length === 0 && !showAddUserForm && (
                <p className="text-sm text-[#64748B] text-center py-4">Nenhum usuário cadastrado ainda.</p>
              )}
              {users.map(u => (
                <div key={u.id} className="flex items-center justify-between p-3 rounded-xl bg-[#1A1A1A] border border-[#1E1E1E]">
                  <div className="space-y-0.5">
                    <p className="text-sm font-bold text-[#F1F5F9]">{u.nome}</p>
                    <p className="text-xs text-[#64748B] flex items-center gap-1">
                      <Mail className="h-3 w-3" />{u.email}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleRole(u)}
                      className={cn(
                        'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors',
                        u.role === 'SUPER_ADMIN' || u.role === 'ADMIN'
                          ? 'bg-brand/10 text-brand hover:bg-[#EF4444]/10 hover:text-[#EF4444]'
                          : 'bg-[#334155]/20 text-[#64748B] hover:bg-brand/10 hover:text-brand'
                      )}
                      title={`Mudar role (atual: ${u.role})`}
                    >
                      <Shield className="h-3 w-3" />
                      {u.role === 'SUPER_ADMIN' ? 'Super' : u.role === 'ADMIN' ? 'Admin' : u.role === 'BARBEIRO' ? 'Barbeiro' : 'Recep'}
                    </button>
                    {isSuperAdmin && u.role !== 'SUPER_ADMIN' && (
                      <button
                        onClick={() => handleDeleteUser(u)}
                        className="p-1.5 rounded-lg text-[#64748B] hover:text-[#EF4444] hover:bg-[#EF4444]/10 transition-colors"
                        title="Remover usuário"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Add user form */}
            {showAddUserForm ? (
              <div className="space-y-3 p-4 rounded-xl bg-[#111111] border border-brand/20">
                <p className="text-xs font-bold uppercase tracking-widest text-[#64748B]">Novo Usuário</p>
                <input
                  type="text"
                  placeholder="Nome completo"
                  value={newUser.nome}
                  onChange={e => setNewUser(p => ({ ...p, nome: e.target.value }))}
                  className="flex h-11 w-full rounded-xl border border-[#1E1E1E] bg-[#0A0A0A] px-4 text-sm text-[#F1F5F9] placeholder:text-[#64748B] focus:outline-none focus:border-brand transition-all"
                />
                <input
                  type="email"
                  placeholder="Email"
                  value={newUser.email}
                  onChange={e => setNewUser(p => ({ ...p, email: e.target.value }))}
                  className="flex h-11 w-full rounded-xl border border-[#1E1E1E] bg-[#0A0A0A] px-4 text-sm text-[#F1F5F9] placeholder:text-[#64748B] focus:outline-none focus:border-brand transition-all"
                />
                <div className="space-y-2">
                  <p className="text-xs text-[#64748B]">Função</p>
                  <div className="grid grid-cols-2 gap-2">
                    {(['RECEPCIONISTA', 'BARBEIRO', 'ADMIN', 'SUPER_ADMIN'] as UserRole[]).map(role => (
                      <button
                        key={role}
                        onClick={() => setNewUser(p => ({ ...p, role }))}
                        className={cn(
                          'p-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors',
                          newUser.role === role
                            ? 'bg-brand text-black'
                            : 'bg-[#1A1A1A] text-[#64748B] border border-[#1E1E1E]'
                        )}
                      >
                        {role === 'SUPER_ADMIN' ? 'Super' : role === 'ADMIN' ? 'Admin' : role === 'BARBEIRO' ? 'Barbeiro' : 'Recep'}
                      </button>
                    ))}
                  </div>
                </div>
                <p className="text-xs text-[#64748B]">
                  O usuário receberá um email para criar sua senha.
                </p>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => { setShowAddUserForm(false); setUserError(null); }} className="flex-1">
                    Cancelar
                  </Button>
                  <Button size="sm" onClick={handleAddUser} loading={submitting} className="flex-1">
                    Criar e Enviar Convite
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => { setShowAddUserForm(true); setUserError(null); }}
              >
                <UserPlus className="mr-2 h-4 w-4" /> Adicionar Usuário
              </Button>
            )}
          </div>
        ) : modalType === 'SETTINGS' && tempConfig ? (
          <SettingsForm tempConfig={tempConfig} onChange={setTempConfig} />
        ) : modalType === 'PAUSE_TIME' ? (
          <div className="space-y-4">
            <p className="text-[#64748B] text-sm mb-6">Selecione quanto tempo deseja pausar a agenda:</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { minutes: 5, label: '5 min' },
                { minutes: 10, label: '10 min' },
                { minutes: 30, label: '30 min' },
                { minutes: 60, label: '1 hora' },
              ].map(option => (
                <button
                  key={option.minutes}
                  onClick={() => setPauseMinutes(option.minutes)}
                  className={cn(
                    'p-4 rounded-xl font-bold text-sm uppercase tracking-wider transition-all border-2',
                    pauseMinutes === option.minutes
                      ? 'bg-brand/20 border-brand text-brand'
                      : 'bg-[#1A1A1A] border-[#1E1E1E] text-[#64748B] hover:border-brand/50'
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        ) : modalType === 'MANAGE_SERVICES' ? (
          <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
            {serviceError && (
              <div className="p-3 rounded-xl bg-[#EF4444]/10 border border-[#EF4444]/20 text-[#EF4444] text-sm flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {serviceError}
              </div>
            )}

            {editingService ? (
              <div className="space-y-3 p-4 rounded-xl bg-[#111111] border border-brand/20">
                <p className="text-xs font-bold uppercase tracking-widest text-[#64748B]">Editando Serviço</p>
                <input
                  type="text"
                  placeholder="Nome do serviço"
                  value={editingService.nome}
                  onChange={e => setEditingService(p => ({ ...p, nome: e.target.value }))}
                  className="flex h-11 w-full rounded-xl border border-[#1E1E1E] bg-[#0A0A0A] px-4 text-sm text-[#F1F5F9] placeholder:text-[#64748B] focus:outline-none focus:border-brand transition-all"
                />
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-widest text-[#64748B] font-bold">Tempo (min)</label>
                    <input
                      type="number"
                      value={editingService.tempoBase}
                      onChange={e => setEditingService(p => ({ ...p, tempoBase: parseInt(e.target.value) || 0 }))}
                      className="flex h-11 w-full rounded-xl border border-[#1E1E1E] bg-[#0A0A0A] px-4 text-sm text-[#F1F5F9] placeholder:text-[#64748B] focus:outline-none focus:border-brand transition-all"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-widest text-[#64748B] font-bold">Preço (R$)</label>
                    <input
                      type="number"
                      value={editingService.preco}
                      onChange={e => setEditingService(p => ({ ...p, preco: parseFloat(e.target.value) || 0 }))}
                      className="flex h-11 w-full rounded-xl border border-[#1E1E1E] bg-[#0A0A0A] px-4 text-sm text-[#F1F5F9] placeholder:text-[#64748B] focus:outline-none focus:border-brand transition-all"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => { setEditingService(null); setServiceError(null); }} className="flex-1">
                    Cancelar
                  </Button>
                  <Button size="sm" onClick={handleUpdateService} loading={submitting} className="flex-1">
                    Salvar
                  </Button>
                </div>
              </div>
            ) : showAddServiceForm ? (
              <div className="space-y-3 p-4 rounded-xl bg-[#111111] border border-brand/20">
                <p className="text-xs font-bold uppercase tracking-widest text-[#64748B]">Novo Serviço</p>
                <input
                  type="text"
                  placeholder="Nome do serviço"
                  value={newService.nome}
                  onChange={e => setNewService(p => ({ ...p, nome: e.target.value }))}
                  className="flex h-11 w-full rounded-xl border border-[#1E1E1E] bg-[#0A0A0A] px-4 text-sm text-[#F1F5F9] placeholder:text-[#64748B] focus:outline-none focus:border-brand transition-all"
                />
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-widest text-[#64748B] font-bold">Tempo (min)</label>
                    <input
                      type="number"
                      value={newService.tempoBase}
                      onChange={e => setNewService(p => ({ ...p, tempoBase: parseInt(e.target.value) || 0 }))}
                      className="flex h-11 w-full rounded-xl border border-[#1E1E1E] bg-[#0A0A0A] px-4 text-sm text-[#F1F5F9] placeholder:text-[#64748B] focus:outline-none focus:border-brand transition-all"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-widest text-[#64748B] font-bold">Preço (R$)</label>
                    <input
                      type="number"
                      value={newService.preco}
                      onChange={e => setNewService(p => ({ ...p, preco: parseFloat(e.target.value) || 0 }))}
                      className="flex h-11 w-full rounded-xl border border-[#1E1E1E] bg-[#0A0A0A] px-4 text-sm text-[#F1F5F9] placeholder:text-[#64748B] focus:outline-none focus:border-brand transition-all"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => { setShowAddServiceForm(false); setServiceError(null); }} className="flex-1">
                    Cancelar
                  </Button>
                  <Button size="sm" onClick={handleAddService} loading={submitting} className="flex-1">
                    Criar Serviço
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => { setShowAddServiceForm(true); setServiceError(null); }}
              >
                <Plus className="mr-2 h-4 w-4" /> Adicionar Serviço
              </Button>
            )}

            <div className="space-y-2">
              {services.length === 0 && !showAddServiceForm && (
                <p className="text-sm text-[#64748B] text-center py-4">Nenhum serviço cadastrado ainda.</p>
              )}
              {services.map(s => (
                <div key={s.id} className="flex items-center justify-between p-3 rounded-xl bg-[#1A1A1A] border border-[#1E1E1E]">
                  <div className="space-y-0.5">
                    <p className="text-sm font-bold text-[#F1F5F9]">{s.nome}</p>
                    <p className="text-xs text-[#64748B] flex items-center gap-2">
                      <Clock className="h-3 w-3" />{s.tempoBase}min
                      <span className="text-brand">R$ {s.preco.toFixed(2)}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleToggleServiceActive(s)}
                      className={cn(
                        'px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors',
                        s.ativo ? 'bg-brand/10 text-brand' : 'bg-[#334155]/20 text-[#64748B]'
                      )}
                    >
                      {s.ativo ? 'Ativo' : 'Inativo'}
                    </button>
                    <button
                      onClick={() => setEditingService(s)}
                      className="p-2 rounded-lg text-[#64748B] hover:text-[#F1F5F9] hover:bg-[#1A1A1A]"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteService(s.id)}
                      className="p-2 rounded-lg text-[#64748B] hover:text-[#EF4444] hover:bg-[#EF4444]/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : modalType === 'RESET_ESTIMATIVAS' ? (
          config ? <ResetEstimativasModal config={config} /> : null
        ) : modalType === 'PAUSE_AGENDA' ? (
          <div className="space-y-4">
            <p className="text-[#64748B] leading-relaxed">
              Deseja pausar a agenda? Nenhum novo cliente poderá entrar, mas os que já estão continuarão sendo atendidos.
            </p>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={skipPauseConfirm}
                onChange={(e) => {
                  setSkipPauseConfirm(e.target.checked);
                  localStorage.setItem('sq_skip_pause_confirm', e.target.checked ? 'true' : 'false');
                }}
                className="w-5 h-5 rounded border-[#1E1E1E] bg-[#1A1A1A] text-brand focus:ring-brand/50"
              />
              <span className="text-sm text-[#64748B]">Não mostrar novamente</span>
            </label>
          </div>
        ) : (
          <p className="text-[#64748B] leading-relaxed">
            {modalType === 'FINALIZE' ? `Deseja confirmar a finalização do atendimento de ${inService?.clienteNome}? O histórico será salvo e a média de tempo atualizada.` :
             modalType === 'ABSENT' ? `Deseja marcar ${inService?.clienteNome} como ausente? O cliente será removido da fila e o próximo será chamado.` :
             modalType === 'OPEN_AGENDA' ? 'Deseja abrir a agenda para hoje? Clientes poderão entrar na fila através do link público.' :
             modalType === 'RESUME_AGENDA' ? 'Deseja retomar a agenda? Clientes poderão entrar na fila novamente.' :
             modalType === 'CLOSE_AGENDA_CHOICE' ? `Você tem ${waiting.length} cliente${waiting.length !== 1 ? 's' : ''} na fila. O que deseja fazer?\n\n• Manter Fila: O dia encerra, mas clientes continuarão na fila para amanhã.\n• Limpar Fila: O dia encerra e todos os clientes em espera serão cancelados.` :
             modalType === 'CLOSE_AGENDA_CLEAR' ? `Deseja encerrar o dia E limpar a fila? Os ${waiting.length} cliente(s) em espera serão cancelados.` :
             modalType === 'CLOSE_AGENDA_KEEP' ? `Deseja encerrar o dia mantendo a fila? Os ${waiting.length} cliente(s) continuarão na fila para amanhã.` :
             'Deseja fechar a agenda? Novos clientes não poderão entrar na fila, mas os que já estão nela continuarão sendo atendidos.'}
          </p>
        )}
      </Modal>
    </div>
  );
}
