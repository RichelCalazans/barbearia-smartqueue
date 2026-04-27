import {describe, expect, it} from 'vitest';
import {createAppConfig, createClient, createService} from '../test/factories';
import {TimePredictorService} from './TimePredictorService';

describe('TimePredictorService.calculateNewAverage', () => {
  it('uses the actual duration when the client has no current average', () => {
    expect(TimePredictorService.calculateNewAverage(0, 42)).toBe(42);
  });

  it('calculates EWMA with the default alpha', () => {
    expect(TimePredictorService.calculateNewAverage(30, 50)).toBe(36);
  });

  it('calculates EWMA with a custom alpha', () => {
    expect(TimePredictorService.calculateNewAverage(30, 50, 0.5)).toBe(40);
  });
});

describe('TimePredictorService.predictServiceTime', () => {
  it('applies the new-client multiplier when the client is null', () => {
    const config = createAppConfig();

    expect(TimePredictorService.predictServiceTime(null, 40, config)).toBe(50);
  });

  it('applies the new-client multiplier when the client has no visits', () => {
    const config = createAppConfig();
    const client = createClient({totalVisitas: 0, tempoMedio: 35});

    expect(TimePredictorService.predictServiceTime(client, 30, config)).toBe(38);
  });

  it('applies the new-client multiplier when the client has no average', () => {
    const config = createAppConfig();
    const client = createClient({totalVisitas: 3, tempoMedio: 0});

    expect(TimePredictorService.predictServiceTime(client, 30, config)).toBe(38);
  });

  it('uses rounded personal history for a recurring client', () => {
    const config = createAppConfig();
    const client = createClient({totalVisitas: 4, tempoMedio: 42.6});

    expect(TimePredictorService.predictServiceTime(client, 30, config)).toBe(43);
  });

  it('uses the configured multiplier for a new client', () => {
    const config = createAppConfig({NEW_CLIENT_MULTIPLIER: 1.5});
    const client = createClient({totalVisitas: 0, tempoMedio: 0});

    expect(TimePredictorService.predictServiceTime(client, 30, config)).toBe(45);
  });

  it('respects the summed tempoBase passed by callers for multiple services', () => {
    const config = createAppConfig();
    const services = [
      createService({tempoBase: 30}),
      createService({id: 'service-2', tempoBase: 45}),
    ];
    const baseTime = services.reduce((sum, service) => sum + service.tempoBase, 0);

    expect(TimePredictorService.predictServiceTime(null, baseTime, config)).toBe(94);
  });
});

describe('TimePredictorService.formatTime', () => {
  it('formats minutes as HH:MM', () => {
    expect(TimePredictorService.formatTime(125)).toBe('02:05');
  });

  it('rounds minute fractions when formatting', () => {
    expect(TimePredictorService.formatTime(61.6)).toBe('01:02');
  });
});

describe('TimePredictorService.addMinutes', () => {
  it('adds minutes to a valid HH:MM time', () => {
    expect(TimePredictorService.addMinutes('09:15', 30)).toBe('09:45');
  });

  it('rounds fractional minutes before adding', () => {
    expect(TimePredictorService.addMinutes('09:15', 29.6)).toBe('09:45');
  });

  it('wraps over midnight instead of returning an invalid hour', () => {
    expect(TimePredictorService.addMinutes('23:50', 20)).toBe('00:10');
  });

  it('wraps negative additions into the previous day without a negative time', () => {
    expect(TimePredictorService.addMinutes('00:10', -20)).toBe('23:50');
  });

  it('falls back to 00:00 for malformed input', () => {
    expect(TimePredictorService.addMinutes('not-a-time', 15)).toBe('00:15');
  });

  it('returns 00:00 for out-of-range HH:MM input', () => {
    expect(TimePredictorService.addMinutes('24:00', 15)).toBe('00:00');
    expect(TimePredictorService.addMinutes('09:60', 15)).toBe('00:00');
  });

  it('ignores non-finite minute additions', () => {
    expect(TimePredictorService.addMinutes('09:15', Number.NaN)).toBe('09:15');
    expect(TimePredictorService.addMinutes('09:15', Number.POSITIVE_INFINITY)).toBe('09:15');
  });
});
