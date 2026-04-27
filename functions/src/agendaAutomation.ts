export const DEFAULT_TIME_ZONE = "America/Sao_Paulo";
export const STATUS_HISTORY_LIMIT = 200;

export type AgendaAction = "OPEN" | "CLOSE" | "CLEAR_MANUAL_OVERRIDE" | "NOOP";

export type BarberStatus =
  | "AGUARDANDO_CLIENTE"
  | "EM_CORTE"
  | "EM_PAUSA"
  | "FILA_FECHADA";

export type BarberStatusAction =
  | "ABRIU_AGENDA"
  | "FECHOU_FILA"
  | "INICIALIZACAO"
  | "PAUSA_CONFIRMADA"
  | "RETOMOU_PAUSA"
  | "CHAMOU_PROXIMO_CLIENTE"
  | "SEM_CLIENTE_CHAMADO"
  | "SINCRONIZACAO_SISTEMA";

export interface DaySchedule {
  day: number;
  enabled: boolean;
  openTime: string;
  closeTime: string;
}

export interface AppConfig {
  AUTO_OPEN_CLOSE?: boolean;
  TIMEZONE?: string | null;
  WEEKLY_SCHEDULE?: DaySchedule[] | null;
}

export interface BarberStatusHistoryEntry {
  status: BarberStatus;
  action: BarberStatusAction;
  startedAt: number;
}

export interface AppState {
  agendaAberta?: boolean;
  agendaPausada?: boolean;
  dataAbertura?: string | null;
  barberStatus?: BarberStatus;
  barberStatusStartedAt?: number | null;
  barberStatusLastAction?: BarberStatusAction | null;
  barberStatusHistory?: BarberStatusHistoryEntry[];
  manualOverrideCloseTime?: string | null;
  manualOverrideDate?: string | null;
}

export interface BusinessClock {
  timeZone: string;
  dateString: string;
  dayOfWeek: number;
  hour: string;
  minute: string;
  minutesSinceMidnight: number;
}

export interface StateUpdate {
  agendaAberta?: boolean;
  agendaPausada?: boolean;
  dataAbertura?: string | null;
  manualOverrideCloseTime?: string | null;
  manualOverrideDate?: string | null;
  barberStatus?: BarberStatus;
  barberStatusStartedAt?: number;
  barberStatusLastAction?: BarberStatusAction;
  barberStatusHistory?: BarberStatusHistoryEntry[];
}

type DateTimePartType = Intl.DateTimeFormatPartTypes | "weekday";

const weekdayByName: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

export function resolveTimeZone(timeZone?: string | null): string {
  if (!timeZone) {
    return DEFAULT_TIME_ZONE;
  }

  try {
    new Intl.DateTimeFormat("en-US", { timeZone }).format(new Date());
    return timeZone;
  } catch {
    return DEFAULT_TIME_ZONE;
  }
}

export function getBusinessClock(now: Date, configuredTimeZone?: string | null): BusinessClock {
  const timeZone = resolveTimeZone(configuredTimeZone);
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });

  const parts = formatter.formatToParts(now).reduce<Record<string, string>>((acc, part) => {
    if (part.type !== "literal") {
      acc[part.type as DateTimePartType] = part.value;
    }
    return acc;
  }, {});

  const year = parts.year;
  const month = parts.month;
  const day = parts.day;
  const hour = parts.hour;
  const minute = parts.minute;
  const weekday = parts.weekday;
  const parsedHour = Number(hour);
  const parsedMinute = Number(minute);

  if (
    !year ||
    !month ||
    !day ||
    !hour ||
    !minute ||
    !weekday ||
    Number.isNaN(parsedHour) ||
    Number.isNaN(parsedMinute)
  ) {
    throw new Error(`Unable to resolve local business time for ${timeZone}`);
  }

  return {
    timeZone,
    dateString: `${year}-${month}-${day}`,
    dayOfWeek: weekdayByName[weekday],
    hour,
    minute,
    minutesSinceMidnight: parsedHour * 60 + parsedMinute,
  };
}

export function parseTimeToMinutes(time: string | null | undefined): number | null {
  if (!time || !/^\d{2}:\d{2}$/.test(time)) {
    return null;
  }

  const [hourPart, minutePart] = time.split(":");
  const hour = Number(hourPart);
  const minute = Number(minutePart);

  if (
    !Number.isInteger(hour) ||
    !Number.isInteger(minute) ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return null;
  }

  return hour * 60 + minute;
}

export function decideAgendaAction(
  config: AppConfig,
  state: AppState,
  now: Date
): AgendaAction {
  if (!config.AUTO_OPEN_CLOSE || !Array.isArray(config.WEEKLY_SCHEDULE)) {
    return "NOOP";
  }

  const clock = getBusinessClock(now, config.TIMEZONE);
  const agendaIsOpen = state.agendaAberta === true;
  const manualOverrideCloseMinutes = parseTimeToMinutes(state.manualOverrideCloseTime);
  const hasManualOverrideForToday =
    state.manualOverrideDate === clock.dateString && manualOverrideCloseMinutes !== null;

  if (hasManualOverrideForToday) {
    if (clock.minutesSinceMidnight < manualOverrideCloseMinutes) {
      return "NOOP";
    }

    return agendaIsOpen ? "CLOSE" : "CLEAR_MANUAL_OVERRIDE";
  }

  const todaySchedule = config.WEEKLY_SCHEDULE.find((schedule) => schedule.day === clock.dayOfWeek);

  if (!todaySchedule?.enabled) {
    return agendaIsOpen ? "CLOSE" : "NOOP";
  }

  const openMinutes = parseTimeToMinutes(todaySchedule.openTime);
  const closeMinutes = parseTimeToMinutes(todaySchedule.closeTime);

  if (openMinutes === null || closeMinutes === null || closeMinutes <= openMinutes) {
    return "NOOP";
  }

  const shouldBeOpen =
    clock.minutesSinceMidnight >= openMinutes &&
    clock.minutesSinceMidnight < closeMinutes;

  if (shouldBeOpen && !agendaIsOpen) {
    return "OPEN";
  }

  if (!shouldBeOpen && agendaIsOpen) {
    return "CLOSE";
  }

  return "NOOP";
}

export function buildStateUpdate(
  action: AgendaAction,
  state: AppState,
  businessDate: string,
  startedAt: number
): StateUpdate {
  if (action === "OPEN") {
    return {
      agendaAberta: true,
      agendaPausada: false,
      dataAbertura: businessDate,
      ...buildBarberStatusUpdate(state, "AGUARDANDO_CLIENTE", "ABRIU_AGENDA", startedAt),
    };
  }

  if (action === "CLOSE") {
    return {
      agendaAberta: false,
      agendaPausada: false,
      dataAbertura: null,
      manualOverrideCloseTime: null,
      manualOverrideDate: null,
      ...buildBarberStatusUpdate(state, "FILA_FECHADA", "FECHOU_FILA", startedAt),
    };
  }

  if (action === "CLEAR_MANUAL_OVERRIDE") {
    return {
      manualOverrideCloseTime: null,
      manualOverrideDate: null,
    };
  }

  return {};
}

function buildBarberStatusUpdate(
  state: AppState,
  status: BarberStatus,
  action: BarberStatusAction,
  startedAt: number
): StateUpdate {
  const currentHistory = Array.isArray(state.barberStatusHistory)
    ? state.barberStatusHistory
    : [];
  const shouldStartNewStatus = state.barberStatus !== status || !state.barberStatusStartedAt;
  const nextStartedAt = shouldStartNewStatus ? startedAt : state.barberStatusStartedAt;
  const nextHistory = shouldStartNewStatus
    ? [...currentHistory, { status, action, startedAt }].slice(-STATUS_HISTORY_LIMIT)
    : currentHistory;

  return {
    barberStatus: status,
    barberStatusStartedAt: nextStartedAt ?? startedAt,
    barberStatusLastAction: action,
    barberStatusHistory: nextHistory,
  };
}
