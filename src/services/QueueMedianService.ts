import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  Timestamp
} from 'firebase/firestore';
import { db } from '../firebase';
import { EWTResult } from '../db/schema';
import { AppConfig } from '../types';

export class QueueMedianService {
  private static HISTORY_COLLECTION = 'history';
  private static DAYS_OF_HISTORY = 7;
  private static CACHE_TTL = 5 * 60 * 1000;
  
  private static cache: Map<string, { median: number; timestamp: number }> = new Map();

  static async getServiceMedian(
    serviceTypeId: string,
    config: AppConfig
  ): Promise<EWTResult> {
    const cacheKey = `median_${serviceTypeId}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return { median: cached.median, source: 'median' };
    }

    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - this.DAYS_OF_HISTORY);

    try {
      const q = query(
        collection(db, this.HISTORY_COLLECTION),
        where('servicosIds', 'array-contains', serviceTypeId),
        where('horaFim', '>=', Timestamp.fromDate(daysAgo)),
        orderBy('horaFim', 'desc'),
        limit(100)
      );

      const snapshot = await getDocs(q);
      const durations = snapshot.docs
        .map(d => d.data().duracaoReal as number)
        .filter(d => d > 0 && d < 180);

      if (durations.length < 3) {
        return this.getFallback(config);
      }

      const sorted = durations.sort((a, b) => a - b);
      const median = this.calculateMedian(sorted);
      const { capped, value } = this.applyIQRCap(sorted, median);

      this.cache.set(cacheKey, { median: value, timestamp: Date.now() });

      return { median: value, source: 'median', capped };
    } catch (error) {
      console.error('Error calculating median:', error);
      return this.getFallback(config);
    }
  }

  private static calculateMedian(sorted: number[]): number {
    const mid = Math.floor(sorted.length / 2);
    if (sorted.length % 2 === 0) {
      return (sorted[mid - 1] + sorted[mid]) / 2;
    }
    return sorted[mid];
  }

  private static applyIQRCap(values: number[], median: number): { capped: boolean; value: number } {
    const q1 = values[Math.floor(values.length * 0.25)];
    const q3 = values[Math.floor(values.length * 0.75)];
    const iqr = q3 - q1;
    const lowerBound = median - 1.5 * iqr;
    const upperBound = median + 1.5 * iqr;

    if (median < lowerBound || median > upperBound) {
      return { capped: true, value: Math.max(lowerBound, Math.min(upperBound, median)) };
    }
    return { capped: false, value: median };
  }

  private static getFallback(_config: AppConfig): EWTResult {
    return { median: 30, source: 'default' };
  }

  static calculateEWT(
    position: number,
    serviceMedians: Map<string, number>,
    activeBarbers: number
  ): number {
    if (position === 0 || activeBarbers === 0) return 0;

    const totalServiceTime = Array.from(serviceMedians.values()).reduce((a, b) => a + b, 0);
    const avgServiceTime = serviceMedians.size > 0 
      ? totalServiceTime / serviceMedians.size 
      : 30;

    return Math.ceil((position * avgServiceTime) / activeBarbers);
  }

  static clearCache(): void {
    this.cache.clear();
  }
}
