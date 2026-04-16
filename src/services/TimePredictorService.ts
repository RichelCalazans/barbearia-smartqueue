import { AppConfig, Client } from '../types';

export class TimePredictorService {
  private static ALPHA = 0.3;
  private static NEW_CLIENT_MULTIPLIER = 1.25;

  /**
   * Calculates the new EWMA average for a client.
   * novaMedia = α × duracaoReal + (1 - α) × mediaAnterior
   */
  static calculateNewAverage(
    currentAverage: number,
    actualDuration: number,
    alpha: number = this.ALPHA
  ): number {
    if (currentAverage === 0) return actualDuration;
    return alpha * actualDuration + (1 - alpha) * currentAverage;
  }

  /**
   * Predicts the service time for a client and service combination.
   */
  static predictServiceTime(
    client: Client | null,
    baseTime: number,
    config: AppConfig
  ): number {
    const alpha = config.EWMA_ALPHA || this.ALPHA;
    const multiplier = config.NEW_CLIENT_MULTIPLIER || this.NEW_CLIENT_MULTIPLIER;

    if (!client || client.totalVisitas === 0 || !client.tempoMedio) {
      // New client or no history
      return Math.round(baseTime * multiplier);
    }

    // Use client's personal history
    return Math.round(client.tempoMedio);
  }

  /**
   * Formats a duration in minutes to HH:MM format.
   */
  static formatTime(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }

  /**
   * Adds minutes to a time string (HH:MM). Falls back to 00:00 when the input
   * is malformed, so downstream rendering never shows NaN:NaN.
   */
  static addMinutes(timeStr: string, minutesToAdd: number): string {
    const validFormat = typeof timeStr === 'string' && /^\d{2}:\d{2}$/.test(timeStr);
    const base = validFormat ? timeStr : '00:00';
    const [hours, mins] = base.split(':').map(Number);
    if (Number.isNaN(hours) || Number.isNaN(mins) || hours > 23 || mins > 59) {
      return '00:00';
    }
    const safeMinutes = Number.isFinite(minutesToAdd) ? Math.round(minutesToAdd) : 0;
    const totalMinutes = hours * 60 + mins + safeMinutes;
    const normalized = ((totalMinutes % 1440) + 1440) % 1440;
    const newHours = Math.floor(normalized / 60);
    const newMins = normalized % 60;
    return `${newHours.toString().padStart(2, '0')}:${newMins.toString().padStart(2, '0')}`;
  }
}
