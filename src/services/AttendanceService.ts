import {
  collection,
  addDoc,
  updateDoc,
  doc,
  getDoc,
  runTransaction,
  serverTimestamp
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { QueueItem, Attendance, Client, AppConfig } from '../types';
import { QueueService } from './QueueService';
import { TimePredictorService } from './TimePredictorService';

export class AttendanceService {
  private static COLLECTION = 'history';

  /**
   * Finalizes an attendance, recording it in history and updating the client's EWMA.
   */
  static async finalizeAttendance(
    queueItem: QueueItem,
    config: AppConfig,
    barberEmail: string
  ): Promise<void> {
    const path = this.COLLECTION;
    try {
      await runTransaction(db, async (transaction) => {
        const now = Date.now();
        const startTime = queueItem.horaChamada || queueItem.horaEntrada;
        const durationReal = Math.round((now - startTime) / 60000);

        // 1. Ler cliente dentro da transação
        const clientRef = doc(db, 'clients', queueItem.clienteId);
        const clientDoc = await transaction.get(clientRef);

        // 2. Criar registro de histórico
        const historyRef = doc(collection(db, path));
        const attendance: Partial<Attendance> = {
          clienteId: queueItem.clienteId,
          clienteNome: queueItem.clienteNome,
          servicos: queueItem.servicos,
          data: queueItem.data,
          horaInicio: startTime,
          horaFim: now,
          duracaoReal: durationReal,
          duracaoEstimada: queueItem.tempoEstimado,
          barbeiro: barberEmail,
          manual: queueItem.manual,
        };
        transaction.set(historyRef, attendance);

        // 3. Atualizar EWMA do cliente
        if (clientDoc.exists()) {
          const clientData = clientDoc.data() as Client;
          const newAverage = TimePredictorService.calculateNewAverage(
            clientData.tempoMedio || 0,
            durationReal,
            config.EWMA_ALPHA
          );
          transaction.update(clientRef, {
            tempoMedio: newAverage,
            totalVisitas: (clientData.totalVisitas || 0) + 1,
          });
        }

        // 4. Atualizar status da fila
        const queueRef = doc(db, 'queue', queueItem.id);
        transaction.update(queueRef, {
          status: 'CONCLUIDO',
          horaFim: now,
        });
      });

      // 5. Recalcular fila (separado - tolera falha)
      await QueueService.recalculateQueue(config);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  }

  /**
   * Marks a client as absent.
   */
  static async markAsAbsent(queueItem: QueueItem, config: AppConfig): Promise<void> {
    try {
      await QueueService.updateStatus(queueItem.id, 'AUSENTE');
      await QueueService.recalculateQueue(config);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `queue/${queueItem.id}`);
    }
  }
}
