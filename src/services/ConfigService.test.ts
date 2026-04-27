import {describe, expect, it, vi} from 'vitest';
import {createAppConfig, createWeeklySchedule} from '../test/factories';

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  getDoc: vi.fn(),
  onSnapshot: vi.fn(),
  runTransaction: vi.fn(),
  setDoc: vi.fn(),
  updateDoc: vi.fn(),
}));

vi.mock('../firebase', () => ({
  db: {},
  handleFirestoreError: vi.fn((error: unknown) => {
    throw error;
  }),
  OperationType: {
    CREATE: 'create',
    UPDATE: 'update',
    DELETE: 'delete',
    LIST: 'list',
    GET: 'get',
    WRITE: 'write',
  },
}));

import {ConfigService} from './ConfigService';

describe('ConfigService.deriveBarberStatus', () => {
  it('derives FILA_FECHADA when the agenda is closed', () => {
    expect(ConfigService.deriveBarberStatus(false, false, false)).toBe('FILA_FECHADA');
  });

  it('keeps FILA_FECHADA as the highest priority closed state', () => {
    expect(ConfigService.deriveBarberStatus(false, true, true)).toBe('FILA_FECHADA');
  });

  it('derives EM_PAUSA when the agenda is open and paused', () => {
    expect(ConfigService.deriveBarberStatus(true, true, false)).toBe('EM_PAUSA');
  });

  it('prioritizes EM_PAUSA over EM_CORTE', () => {
    expect(ConfigService.deriveBarberStatus(true, true, true)).toBe('EM_PAUSA');
  });

  it('derives EM_CORTE when a client is in service', () => {
    expect(ConfigService.deriveBarberStatus(true, false, true)).toBe('EM_CORTE');
  });

  it('derives AGUARDANDO_CLIENTE when open, unpaused, and idle', () => {
    expect(ConfigService.deriveBarberStatus(true, false, false)).toBe('AGUARDANDO_CLIENTE');
  });
});

describe('ConfigService.isOutsideScheduledWindow', () => {
  it('returns false when auto open/close is disabled', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-27T08:00:00'));
    const config = createAppConfig({AUTO_OPEN_CLOSE: false});

    expect(ConfigService.isOutsideScheduledWindow(config)).toBe(false);
  });

  it('returns true when today is disabled', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-26T12:00:00'));
    const config = createAppConfig({AUTO_OPEN_CLOSE: true});

    expect(ConfigService.isOutsideScheduledWindow(config)).toBe(true);
  });

  it('returns true before the scheduled opening time', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-27T08:59:00'));
    const config = createAppConfig({AUTO_OPEN_CLOSE: true});

    expect(ConfigService.isOutsideScheduledWindow(config)).toBe(true);
  });

  it('returns false exactly at the scheduled opening time', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-27T09:00:00'));
    const config = createAppConfig({AUTO_OPEN_CLOSE: true});

    expect(ConfigService.isOutsideScheduledWindow(config)).toBe(false);
  });

  it('returns false inside a Saturday schedule with a different close time', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-02T13:59:00'));
    const config = createAppConfig({AUTO_OPEN_CLOSE: true});

    expect(ConfigService.isOutsideScheduledWindow(config)).toBe(false);
  });

  it('returns true exactly at the scheduled closing time', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-02T14:00:00'));
    const config = createAppConfig({AUTO_OPEN_CLOSE: true});

    expect(ConfigService.isOutsideScheduledWindow(config)).toBe(true);
  });

  it('returns true when there is no schedule entry for today', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-28T12:00:00'));
    const config = createAppConfig({
      AUTO_OPEN_CLOSE: true,
      WEEKLY_SCHEDULE: createWeeklySchedule().filter(schedule => schedule.day !== 2),
    });

    expect(ConfigService.isOutsideScheduledWindow(config)).toBe(true);
  });
});
