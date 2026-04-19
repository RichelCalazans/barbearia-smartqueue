import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  doc,
  getDocs,
  getDoc,
  writeBatch,
  Timestamp,
  serverTimestamp
} from 'firebase/firestore';

import { db, handleFirestoreError, OperationType } from '../firebase';
import { QueueItem, QueueStatus, Client, Service, AppConfig } from '../types';
import { TimePredictorService } from './TimePredictorService';

export class QueueService {
  private static COLLECTION = 'queue';

  /**
   * Adds a client to the daily queue.
   */
  static async addToQueue(
    client: Client,
    services: Service[],
    config: AppConfig,
    scheduledDate?: string // YYYY-MM-DD, defaults to today if not provided
  ): Promise<string> {
    const path = this.COLLECTION;
    try {
      // Use provided date or today
      const targetDate = scheduledDate || new Date().toISOString().split('T')[0];

      // 1. Get current queue for the target date to calculate position and time
      const q = query(
        collection(db, path),
        where('data', '==', targetDate),
        where('status', 'in', ['AGUARDANDO', 'EM_ATENDIMENTO']),
        orderBy('posicao', 'asc')
      );
      const snapshot = await getDocs(q);
      const currentQueue = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as QueueItem));

      // Prevent duplicate: same client already waiting/being served on this date
      const existing = currentQueue.find(item => item.clienteId === client.id);
      if (existing) {
        throw new Error('Você já está na fila para este dia.');
      }

      if (currentQueue.length >= config.MAX_DAILY_CLIENTS) {
        throw new Error('Fila cheia para este dia.');
      }

      // 2. Calculate position
      const lastItem = currentQueue[currentQueue.length - 1];
      const position = (lastItem?.posicao || 0) + 1;

      // 3. Calculate estimated time
      const baseTime = services.reduce((sum, s) => sum + s.tempoBase, 0);
      const predictedTime = TimePredictorService.predictServiceTime(client, baseTime, config);

      // 4. Calculate predicted start time
      let predictedStartTime = config.OPENING_TIME;
      if (lastItem) {
        predictedStartTime = TimePredictorService.addMinutes(
          lastItem.horaPrevista,
          lastItem.tempoEstimado + config.BUFFER_MINUTES
        );
      } else {
        // If first of the day, check if it's today and current time is after opening time
        const today = new Date().toISOString().split('T')[0];
        if (targetDate === today) {
          const now = new Date();
          const currentHHMM = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
          if (currentHHMM > config.OPENING_TIME) {
            predictedStartTime = currentHHMM;
          }
        }
      }

      // 5. Create queue item
      const newItem: Partial<QueueItem> = {
        posicao: position,
        clienteId: client.id,
        clienteNome: client.nome,
        servicos: services.map(s => s.nome).join(', '),
        servicosIds: services.map(s => s.id),
        tempoEstimado: predictedTime,
        horaPrevista: predictedStartTime,
        status: 'AGUARDANDO',
        horaEntrada: Date.now(),
        data: targetDate,
        telefone: client.telefone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) *****-$3'),
        manual: false,
      };

      const docRef = await addDoc(collection(db, path), newItem);
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
      return '';
    }
  }

  /**
   * Subscribes to real-time updates of a single ticket.
   */
  static onTicketChange(id: string, callback: (ticket: QueueItem | null) => void): () => void {
    const docRef = doc(db, this.COLLECTION, id);
    return onSnapshot(docRef, (snap) => {
      callback(snap.exists() ? ({ id: snap.id, ...snap.data() } as QueueItem) : null);
    });
  }

  /**
   * Updates the status of a queue item.
   */
  static async updateStatus(id: string, status: QueueStatus): Promise<void> {
    const path = `${this.COLLECTION}/${id}`;
    try {
      const updates: any = { status };
      if (status === 'EM_ATENDIMENTO') {
        updates.horaChamada = Date.now();
      } else if (status === 'CONCLUIDO' || status === 'CANCELADO' || status === 'AUSENTE') {
        updates.horaFim = Date.now();
      }
      await updateDoc(doc(db, this.COLLECTION, id), updates);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  }

  /**
   * Checks if a date has available slots in the queue.
   */
  static async checkDateAvailability(
    dateString: string, // YYYY-MM-DD
    config: AppConfig
  ): Promise<{ available: boolean; totalSlots: number; remainingSlots: number }> {
    const path = this.COLLECTION;
    try {
      const q = query(
        collection(db, path),
        where('data', '==', dateString),
        where('status', 'in', ['AGUARDANDO', 'EM_ATENDIMENTO'])
      );
      const snapshot = await getDocs(q);
      const count = snapshot.size;

      return {
        available: count < config.MAX_DAILY_CLIENTS,
        totalSlots: config.MAX_DAILY_CLIENTS,
        remainingSlots: Math.max(0, config.MAX_DAILY_CLIENTS - count),
      };
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
      // On error, default to available to avoid blocking users
      // The actual validation will happen when they try to join the queue
      return { available: true, totalSlots: config.MAX_DAILY_CLIENTS, remainingSlots: config.MAX_DAILY_CLIENTS };
    }
  }

  /**
   * Recalculates the predicted times for the entire queue.
   */
  static async recalculateQueue(config: AppConfig): Promise<void> {
    const path = this.COLLECTION;
    try {
      const today = new Date().toISOString().split('T')[0];
      const q = query(
        collection(db, path),
        where('data', '==', today),
        where('status', 'in', ['AGUARDANDO', 'EM_ATENDIMENTO']),
        orderBy('posicao', 'asc')
      );
      const snapshot = await getDocs(q);
      const queue = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as QueueItem));

      if (queue.length === 0) return;

      const stateDoc = await getDoc(doc(db, 'config', 'state'));
      const state = stateDoc.exists() ? stateDoc.data() : { agendaPausada: false, tempoRetomada: null };

      const batch = writeBatch(db);
      const now = new Date();
      const currentHHMM = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      let lastTime = currentHHMM > config.OPENING_TIME ? currentHHMM : config.OPENING_TIME;

      let pauseMinutesRemaining = 0;
      if (state.agendaPausada && state.tempoRetomada) {
        pauseMinutesRemaining = Math.max(0, Math.ceil((state.tempoRetomada - Date.now()) / 60000));
      }

      for (let i = 0; i < queue.length; i++) {
        const item = queue[i];
        if (item.status === 'EM_ATENDIMENTO') {
          const elapsed = (Date.now() - (item.horaChamada || Date.now())) / 60000;
          const remaining = Math.max(0, item.tempoEstimado - elapsed);
          let baseTime = TimePredictorService.addMinutes(currentHHMM, remaining + config.BUFFER_MINUTES);
          if (pauseMinutesRemaining > 0) {
            baseTime = TimePredictorService.addMinutes(baseTime, pauseMinutesRemaining);
          }
          lastTime = baseTime;
        } else {
          let horaPrevista: string;
          if (i === 0 && !queue.some(it => it.status === 'EM_ATENDIMENTO')) {
            horaPrevista = currentHHMM > config.OPENING_TIME ? currentHHMM : config.OPENING_TIME;
            if (pauseMinutesRemaining > 0) {
              horaPrevista = TimePredictorService.addMinutes(horaPrevista, pauseMinutesRemaining);
            }
          } else {
            horaPrevista = lastTime;
          }
          batch.update(doc(db, this.COLLECTION, item.id), { horaPrevista });
          lastTime = TimePredictorService.addMinutes(horaPrevista, item.tempoEstimado + config.BUFFER_MINUTES);
        }
      }

      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  }
}
