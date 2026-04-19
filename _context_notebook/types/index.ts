export type QueueStatus = 'AGUARDANDO' | 'EM_ATENDIMENTO' | 'CONCLUIDO' | 'CANCELADO' | 'AUSENTE';

export type BarberStatus = 'AGUARDANDO_CLIENTE' | 'EM_CORTE' | 'EM_PAUSA' | 'FILA_FECHADA';

export interface Client {
  id: string;
  nome: string;
  telefone: string;
  dataNascimento?: string; // YYYY-MM-DD
  totalVisitas: number;
  tempoMedio: number; // EWMA
  dataCadastro: number; // timestamp
  ativo: boolean;
}

export interface Service {
  id: string;
  nome: string;
  tempoBase: number;
  preco: number;
  ativo: boolean;
}

export interface QueueItem {
  id: string;
  posicao: number;
  clienteId: string;
  clienteNome: string;
  servicos: string; // comma separated names
  servicosIds: string[];
  tempoEstimado: number;
  horaPrevista: string; // HH:MM
  status: QueueStatus;
  horaEntrada: number;
  horaChamada?: number;
  horaFim?: number;
  data: string; // YYYY-MM-DD
  telefone: string; // masked
  manual: boolean;
}

export interface Attendance {
  id: string;
  clienteId: string;
  clienteNome: string;
  servicos: string;
  data: string;
  horaInicio: number;
  horaFim: number;
  duracaoReal: number;
  duracaoEstimada: number;
  barbeiro: string;
  manual: boolean;
}

export interface DaySchedule {
  day: number; // 0-6 (Sunday-Saturday)
  enabled: boolean;
  openTime: string; // HH:MM
  closeTime: string; // HH:MM
}

export interface AppConfig {
  BUFFER_MINUTES: number;
  EWMA_ALPHA: number;
  NEW_CLIENT_MULTIPLIER: number;
  MAX_DAILY_CLIENTS: number;
  OPENING_TIME: string;
  CLOSING_TIME: string;
  BARBER_EMAIL: string;
  BARBER_NAME: string;
  SHOP_NAME: string;
  AUTO_REFRESH_SECONDS: number;
  TIMEZONE: string;
  WEEKLY_SCHEDULE: DaySchedule[];
  AUTO_OPEN_CLOSE: boolean;
  // Customização visual
  LOGO_URL?: string;
  PRIMARY_COLOR?: string;  // Cor principal (hex)
  SECONDARY_COLOR?: string; // Cor secundária
  ACCENT_COLOR?: string;    // Cor de destaque
  DARK_MODE?: boolean;
}

export interface AppState {
  agendaAberta: boolean;
  agendaPausada: boolean;
  dataAbertura: string | null;
  tempoRetomada?: number | null; // timestamp when to auto-resume
  barberStatus?: BarberStatus; // current barber status visible to clients
  delayAlertStartedAt?: number | null; // timestamp when delay alert started
}

export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'BARBEIRO' | 'RECEPCIONISTA';

export type Permission = 
  | 'manage_queue' 
  | 'manage_clients' 
  | 'manage_services' 
  | 'manage_users' 
  | 'view_metrics' 
  | 'manage_settings';

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  SUPER_ADMIN: ['manage_queue', 'manage_clients', 'manage_services', 'manage_users', 'view_metrics', 'manage_settings'],
  ADMIN: ['manage_queue', 'manage_clients', 'manage_services', 'view_metrics', 'manage_settings'],
  BARBEIRO: ['manage_queue', 'manage_clients', 'view_metrics'],
  RECEPCIONISTA: ['manage_queue', 'manage_clients', 'view_metrics'],
};

export interface AppUser {
  id: string;
  email: string;
  nome: string;
  role: UserRole;
  permissions: Permission[];
  ativo: boolean;
  createdAt: number;
}

// === Metrics Types ===

export type MetricsPeriod = 'hoje' | '7dias' | '30dias';

export type ClientSegment = 'ALL' | 'ACTIVE' | 'VIP' | 'AT_RISK';

export interface PeriodMetrics {
  totalAttended: number;
  averageTime: number;
  retentionRate: number;
  noShowRate: number;
  chairUtilization: number;
  attendances: Attendance[];
  deltas: {
    totalAttended: number;
    averageTime: number;
    retentionRate: number;
    noShowRate: number;
  };
}

export interface DailyCount {
  date: string;
  count: number;
}

export interface HourDistribution {
  hour: number;
  count: number;
}

export interface ServicePopularity {
  name: string;
  count: number;
  percentage: number;
}

export interface ClientWithInsights extends Client {
  lastVisitDate?: string;
  averageInterval?: number;
  segment: 'NEW' | 'REGULAR' | 'VIP' | 'AT_RISK';
  birthdayThisMonth: boolean;
  isAtRisk: boolean;
}
