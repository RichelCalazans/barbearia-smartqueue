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
   * Adds minutes to a time string (HH:MM).
   */
  static addMinutes(timeStr: string, minutesToAdd: number): string {
    const [hours, mins] = timeStr.split(':').map(Number);
    const totalMinutes = hours * 60 + mins + minutesToAdd;
    const newHours = Math.floor(totalMinutes / 60) % 24;
    const newMins = totalMinutes % 60;
    return `${newHours.toString().padStart(2, '0')}:${newMins.toString().padStart(2, '0')}`;
  }
}
