export type QueueStatus = 'AGUARDANDO' | 'EM_ATENDIMENTO' | 'CONCLUIDO' | 'CANCELADO' | 'AUSENTE';

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
}

export interface AppState {
  agendaAberta: boolean;
  agendaPausada: boolean;
  dataAbertura: string | null;
  tempoRetomada?: number | null; // timestamp when to auto-resume
}

export interface AppUser {
  id: string;
  email: string;
  nome: string;
  isAdmin: boolean;
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
