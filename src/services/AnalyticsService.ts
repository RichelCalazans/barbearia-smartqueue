import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  deleteDoc,
  doc
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import {
  Attendance,
  QueueItem,
  AppConfig,
  MetricsPeriod,
  PeriodMetrics,
  DailyCount,
  HourDistribution,
  ServicePopularity,
  ClientWithInsights,
  Client,
} from '../types';
import { ClientService } from './ClientService';

export class AnalyticsService {
  /**
   * Calculates daily metrics.
   */
  static async getDailyMetrics() {
    const path = 'history';
    try {
      const today = new Date().toISOString().split('T')[0];
      const q = query(
        collection(db, path),
        where('data', '==', today)
      );
      const snapshot = await getDocs(q);
      const attendances = snapshot.docs.map(d => d.data() as Attendance);

      const totalAttended = attendances.length;
      const totalDuration = attendances.reduce((sum, a) => sum + a.duracaoReal, 0);
      const averageTime = totalAttended > 0 ? Math.round(totalDuration / totalAttended) : 0;

      const totalEstimated = attendances.reduce((sum, a) => sum + a.duracaoEstimada, 0);
      const adherence = totalEstimated > 0 ? Math.round((totalDuration / totalEstimated) * 100) : 100;

      return {
        totalAttended,
        averageTime,
        adherence,
        attendances
      };
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return null;
    }
  }

  /**
   * Gets top clients by visits.
   */
  static async getTopClients(limitCount: number = 5) {
    const path = 'clients';
    try {
      const q = query(
        collection(db, path),
        orderBy('totalVisitas', 'desc'),
        limit(limitCount)
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => d.data());
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  }

  static async getHistoryForPeriod(days: number): Promise<Attendance[]> {
    const path = 'history';
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - (days - 1));
      const startDateStr = startDate.toISOString().split('T')[0];
      const q = query(
        collection(db, path),
        where('data', '>=', startDateStr),
        orderBy('data', 'asc')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Attendance));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  }

  private static async getQueueForPeriod(days: number): Promise<QueueItem[]> {
    const path = 'queue';
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - (days - 1));
      const startDateStr = startDate.toISOString().split('T')[0];
      const q = query(
        collection(db, path),
        where('data', '>=', startDateStr),
        orderBy('data', 'asc')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as QueueItem));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  }

  static async getPeriodMetrics(period: MetricsPeriod, config: AppConfig): Promise<PeriodMetrics> {
    const days = period === 'hoje' ? 1 : period === '7dias' ? 7 : 30;
    const doubleDays = days * 2;

    const allHistory = await this.getHistoryForPeriod(doubleDays);
    const allQueue = await this.getQueueForPeriod(doubleDays);

    const cutoffDateObj = new Date();
    cutoffDateObj.setDate(cutoffDateObj.getDate() - days);
    const cutoffDate = cutoffDateObj.toISOString().split('T')[0];

    const current = allHistory.filter(a => a.data >= cutoffDate);
    const previous = allHistory.filter(a => a.data < cutoffDate);

    const currentQueue = allQueue.filter(q => q.data >= cutoffDate);

    // Current metrics
    const totalAttended = current.length;
    const averageTime = totalAttended > 0
      ? Math.round(current.reduce((s, a) => s + a.duracaoReal, 0) / totalAttended)
      : 0;

    const clientCounts = new Map<string, number>();
    current.forEach(a => clientCounts.set(a.clienteId, (clientCounts.get(a.clienteId) || 0) + 1));
    const uniqueClients = clientCounts.size;
    const returningClients = [...clientCounts.values()].filter(c => c >= 2).length;
    const retentionRate = uniqueClients > 0 ? Math.round((returningClients / uniqueClients) * 100) : 0;

    const totalQueueItems = currentQueue.filter(q => ['CONCLUIDO', 'AUSENTE'].includes(q.status)).length;
    const absentItems = currentQueue.filter(q => q.status === 'AUSENTE').length;
    const noShowRate = totalQueueItems > 0 ? Math.round((absentItems / totalQueueItems) * 100) : 0;

    const chairUtilization = this.computeChairUtilization(current, config, days);

    // Previous metrics (for deltas)
    const prevTotal = previous.length;
    const prevAvg = prevTotal > 0
      ? Math.round(previous.reduce((s, a) => s + a.duracaoReal, 0) / prevTotal)
      : 0;

    const prevClientCounts = new Map<string, number>();
    previous.forEach(a => prevClientCounts.set(a.clienteId, (prevClientCounts.get(a.clienteId) || 0) + 1));
    const prevUniqueClients = prevClientCounts.size;
    const prevReturningClients = [...prevClientCounts.values()].filter(c => c >= 2).length;
    const prevRetentionRate = prevUniqueClients > 0 ? Math.round((prevReturningClients / prevUniqueClients) * 100) : 0;

    const prevQueueItems = allQueue.filter(q => q.data < cutoffDate);
    const prevTotalQueueItems = prevQueueItems.filter(q => ['CONCLUIDO', 'AUSENTE'].includes(q.status)).length;
    const prevAbsentItems = prevQueueItems.filter(q => q.status === 'AUSENTE').length;
    const prevNoShowRate = prevTotalQueueItems > 0 ? Math.round((prevAbsentItems / prevTotalQueueItems) * 100) : 0;

    const delta = (curr: number, prev: number) =>
      prev === 0 ? 0 : Math.round(((curr - prev) / prev) * 100);

    return {
      totalAttended,
      averageTime,
      retentionRate,
      noShowRate,
      chairUtilization,
      attendances: current,
      deltas: {
        totalAttended: delta(totalAttended, prevTotal),
        averageTime: delta(averageTime, prevAvg),
        retentionRate: delta(retentionRate, prevRetentionRate),
        noShowRate: delta(noShowRate, prevNoShowRate),
      },
    };
  }

  static computeDailyCounts(attendances: Attendance[], days: number): DailyCount[] {
    const result: DailyCount[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const count = attendances.filter(a => a.data === dateStr).length;
      result.push({ date: dateStr, count });
    }
    return result;
  }

  static computeHourDistribution(attendances: Attendance[]): HourDistribution[] {
    const hours = new Map<number, number>();
    attendances.forEach(a => {
      const h = new Date(a.horaInicio).getHours();
      hours.set(h, (hours.get(h) || 0) + 1);
    });
    return [...hours.entries()]
      .map(([hour, count]) => ({ hour, count }))
      .sort((a, b) => a.hour - b.hour);
  }

  static computeServicePopularity(attendances: Attendance[]): ServicePopularity[] {
    const counts = new Map<string, number>();
    attendances.forEach(a => {
      a.servicos.split(/,\s*/).forEach(s => {
        const trimmed = s.trim();
        if (trimmed) counts.set(trimmed, (counts.get(trimmed) || 0) + 1);
      });
    });
    const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
    const max = sorted[0]?.[1] || 1;
    return sorted.map(([name, count]) => ({
      name,
      count,
      percentage: Math.round((count / max) * 100),
    }));
  }

  private static computeChairUtilization(attendances: Attendance[], config: AppConfig, days: number): number {
    const totalWorkedMinutes = attendances.reduce((s, a) => s + a.duracaoReal, 0);
    const [oh, om] = config.OPENING_TIME.split(':').map(Number);
    const [ch, cm] = config.CLOSING_TIME.split(':').map(Number);
    const dailyMinutes = (ch * 60 + cm) - (oh * 60 + om);
    const availableMinutes = dailyMinutes * days;
    return availableMinutes > 0 ? Math.round((totalWorkedMinutes / availableMinutes) * 100) : 0;
  }

  static getTopClientsFromAttendances(
    attendances: Attendance[],
    limitCount: number
  ): Array<{ clienteId: string; clienteNome: string; count: number }> {
    const counts = new Map<string, { clienteNome: string; count: number }>();
    attendances.forEach(a => {
      const entry = counts.get(a.clienteId);
      if (entry) {
        entry.count++;
      } else {
        counts.set(a.clienteId, { clienteNome: a.clienteNome, count: 1 });
      }
    });
    return [...counts.entries()]
      .map(([clienteId, { clienteNome, count }]) => ({ clienteId, clienteNome, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limitCount);
  }

  static async getAtRiskClients(): Promise<ClientWithInsights[]> {
    const path = 'clients';
    try {
      const snapshot = await getDocs(
        query(collection(db, path), where('ativo', '==', true))
      );
      const clients = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Client));
      const history = await this.getHistoryForPeriod(90);
      const today = new Date().toISOString().split('T')[0];
      const enriched = ClientService.enrichClients(clients, history, today);
      return enriched.filter(c => c.isAtRisk);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  }

  static async resetDailyMetrics(): Promise<number> {
    const path = 'history';
    try {
      const today = new Date().toISOString().split('T')[0];
      const q = query(
        collection(db, path),
        where('data', '==', today)
      );
      const snapshot = await getDocs(q);
      let count = 0;
      for (const d of snapshot.docs) {
        await deleteDoc(doc(db, path, d.id));
        count++;
      }
      return count;
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
      throw error;
    }
  }
}
