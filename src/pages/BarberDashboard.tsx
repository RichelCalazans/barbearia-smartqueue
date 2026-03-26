import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Scissors,
  User,
  Phone,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Play,
  Check,
  UserMinus,
  Lock,
  Unlock,
  TrendingUp,
  Users,
  Timer as TimerIcon,
  Settings,
  Calendar,
  Save,
  UserPlus,
  Shield,
  ShieldOff,
  Mail,
  Plus,
  Pencil,
  Trash2,
  X
} from 'lucide-react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';
import { Timer } from '../components/Timer';
import { Skeleton } from '../components/Skeleton';
import { ScissorsLoading } from '../components/ScissorsLoading';
import { QueueService } from '../services/QueueService';
import { AttendanceService } from '../services/AttendanceService';
import { ConfigService } from '../services/ConfigService';
import { ServiceService } from '../services/ServiceService';
import { AnalyticsService } from '../services/AnalyticsService';
import { UserService } from '../services/UserService';
import { useQueue } from '../hooks/useQueue';
import { useAuth } from '../hooks/useAuth';
import { QueueItem, AppConfig, AppState, AppUser } from '../types';
import { cn } from '../utils';
import { MetricsPage } from './MetricsPage';
import { ClientsPage } from './ClientsPage';
import { BottomNavigation, AdminTab } from '../components/BottomNavigation';

export function BarberDashboard() {
  const { user, isAdmin, loading: authLoading, signOut } = useAuth();
  const { queue, waiting, inService, loading: queueLoading } = useQueue();
  
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [state, setState] = useState<AppState | null>(null);
  const [metrics, setMetrics] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'FINALIZE' | 'ABSENT' | 'OPEN_AGENDA' | 'CLOSE_AGENDA' | 'SETTINGS' | 'MANAGE_USERS' | 'MANAGE_SERVICES' | null>(null);
  const [tempConfig, setTempConfig] = useState<AppConfig | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [showAddUserForm, setShowAddUserForm] = useState(false);
  const [newUser, setNewUser] = useState({ email: '', nome: '', isAdmin: false });
  const [userError, setUserError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<AdminTab>('FILA');
  const [services, setServices] = useState<any[]>([]);
  const [showAddServiceForm, setShowAddServiceForm] = useState(false);
  const [editingService, setEditingService] = useState<any | null>(null);
  const [newService, setNewService] = useState({ nome: '', tempoBase: 30, preco: 0 });
  const [serviceError, setServiceError] = useState<string | null>(null);

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

  const handleAction = async () => {
    if (!modalType || !config) return;
    setSubmitting(true);
    try {
      switch (modalType) {
        case 'FINALIZE':
          if (inService) await AttendanceService.finalizeAttendance(inService, config, user?.email || '');
          break;
        case 'ABSENT':
          if (inService) await AttendanceService.markAsAbsent(inService, config);
          break;
        case 'OPEN_AGENDA':
          await ConfigService.toggleAgenda(true);
          break;
        case 'CLOSE_AGENDA':
          await ConfigService.toggleAgenda(false);
          break;
        case 'SETTINGS':
          if (tempConfig) {
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
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const openManageUsers = async () => {
    setShowAddUserForm(false);
    setNewUser({ email: '', nome: '', isAdmin: false });
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
      await UserService.createUser(newUser.email, newUser.nome, newUser.isAdmin);
      const list = await UserService.listUsers();
      setUsers(list);
      setShowAddUserForm(false);
      setNewUser({ email: '', nome: '', isAdmin: false });
    } catch (err: any) {
      setUserError(err.message || 'Erro ao criar usuário.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleRole = async (u: AppUser) => {
    try {
      await UserService.updateRole(u.id, !u.isAdmin);
      setUsers(prev => prev.map(x => x.id === u.id ? { ...x, isAdmin: !u.isAdmin } : x));
    } catch {
      setUserError('Erro ao atualizar permissão.');
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
    window.location.href = '/login';
    return null;
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] p-6 flex flex-col items-center justify-center text-center space-y-6">
        <Lock className="h-12 w-12 text-[#EF4444]" />
        <h1 className="text-2xl font-bold text-[#F1F5F9]">Acesso Negado</h1>
        <p className="text-[#64748B]">Sua conta ({user.email}) não tem permissão de administrador.</p>
        <Button onClick={() => window.location.href = '/login'}>Fazer login com outra conta</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      {/* Header sticky — visível em todas as tabs */}
      <header className="sticky top-0 z-40 bg-[#0A0A0A]/95 backdrop-blur-sm border-b border-[#1E1E1E] px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="space-y-0.5">
            <h1 className="text-xs font-bold uppercase tracking-[0.2em] text-[#00D4A5]">
              {activeTab === 'FILA' ? 'Painel do Barbeiro' : activeTab === 'METRICAS' ? 'Métricas' : 'Clientes'}
            </h1>
            <p className="text-lg font-bold tracking-tight text-[#F1F5F9]">
              {activeTab === 'FILA' ? `Olá, ${config?.BARBER_NAME}` : activeTab === 'METRICAS' ? 'Análise de desempenho' : 'Gerenciar clientes'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={openManageServices} title="Gerenciar serviços">
              <Scissors className="h-5 w-5 text-[#64748B]" />
            </Button>
            <Button variant="ghost" size="icon" onClick={openManageUsers} title="Gerenciar usuários">
              <UserPlus className="h-5 w-5 text-[#64748B]" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => { setTempConfig(config); setModalType('SETTINGS'); setIsModalOpen(true); }}>
              <Settings className="h-5 w-5 text-[#64748B]" />
            </Button>
            <Button variant="ghost" size="icon" onClick={signOut}>
              <UserMinus className="h-5 w-5 text-[#64748B]" />
            </Button>
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
          <main className="p-6 pb-24 max-w-4xl mx-auto space-y-8">
        {error && (
          <div className="p-4 rounded-xl bg-[#EF4444]/10 border border-[#EF4444]/20 text-[#EF4444] text-sm flex items-center gap-3">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}
        {/* Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4 space-y-2">
            <Users className="h-4 w-4 text-[#64748B]" />
            <p className="text-2xl font-bold text-[#F1F5F9]">{metrics?.totalAttended || 0}</p>
            <p className="text-xs font-medium text-[#64748B] uppercase">Atendidos</p>
          </Card>
          <Card className="p-4 space-y-2">
            <TimerIcon className="h-4 w-4 text-[#64748B]" />
            <p className="text-2xl font-bold text-[#F1F5F9]">{metrics?.averageTime || 0}m</p>
            <p className="text-xs font-medium text-[#64748B] uppercase">Média</p>
          </Card>
          <Card className="p-4 space-y-2">
            <TrendingUp className="h-4 w-4 text-[#64748B]" />
            <p className="text-2xl font-bold text-[#F1F5F9]">{metrics?.adherence || 100}%</p>
            <p className="text-xs font-medium text-[#64748B] uppercase">Aderência</p>
          </Card>
          <Card className="p-4 space-y-2">
            <Clock className="h-4 w-4 text-[#64748B]" />
            <p className="text-2xl font-bold text-[#F1F5F9]">{waiting.length}</p>
            <p className="text-xs font-medium text-[#64748B] uppercase">Fila</p>
          </Card>
        </div>

        <div className="flex justify-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => ConfigService.initialize().then(() => alert('Config inicializada!'))}>
            Resetar Configurações
          </Button>
        </div>

        {/* Debug Info (Only for development/troubleshooting) */}
        <div className="text-[10px] text-[#64748B]/30 font-mono uppercase tracking-widest text-center">
          Status: {state?.agendaAberta ? 'Aberta' : 'Fechada'} | Doc: {state ? 'Existe' : 'Nulo'}
        </div>

        {/* Current Service Section */}
        <section className="space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-widest text-[#64748B] ml-1">Atendimento Atual</h2>
          {inService ? (
            <Card className="relative overflow-hidden border-[#00D4A5]/20">
              <div className="flex flex-col md:flex-row items-center gap-8">
                <Timer 
                  startTime={inService.horaChamada || Date.now()} 
                  estimatedMinutes={inService.tempoEstimado} 
                  className="shrink-0"
                />
                <div className="flex-1 space-y-6 text-center md:text-left">
                  <div className="space-y-2">
                    <h3 className="text-3xl font-bold text-[#F1F5F9] tracking-tight">{inService.clienteNome}</h3>
                    <p className="text-[#00D4A5] font-medium">{inService.servicos}</p>
                  </div>
                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                    <Button 
                      className="h-12 px-8 font-bold"
                      onClick={() => { setModalType('FINALIZE'); setIsModalOpen(true); }}
                    >
                      <Check className="mr-2 h-5 w-5" /> Finalizar
                    </Button>
                    <Button 
                      variant="secondary" 
                      className="h-12 px-8 font-bold"
                      onClick={() => { setModalType('ABSENT'); setIsModalOpen(true); }}
                    >
                      <UserMinus className="mr-2 h-5 w-5" /> Ausente
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ) : (
            <Card className="h-48 flex flex-col items-center justify-center text-center space-y-4 border-dashed">
              <div className="h-12 w-12 rounded-full bg-[#1A1A1A] flex items-center justify-center">
                <Scissors className="h-6 w-6 text-[#64748B]" />
              </div>
              <p className="text-[#64748B] font-medium">Nenhum cliente em atendimento</p>
              {waiting.length > 0 && (
                <Button onClick={handleCallNext} loading={submitting}>
                  <Play className="mr-2 h-4 w-4" /> Chamar Próximo ({waiting[0].clienteNome})
                </Button>
              )}
            </Card>
          )}
        </section>

        {/* Queue List */}
        <section className="space-y-4">
          <div className="flex items-center justify-between ml-1">
            <h2 className="text-xs font-bold uppercase tracking-widest text-[#64748B]">Próximos na Fila</h2>
            <span className="text-xs font-bold text-[#00D4A5]">{waiting.length} clientes</span>
          </div>
          <div className="space-y-3">
            {waiting.map((item, index) => (
              <Card key={item.id} className="p-4 flex items-center justify-between group hover:border-[#00D4A5]/30 transition-all">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-xl bg-[#1A1A1A] flex items-center justify-center text-sm font-bold text-[#64748B]">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-bold text-[#F1F5F9]">{item.clienteNome}</p>
                    <p className="text-xs text-[#64748B]">{item.servicos}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-[#F1F5F9]">
                    {typeof item.horaPrevista === 'string'
                      ? item.horaPrevista.match(/^\d{2}:\d{2}/)
                        ? item.horaPrevista
                        : item.horaPrevista.substring(0, 5)
                      : '00:00'}
                  </p>
                  <p className="text-[10px] uppercase tracking-wider text-[#64748B] font-bold">Previsto</p>
                </div>
              </Card>
            ))}
            {waiting.length === 0 && (
              <div className="py-12 text-center space-y-2">
                <p className="text-[#64748B] font-medium">Fila vazia</p>
                <p className="text-xs text-[#64748B]/50 uppercase tracking-widest">Aguardando novos clientes</p>
              </div>
            )}
          </div>
        </section>

        {/* Agenda Controls */}
        <section className="pt-8 border-t border-[#1E1E1E]">
          <Card className="bg-gradient-to-br from-[#111111] to-[#0A0A0A] border-[#00D4A5]/10">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="space-y-1 text-center md:text-left">
                <h3 className="text-lg font-bold text-[#F1F5F9]">Controle da Agenda</h3>
                <p className="text-sm text-[#64748B]">
                  {state?.agendaAberta 
                    ? 'A agenda está aberta e recebendo novos clientes.' 
                    : 'A agenda está fechada. Clientes não podem entrar na fila.'}
                </p>
              </div>
              <Button 
                variant={state?.agendaAberta ? 'outline' : 'primary'}
                className="h-12 px-8 font-bold min-w-[200px]"
                onClick={() => {
                  setModalType(state?.agendaAberta ? 'CLOSE_AGENDA' : 'OPEN_AGENDA');
                  setIsModalOpen(true);
                }}
              >
                {state?.agendaAberta ? (
                  <><Lock className="mr-2 h-4 w-4" /> Fechar Agenda</>
                ) : (
                  <><Unlock className="mr-2 h-4 w-4" /> Abrir Agenda</>
                )}
              </Button>
            </div>
          </Card>
        </section>
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
          modalType === 'SETTINGS' ? 'Configurações Automáticas' :
          modalType === 'MANAGE_USERS' ? 'Gerenciar Usuários' :
          modalType === 'MANAGE_SERVICES' ? 'Gerenciar Serviços' : 'Fechar Agenda'
        }
        footer={modalType !== 'MANAGE_USERS' && modalType !== 'MANAGE_SERVICES' ? (
          <>
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
            <Button
              variant={modalType === 'ABSENT' || modalType === 'CLOSE_AGENDA' ? 'danger' : 'primary'}
              onClick={handleAction}
              loading={submitting}
            >
              {modalType === 'SETTINGS' ? 'Salvar' : 'Confirmar'}
            </Button>
          </>
        ) : undefined}
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
                  <button
                    onClick={() => handleToggleRole(u)}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors',
                      u.isAdmin
                        ? 'bg-[#00D4A5]/10 text-[#00D4A5] hover:bg-[#EF4444]/10 hover:text-[#EF4444]'
                        : 'bg-[#334155]/20 text-[#64748B] hover:bg-[#00D4A5]/10 hover:text-[#00D4A5]'
                    )}
                    title={u.isAdmin ? 'Remover admin' : 'Tornar admin'}
                  >
                    {u.isAdmin ? <Shield className="h-3 w-3" /> : <ShieldOff className="h-3 w-3" />}
                    {u.isAdmin ? 'Admin' : 'Usuário'}
                  </button>
                </div>
              ))}
            </div>

            {/* Add user form */}
            {showAddUserForm ? (
              <div className="space-y-3 p-4 rounded-xl bg-[#111111] border border-[#00D4A5]/20">
                <p className="text-xs font-bold uppercase tracking-widest text-[#64748B]">Novo Usuário</p>
                <input
                  type="text"
                  placeholder="Nome completo"
                  value={newUser.nome}
                  onChange={e => setNewUser(p => ({ ...p, nome: e.target.value }))}
                  className="flex h-11 w-full rounded-xl border border-[#1E1E1E] bg-[#0A0A0A] px-4 text-sm text-[#F1F5F9] placeholder:text-[#64748B] focus:outline-none focus:border-[#00D4A5] transition-all"
                />
                <input
                  type="email"
                  placeholder="Email"
                  value={newUser.email}
                  onChange={e => setNewUser(p => ({ ...p, email: e.target.value }))}
                  className="flex h-11 w-full rounded-xl border border-[#1E1E1E] bg-[#0A0A0A] px-4 text-sm text-[#F1F5F9] placeholder:text-[#64748B] focus:outline-none focus:border-[#00D4A5] transition-all"
                />
                <div className="flex items-center justify-between p-3 rounded-xl bg-[#1A1A1A] border border-[#1E1E1E]">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-[#64748B]" />
                    <span className="text-sm font-medium text-[#F1F5F9]">Admin</span>
                  </div>
                  <button
                    onClick={() => setNewUser(p => ({ ...p, isAdmin: !p.isAdmin }))}
                    className={cn(
                      'w-11 h-6 rounded-full transition-colors relative',
                      newUser.isAdmin ? 'bg-[#00D4A5]' : 'bg-[#334155]'
                    )}
                  >
                    <div className={cn(
                      'absolute top-1 w-4 h-4 rounded-full bg-white transition-all',
                      newUser.isAdmin ? 'left-6' : 'left-1'
                    )} />
                  </button>
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
          <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2">
            <div className="flex items-center justify-between p-4 rounded-xl bg-[#1A1A1A] border border-[#1E1E1E]">
              <div className="space-y-1">
                <p className="text-sm font-bold text-[#F1F5F9]">Abertura Automática</p>
                <p className="text-xs text-[#64748B]">Abrir e fechar a fila baseado no horário</p>
              </div>
              <button 
                onClick={() => setTempConfig({ ...tempConfig, AUTO_OPEN_CLOSE: !tempConfig.AUTO_OPEN_CLOSE })}
                className={cn(
                  "w-12 h-6 rounded-full transition-colors relative",
                  tempConfig.AUTO_OPEN_CLOSE ? "bg-[#00D4A5]" : "bg-[#334155]"
                )}
              >
                <div className={cn(
                  "absolute top-1 w-4 h-4 rounded-full bg-white transition-all",
                  tempConfig.AUTO_OPEN_CLOSE ? "left-7" : "left-1"
                )} />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs font-bold uppercase tracking-widest text-[#64748B] ml-1">Agenda Semanal</p>
              {['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'].map((dayName, index) => {
                const schedule = tempConfig.WEEKLY_SCHEDULE?.find(s => s.day === index) || { day: index, enabled: false, openTime: '09:00', closeTime: '19:00' };
                return (
                  <div key={index} className="p-4 rounded-xl bg-[#111111] border border-[#1E1E1E] space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-[#F1F5F9]">{dayName}</p>
                      <button 
                        onClick={() => {
                          const newSchedule = [...(tempConfig.WEEKLY_SCHEDULE || [])];
                          const idx = newSchedule.findIndex(s => s.day === index);
                          if (idx >= 0) {
                            newSchedule[idx] = { ...newSchedule[idx], enabled: !newSchedule[idx].enabled };
                          } else {
                            newSchedule.push({ day: index, enabled: true, openTime: '09:00', closeTime: '19:00' });
                          }
                          setTempConfig({ ...tempConfig, WEEKLY_SCHEDULE: newSchedule });
                        }}
                        className={cn(
                          "px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors",
                          schedule.enabled ? "bg-[#00D4A5]/10 text-[#00D4A5]" : "bg-[#334155]/20 text-[#64748B]"
                        )}
                      >
                        {schedule.enabled ? 'Ativo' : 'Inativo'}
                      </button>
                    </div>
                    {schedule.enabled && (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] uppercase tracking-widest text-[#64748B] font-bold">Abertura</label>
                          <input 
                            type="time" 
                            value={schedule.openTime}
                            onChange={(e) => {
                              const newSchedule = [...(tempConfig.WEEKLY_SCHEDULE || [])];
                              const idx = newSchedule.findIndex(s => s.day === index);
                              newSchedule[idx] = { ...newSchedule[idx], openTime: e.target.value };
                              setTempConfig({ ...tempConfig, WEEKLY_SCHEDULE: newSchedule });
                            }}
                            className="w-full bg-[#1A1A1A] border border-[#1E1E1E] rounded-lg px-3 py-2 text-sm text-[#F1F5F9] focus:outline-none focus:border-[#00D4A5]/50"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] uppercase tracking-widest text-[#64748B] font-bold">Fechamento</label>
                          <input 
                            type="time" 
                            value={schedule.closeTime}
                            onChange={(e) => {
                              const newSchedule = [...(tempConfig.WEEKLY_SCHEDULE || [])];
                              const idx = newSchedule.findIndex(s => s.day === index);
                              newSchedule[idx] = { ...newSchedule[idx], closeTime: e.target.value };
                              setTempConfig({ ...tempConfig, WEEKLY_SCHEDULE: newSchedule });
                            }}
                            className="w-full bg-[#1A1A1A] border border-[#1E1E1E] rounded-lg px-3 py-2 text-sm text-[#F1F5F9] focus:outline-none focus:border-[#00D4A5]/50"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
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
              <div className="space-y-3 p-4 rounded-xl bg-[#111111] border border-[#00D4A5]/20">
                <p className="text-xs font-bold uppercase tracking-widest text-[#64748B]">Editando Serviço</p>
                <input
                  type="text"
                  placeholder="Nome do serviço"
                  value={editingService.nome}
                  onChange={e => setEditingService(p => ({ ...p, nome: e.target.value }))}
                  className="flex h-11 w-full rounded-xl border border-[#1E1E1E] bg-[#0A0A0A] px-4 text-sm text-[#F1F5F9] placeholder:text-[#64748B] focus:outline-none focus:border-[#00D4A5] transition-all"
                />
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-widest text-[#64748B] font-bold">Tempo (min)</label>
                    <input
                      type="number"
                      value={editingService.tempoBase}
                      onChange={e => setEditingService(p => ({ ...p, tempoBase: parseInt(e.target.value) || 0 }))}
                      className="flex h-11 w-full rounded-xl border border-[#1E1E1E] bg-[#0A0A0A] px-4 text-sm text-[#F1F5F9] placeholder:text-[#64748B] focus:outline-none focus:border-[#00D4A5] transition-all"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-widest text-[#64748B] font-bold">Preço (R$)</label>
                    <input
                      type="number"
                      value={editingService.preco}
                      onChange={e => setEditingService(p => ({ ...p, preco: parseFloat(e.target.value) || 0 }))}
                      className="flex h-11 w-full rounded-xl border border-[#1E1E1E] bg-[#0A0A0A] px-4 text-sm text-[#F1F5F9] placeholder:text-[#64748B] focus:outline-none focus:border-[#00D4A5] transition-all"
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
              <div className="space-y-3 p-4 rounded-xl bg-[#111111] border border-[#00D4A5]/20">
                <p className="text-xs font-bold uppercase tracking-widest text-[#64748B]">Novo Serviço</p>
                <input
                  type="text"
                  placeholder="Nome do serviço"
                  value={newService.nome}
                  onChange={e => setNewService(p => ({ ...p, nome: e.target.value }))}
                  className="flex h-11 w-full rounded-xl border border-[#1E1E1E] bg-[#0A0A0A] px-4 text-sm text-[#F1F5F9] placeholder:text-[#64748B] focus:outline-none focus:border-[#00D4A5] transition-all"
                />
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-widest text-[#64748B] font-bold">Tempo (min)</label>
                    <input
                      type="number"
                      value={newService.tempoBase}
                      onChange={e => setNewService(p => ({ ...p, tempoBase: parseInt(e.target.value) || 0 }))}
                      className="flex h-11 w-full rounded-xl border border-[#1E1E1E] bg-[#0A0A0A] px-4 text-sm text-[#F1F5F9] placeholder:text-[#64748B] focus:outline-none focus:border-[#00D4A5] transition-all"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-widest text-[#64748B] font-bold">Preço (R$)</label>
                    <input
                      type="number"
                      value={newService.preco}
                      onChange={e => setNewService(p => ({ ...p, preco: parseFloat(e.target.value) || 0 }))}
                      className="flex h-11 w-full rounded-xl border border-[#1E1E1E] bg-[#0A0A0A] px-4 text-sm text-[#F1F5F9] placeholder:text-[#64748B] focus:outline-none focus:border-[#00D4A5] transition-all"
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
                      <span className="text-[#00D4A5]">R$ {s.preco.toFixed(2)}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleToggleServiceActive(s)}
                      className={cn(
                        'px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors',
                        s.ativo ? 'bg-[#00D4A5]/10 text-[#00D4A5]' : 'bg-[#334155]/20 text-[#64748B]'
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
        ) : (
          <p className="text-[#64748B] leading-relaxed">
            {modalType === 'FINALIZE' ? `Deseja confirmar a finalização do atendimento de ${inService?.clienteNome}? O histórico será salvo e a média de tempo atualizada.` :
             modalType === 'ABSENT' ? `Deseja marcar ${inService?.clienteNome} como ausente? O cliente será removido da fila e o próximo será chamado.` :
             modalType === 'OPEN_AGENDA' ? 'Deseja abrir a agenda para hoje? Clientes poderão entrar na fila através do link público.' :
             'Deseja fechar a agenda? Novos clientes não poderão entrar na fila, mas os que já estão nela continuarão sendo atendidos.'}
          </p>
        )}
      </Modal>
    </div>
  );
}
