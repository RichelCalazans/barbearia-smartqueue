import type {
  AppConfig,
  AppState,
  Attendance,
  Client,
  DaySchedule,
  QueueItem,
  Service,
} from '../types';

export function createWeeklySchedule(
  overrides: Array<Partial<DaySchedule> & Pick<DaySchedule, 'day'>> = []
): DaySchedule[] {
  const base: DaySchedule[] = [
    {day: 0, enabled: false, openTime: '09:00', closeTime: '18:00'},
    {day: 1, enabled: true, openTime: '09:00', closeTime: '19:00'},
    {day: 2, enabled: true, openTime: '09:00', closeTime: '19:00'},
    {day: 3, enabled: true, openTime: '09:00', closeTime: '19:00'},
    {day: 4, enabled: true, openTime: '09:00', closeTime: '19:00'},
    {day: 5, enabled: true, openTime: '09:00', closeTime: '19:00'},
    {day: 6, enabled: true, openTime: '08:00', closeTime: '14:00'},
  ];

  return base.map(day => ({
    ...day,
    ...(overrides.find(override => override.day === day.day) ?? {}),
  }));
}

export function createAppConfig(overrides: Partial<AppConfig> = {}): AppConfig {
  return {
    BUFFER_MINUTES: 8,
    EWMA_ALPHA: 0.3,
    NEW_CLIENT_MULTIPLIER: 1.25,
    MAX_DAILY_CLIENTS: 30,
    OPENING_TIME: '09:00',
    CLOSING_TIME: '19:00',
    BARBER_EMAIL: 'barber@example.com',
    BARBER_NAME: 'Barbeiro',
    SHOP_NAME: 'Barbearia SmartQueue',
    AUTO_REFRESH_SECONDS: 12,
    TIMEZONE: 'America/Sao_Paulo',
    WEEKLY_SCHEDULE: createWeeklySchedule(),
    AUTO_OPEN_CLOSE: false,
    LOGO_URL: '',
    PRIMARY_COLOR: '#00D4A5',
    SECONDARY_COLOR: '#1A1A1A',
    ACCENT_COLOR: '#0A0A0A',
    DARK_MODE: true,
    ...overrides,
  };
}

export function createAppState(overrides: Partial<AppState> = {}): AppState {
  return {
    agendaAberta: false,
    agendaPausada: false,
    dataAbertura: null,
    barberStatus: 'FILA_FECHADA',
    barberStatusStartedAt: 1_775_779_200_000,
    barberStatusLastAction: 'INICIALIZACAO',
    barberStatusHistory: [],
    ...overrides,
  };
}

export function createClient(overrides: Partial<Client> = {}): Client {
  return {
    id: 'client-1',
    nome: 'Cliente Teste',
    telefone: '(82) 99999-0000',
    telefoneNormalizado: '82999990000',
    totalVisitas: 0,
    tempoMedio: 0,
    dataCadastro: 1_775_779_200_000,
    ativo: true,
    registrationStatus: 'ACTIVE',
    createdOrigin: 'CLIENT_SELF',
    createdByBarber: false,
    hasCompletedSignup: true,
    completedAt: 1_775_779_200_000,
    authUid: 'auth-client-1',
    updatedAt: 1_775_779_200_000,
    ...overrides,
  };
}

export function createService(overrides: Partial<Service> = {}): Service {
  return {
    id: 'service-1',
    nome: 'Corte',
    tempoBase: 30,
    preco: 35,
    ativo: true,
    ...overrides,
  };
}

export function createQueueItem(overrides: Partial<QueueItem> = {}): QueueItem {
  return {
    id: 'queue-1',
    posicao: 1,
    clienteId: 'client-1',
    clienteNome: 'Cliente Teste',
    servicos: 'Corte',
    servicosIds: ['service-1'],
    tempoEstimado: 38,
    horaPrevista: '09:38',
    status: 'AGUARDANDO',
    horaEntrada: 1_775_779_200_000,
    data: '2026-04-27',
    telefone: '(82) *****-0000',
    manual: false,
    ...overrides,
  };
}

export function createAttendance(overrides: Partial<Attendance> = {}): Attendance {
  return {
    id: 'attendance-1',
    clienteId: 'client-1',
    clienteNome: 'Cliente Teste',
    servicos: 'Corte',
    data: '2026-04-27',
    horaInicio: 1_775_779_200_000,
    horaFim: 1_775_781_000_000,
    duracaoReal: 30,
    duracaoEstimada: 38,
    barbeiro: 'Barbeiro',
    manual: false,
    ...overrides,
  };
}
