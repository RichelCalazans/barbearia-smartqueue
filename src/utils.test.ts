import {describe, expect, it, vi} from 'vitest';
import {createAppConfig, createWeeklySchedule} from './test/factories';
import {
  formatDateDisplay,
  getAvailableDates,
  getDayOfWeek,
  getScheduleForDate,
  isDateEnabled,
  maskPhone,
  normalizePhone,
} from './utils';

describe('date schedule utils', () => {
  it('gets the day of week from a YYYY-MM-DD date', () => {
    expect(getDayOfWeek('2026-04-26')).toBe(0);
    expect(getDayOfWeek('2026-04-27')).toBe(1);
    expect(getDayOfWeek('2026-05-02')).toBe(6);
  });

  it('disables dates whose weekly schedule entry is disabled', () => {
    const config = createAppConfig();

    expect(isDateEnabled('2026-04-26', config)).toBe(false);
  });

  it('enables dates whose weekly schedule entry is enabled', () => {
    const config = createAppConfig();

    expect(isDateEnabled('2026-04-27', config)).toBe(true);
  });

  it('returns false when the weekly schedule has no entry for the date day', () => {
    const config = createAppConfig({
      WEEKLY_SCHEDULE: [{day: 1, enabled: true, openTime: '09:00', closeTime: '19:00'}],
    });

    expect(isDateEnabled('2026-04-28', config)).toBe(false);
  });

  it('falls back to Monday-Saturday when weekly schedule is empty', () => {
    const config = createAppConfig({WEEKLY_SCHEDULE: []});

    expect(isDateEnabled('2026-04-27', config)).toBe(true);
    expect(isDateEnabled('2026-04-26', config)).toBe(false);
  });

  it('returns the schedule for the requested date day', () => {
    const config = createAppConfig();

    expect(getScheduleForDate('2026-05-02', config)).toMatchObject({
      day: 6,
      enabled: true,
      openTime: '08:00',
      closeTime: '14:00',
    });
  });

  it('returns undefined when weekly schedule is unavailable', () => {
    const config = createAppConfig({
      WEEKLY_SCHEDULE: undefined as unknown as ReturnType<typeof createWeeklySchedule>,
    });

    expect(getScheduleForDate('2026-04-27', config)).toBeUndefined();
  });

  it('generates future dates from tomorrow with disabled flags', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-26T12:00:00'));
    const config = createAppConfig();

    const dates = getAvailableDates(config, 7);

    expect(dates).toHaveLength(7);
    expect(dates[0]).toMatchObject({date: '2026-04-27', label: 'Amanhã', disabled: false});
    expect(dates[5]).toMatchObject({date: '2026-05-02', disabled: false});
    expect(dates[6]).toMatchObject({date: '2026-05-03', disabled: true});
  });

  it('allows all generated dates when weekly schedule is not configured', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-26T12:00:00'));
    const config = createAppConfig({
      WEEKLY_SCHEDULE: undefined as unknown as ReturnType<typeof createWeeklySchedule>,
    });

    expect(getAvailableDates(config, 2)).toEqual([
      {date: '2026-04-27', label: 'Amanhã', disabled: false},
      {date: '2026-04-28', label: 'terça-feira, 28 de abr.', disabled: false},
    ]);
  });

  it('formats today and tomorrow with short labels', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-26T12:00:00'));

    expect(formatDateDisplay('2026-04-26')).toBe('Hoje');
    expect(formatDateDisplay('2026-04-27')).toBe('Amanhã');
  });
});

describe('phone utils', () => {
  it('normalizes Brazilian phones by stripping punctuation and country code', () => {
    expect(normalizePhone('+55 (82) 99999-0000')).toBe('82999990000');
    expect(normalizePhone('(82) 3333-4444')).toBe('8233334444');
  });

  it('masks 10 and 11 digit phone numbers', () => {
    expect(maskPhone('8233334444')).toBe('(82) ****-4444');
    expect(maskPhone('82999990000')).toBe('(82) *****-0000');
  });
});
