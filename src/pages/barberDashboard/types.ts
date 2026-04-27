import type { Service, UserRole } from '../../types';

export type DashboardModalType =
  | 'FINALIZE'
  | 'ABSENT'
  | 'OPEN_AGENDA'
  | 'OPEN_AGENDA_CUSTOM_TIME'
  | 'CLOSE_AGENDA'
  | 'CLOSE_AGENDA_CHOICE'
  | 'CLOSE_AGENDA_CLEAR'
  | 'CLOSE_AGENDA_KEEP'
  | 'PAUSE_AGENDA'
  | 'PAUSE_TIME'
  | 'RESUME_AGENDA'
  | 'SETTINGS'
  | 'MANAGE_USERS'
  | 'MANAGE_SERVICES'
  | 'RESET_ESTIMATIVAS'
  | 'RESET_STATS'
  | 'ADD_MANUAL_CLIENT';

export interface NewUserForm {
  email: string;
  nome: string;
  role: UserRole;
}

export type ServiceForm = Pick<Service, 'nome' | 'tempoBase' | 'preco'>;

const MODAL_TITLES: Record<DashboardModalType, string> = {
  FINALIZE: 'Finalizar Atendimento',
  ABSENT: 'Marcar como Ausente',
  OPEN_AGENDA: 'Abrir Agenda',
  OPEN_AGENDA_CUSTOM_TIME: 'Abrir Fora do Horário',
  CLOSE_AGENDA: 'Fechar Agenda',
  CLOSE_AGENDA_CHOICE: 'Encerrar Dia',
  CLOSE_AGENDA_CLEAR: 'Encerrar Dia e Fila',
  CLOSE_AGENDA_KEEP: 'Encerrar Dia (Manter Fila)',
  PAUSE_AGENDA: 'Pausar Agenda',
  PAUSE_TIME: 'Quanto Tempo Pausar?',
  RESUME_AGENDA: 'Retomar Agenda',
  SETTINGS: 'Configurações Automáticas',
  MANAGE_USERS: 'Gerenciar Usuários',
  MANAGE_SERVICES: 'Gerenciar Serviços',
  RESET_ESTIMATIVAS: 'Estimativas de Tempo',
  RESET_STATS: 'Resetar Estatísticas de Hoje',
  ADD_MANUAL_CLIENT: 'Adicionar Cliente Manualmente',
};

export function getModalTitle(modalType: DashboardModalType | null): string {
  return modalType ? MODAL_TITLES[modalType] : 'Fechar Agenda';
}
