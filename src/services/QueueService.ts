import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  updateDoc,
  doc,
  getDocs,
  getDoc,
  writeBatch,
  runTransaction,
} from 'firebase/firestore';

import { db, handleFirestoreError, OperationType } from '../firebase';
import { QueueItem, QueueStatus, Client, Service, AppConfig } from '../types';
import { TimePredictorService } from './TimePredictorService';
import { maskPhone, normalizePhone } from '../utils';

interface AddToQueueOptions {
  manual?: boolean;
  desiredPosition?: number | null;
  privilegedQueueWrites?: boolean;
}

interface RecalculateQueueOptions {
  preferredFirstWaitingTime?: string;
}

export class QueueService {
  private static COLLECTION = 'queue';

  private static getToday(): string {
    return new Date().toISOString().split('T')[0];
  }

  private static getCurrentHHMM(): string {
    const now = new Date();
    return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  }

  private static isValidHHMM(value: unknown): value is string {
    return typeof value === 'string' && /^\d{2}:\d{2}$/.test(value);
  }

  private static getInitialQueueTime(config: AppConfig, targetDate: string, pauseMinutesRemaining = 0): string {
    const isToday = targetDate === this.getToday();
    const currentHHMM = this.getCurrentHHMM();
    const initialTime = isToday && currentHHMM > config.OPENING_TIME
      ? currentHHMM
      : config.OPENING_TIME;

    return pauseMinutesRemaining > 0
      ? TimePredictorService.addMinutes(initialTime, pauseMinutesRemaining)
      : initialTime;
  }

  private static async getPauseMinutesRemaining(targetDate: string): Promise<number> {
    if (targetDate !== this.getToday()) return 0;

    const stateDoc = await getDoc(doc(db, 'config', 'state'));
    const state = stateDoc.exists() ? stateDoc.data() : { agendaPausada: false, tempoRetomada: null };
    if (!state.agendaPausada || !state.tempoRetomada) return 0;

    return Math.max(0, Math.ceil((state.tempoRetomada - Date.now()) / 60000));
  }

  private static calculateAppendTime(
    activeQueue: QueueItem[],
    config: AppConfig,
    targetDate: string,
    pauseMinutesRemaining = 0
  ): string {
    let lastTime = this.getInitialQueueTime(config, targetDate, pauseMinutesRemaining);
    const isToday = targetDate === this.getToday();
    const currentHHMM = this.getCurrentHHMM();

    for (const item of activeQueue) {
      if (item.status === 'EM_ATENDIMENTO') {
        if (isToday) {
          const elapsed = (Date.now() - (item.horaChamada || Date.now())) / 60000;
          const remaining = Math.max(0, item.tempoEstimado - elapsed);
          lastTime = TimePredictorService.addMinutes(
            currentHHMM,
            remaining + config.BUFFER_MINUTES + pauseMinutesRemaining
          );
        } else {
          const referenceStart = this.isValidHHMM(item.horaPrevista) ? item.horaPrevista : config.OPENING_TIME;
          lastTime = TimePredictorService.addMinutes(
            referenceStart,
            item.tempoEstimado + config.BUFFER_MINUTES
          );
        }
        continue;
      }

      const referenceStart = this.isValidHHMM(item.horaPrevista) ? item.horaPrevista : lastTime;
      lastTime = TimePredictorService.addMinutes(
        referenceStart,
        item.tempoEstimado + config.BUFFER_MINUTES
      );
    }

    return lastTime;
  }

  private static buildActiveQueueQuery(targetDate: string) {
    return query(
      collection(db, this.COLLECTION),
      where('data', '==', targetDate),
      where('status', 'in', ['AGUARDANDO', 'EM_ATENDIMENTO']),
      orderBy('posicao', 'asc')
    );
  }

  /**
   * Returns an active ticket for a client in a given date (if any).
   */
  static async findActiveTicketByClient(clientId: string, targetDate?: string): Promise<QueueItem | null> {
    const path = this.COLLECTION;
    try {
      const date = targetDate || this.getToday();
      const snapshot = await getDocs(this.buildActiveQueueQuery(date));
      const ticket = snapshot.docs
        .map(d => ({ id: d.id, ...d.data() } as QueueItem))
        .find(item => item.clienteId === clientId);
      return ticket || null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
      return null;
    }
  }

  /**
   * Adds a client to the daily queue.
   */
  static async addToQueue(
    client: Client,
    services: Service[],
    config: AppConfig,
    scheduledDate?: string,
    options: AddToQueueOptions = {}
  ): Promise<string> {
    const path = this.COLLECTION;
    try {
      if (!services.length) {
        throw new Error('Selecione ao menos um serviço.');
      }

      const targetDate = scheduledDate || this.getToday();
      const now = Date.now();
      const baseTime = services.reduce((sum, s) => sum + s.tempoBase, 0);
      const predictedTime = TimePredictorService.predictServiceTime(client, baseTime, config);
      const normalizedPhone = normalizePhone(client.telefoneNormalizado || client.telefone);
      const canWriteExistingQueueItems =
        options.privilegedQueueWrites ?? (options.manual === true || typeof options.desiredPosition === 'number');
      const pauseMinutesRemaining = await this.getPauseMinutesRemaining(targetDate);

      let createdTicketId = '';

      await runTransaction(db, async (transaction) => {
        const snapshot = await getDocs(this.buildActiveQueueQuery(targetDate));
        const activeQueue = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as QueueItem));

        const alreadyInQueue = activeQueue.find(item => item.clienteId === client.id);
        if (alreadyInQueue) {
          throw new Error('Este cliente já está na fila para este dia.');
        }

        if (activeQueue.length >= config.MAX_DAILY_CLIENTS) {
          throw new Error('Fila cheia para este dia.');
        }

        const inServiceQueue = activeQueue.filter(item => item.status === 'EM_ATENDIMENTO');
        const waitingQueue = activeQueue.filter(item => item.status === 'AGUARDANDO');

        const requestedPosition =
          canWriteExistingQueueItems && typeof options.desiredPosition === 'number'
            ? Math.trunc(options.desiredPosition)
            : waitingQueue.length + 1;

        const insertWaitingIndex = Math.min(
          Math.max(requestedPosition - 1, 0),
          waitingQueue.length
        );

        const newDocRef = doc(collection(db, path));
        const newQueueItem: QueueItem = {
          id: newDocRef.id,
          posicao: 0,
          clienteId: client.id,
          clienteNome: client.nome,
          servicos: services.map(s => s.nome).join(', '),
          servicosIds: services.map(s => s.id),
          tempoEstimado: predictedTime,
          horaPrevista: this.calculateAppendTime(activeQueue, config, targetDate, pauseMinutesRemaining),
          status: 'AGUARDANDO',
          horaEntrada: now,
          data: targetDate,
          telefone: maskPhone(normalizedPhone),
          manual: options.manual ?? false,
        };

        const reorderedWaiting = [...waitingQueue];
        reorderedWaiting.splice(insertWaitingIndex, 0, newQueueItem);

        const normalizedQueue = [...inServiceQueue, ...reorderedWaiting];

        normalizedQueue.forEach((item, index) => {
          const nextPosition = index + 1;

          if (item.id === newDocRef.id) {
            transaction.set(newDocRef, {
              ...newQueueItem,
              posicao: nextPosition,
            });
            createdTicketId = newDocRef.id;
            return;
          }

          if (canWriteExistingQueueItems && item.posicao !== nextPosition) {
            transaction.update(doc(db, path, item.id), { posicao: nextPosition });
          }
        });
      });

      if (createdTicketId && canWriteExistingQueueItems) {
        await this.recalculateQueue(config, targetDate);
      }

      return createdTicketId;
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
      const updates: Record<string, unknown> = { status };
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
    dateString: string,
    config: AppConfig
  ): Promise<{ available: boolean; totalSlots: number; remainingSlots: number }> {
    const path = this.COLLECTION;
    try {
      const snapshot = await getDocs(this.buildActiveQueueQuery(dateString));
      const count = snapshot.size;

      return {
        available: count < config.MAX_DAILY_CLIENTS,
        totalSlots: config.MAX_DAILY_CLIENTS,
        remainingSlots: Math.max(0, config.MAX_DAILY_CLIENTS - count),
      };
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
      return { available: true, totalSlots: config.MAX_DAILY_CLIENTS, remainingSlots: config.MAX_DAILY_CLIENTS };
    }
  }

  /**
   * Recalculates predicted times for the queue of a specific date.
   */
  static async recalculateQueue(
    config: AppConfig,
    targetDate?: string,
    options: RecalculateQueueOptions = {}
  ): Promise<void> {
    const path = this.COLLECTION;
    try {
      const date = targetDate || this.getToday();
      const snapshot = await getDocs(this.buildActiveQueueQuery(date));
      const queue = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as QueueItem));

      if (queue.length === 0) return;

      const isToday = date === this.getToday();
      const currentHHMM = this.getCurrentHHMM();
      const pauseMinutesRemaining = await this.getPauseMinutesRemaining(date);
      let lastTime = this.getInitialQueueTime(config, date, pauseMinutesRemaining);
      const hasInService = queue.some(item => item.status === 'EM_ATENDIMENTO');
      const preferredFirstWaitingTime = options.preferredFirstWaitingTime;
      if (!hasInService && this.isValidHHMM(preferredFirstWaitingTime)) {
        lastTime = preferredFirstWaitingTime;
      }

      const batch = writeBatch(db);

      for (const item of queue) {
        if (item.status === 'EM_ATENDIMENTO') {
          if (isToday) {
            const elapsed = (Date.now() - (item.horaChamada || Date.now())) / 60000;
            const remaining = Math.max(0, item.tempoEstimado - elapsed);
            lastTime = TimePredictorService.addMinutes(
              currentHHMM,
              remaining + config.BUFFER_MINUTES + pauseMinutesRemaining
            );
          } else {
            const referenceStart = item.horaPrevista || config.OPENING_TIME;
            lastTime = TimePredictorService.addMinutes(
              referenceStart,
              item.tempoEstimado + config.BUFFER_MINUTES
            );
          }
          continue;
        }

        const horaPrevista = lastTime;
        batch.update(doc(db, this.COLLECTION, item.id), { horaPrevista });
        lastTime = TimePredictorService.addMinutes(
          horaPrevista,
          item.tempoEstimado + config.BUFFER_MINUTES
        );
      }

      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  }

  static async reorderQueue(
    ticketId: string,
    newPosition: number,
    config: AppConfig,
    scheduledDate?: string
  ): Promise<void> {
    const path = this.COLLECTION;
    try {
      const targetDate = scheduledDate || this.getToday();
      const activeSnapshot = await getDocs(this.buildActiveQueueQuery(targetDate));
      const activeQueue = activeSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as QueueItem));
      const previousFirstWaiting = activeQueue.find(item => item.status === 'AGUARDANDO');
      const preferredFirstWaitingTime =
        previousFirstWaiting && this.isValidHHMM(previousFirstWaiting.horaPrevista)
          ? previousFirstWaiting.horaPrevista
          : undefined;
      const inServiceQueue = activeQueue.filter(item => item.status === 'EM_ATENDIMENTO');
      const waitingQueue = activeQueue.filter(item => item.status === 'AGUARDANDO');

      const itemIndex = waitingQueue.findIndex(item => item.id === ticketId);
      if (itemIndex === -1) {
        throw new Error('Cliente não encontrado na fila de espera.');
      }

      const targetWaitingPosition = Math.min(
        Math.max(Math.trunc(newPosition), 1),
        waitingQueue.length
      );

      const reorderedWaiting = [...waitingQueue];
      const [movedItem] = reorderedWaiting.splice(itemIndex, 1);
      reorderedWaiting.splice(targetWaitingPosition - 1, 0, movedItem);

      const normalizedQueue = [...inServiceQueue, ...reorderedWaiting];

      const isToday = targetDate === this.getToday();
      const currentHHMM = this.getCurrentHHMM();
      let pauseMinutesRemaining = 0;
      if (isToday) {
        const stateDoc = await getDoc(doc(db, 'config', 'state'));
        const state = stateDoc.exists() ? stateDoc.data() : { agendaPausada: false, tempoRetomada: null };
        if (state.agendaPausada && state.tempoRetomada) {
          pauseMinutesRemaining = Math.max(0, Math.ceil((state.tempoRetomada - Date.now()) / 60000));
        }
      }

      const initialTime = isToday && currentHHMM > config.OPENING_TIME
        ? currentHHMM
        : config.OPENING_TIME;
      let lastTime = pauseMinutesRemaining > 0
        ? TimePredictorService.addMinutes(initialTime, pauseMinutesRemaining)
        : initialTime;
      if (inServiceQueue.length === 0 && this.isValidHHMM(preferredFirstWaitingTime)) {
        lastTime = preferredFirstWaitingTime;
      }

      const batch = writeBatch(db);

      for (const [index, item] of normalizedQueue.entries()) {
        const nextPosition = index + 1;
        const updates: Record<string, unknown> = {};

        if (item.posicao !== nextPosition) {
          updates.posicao = nextPosition;
        }

        if (item.status === 'EM_ATENDIMENTO') {
          if (isToday) {
            const elapsed = (Date.now() - (item.horaChamada || Date.now())) / 60000;
            const remaining = Math.max(0, item.tempoEstimado - elapsed);
            lastTime = TimePredictorService.addMinutes(
              currentHHMM,
              remaining + config.BUFFER_MINUTES + pauseMinutesRemaining
            );
          } else {
            const referenceStart = this.isValidHHMM(item.horaPrevista) ? item.horaPrevista : config.OPENING_TIME;
            lastTime = TimePredictorService.addMinutes(
              referenceStart,
              item.tempoEstimado + config.BUFFER_MINUTES
            );
          }
        } else {
          if (item.horaPrevista !== lastTime) {
            updates.horaPrevista = lastTime;
          }
          lastTime = TimePredictorService.addMinutes(
            lastTime,
            item.tempoEstimado + config.BUFFER_MINUTES
          );
        }

        if (Object.keys(updates).length > 0) {
          batch.update(doc(db, path, item.id), updates);
        }
      }

      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  }
}
