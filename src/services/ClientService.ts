import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  getDoc,
  serverTimestamp,
  orderBy,
  limit as firestoreLimit,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Client, Attendance, ClientWithInsights } from '../types';

export class ClientService {
  private static COLLECTION = 'clients';

  /**
   * Searches for a client by phone number.
   */
  static async findByTelefone(telefone: string): Promise<Client | null> {
    const path = this.COLLECTION;
    try {
      const q = query(collection(db, path), where('telefone', '==', telefone));
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        return { id: doc.id, ...doc.data() } as Client;
      }
      return null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
      return null;
    }
  }

  /**
   * Searches for a client by phone number or creates a new one.
   */
  static async findOrCreate(nome: string, telefone: string, dataNascimento?: string): Promise<{ client: Client, isNew: boolean }> {
    const path = this.COLLECTION;
    try {
      const existing = await this.findByTelefone(telefone);

      if (existing) {
        return { client: existing, isNew: false };
      }

      // Create new client
      const newClient: Partial<Client> = {
        nome,
        telefone,
        dataNascimento,
        totalVisitas: 0,
        tempoMedio: 0,
        dataCadastro: Date.now(),
        ativo: true,
      };

      const docRef = await addDoc(collection(db, path), newClient);
      return { client: { id: docRef.id, ...newClient } as Client, isNew: true };
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
      throw error;
    }
  }

  /**
   * Lists all active clients.
   */
  static async listAll(): Promise<Client[]> {
    const path = this.COLLECTION;
    try {
      const q = query(collection(db, path), where('ativo', '==', true));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Client));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  }

  static async listAllIncludingInactive(): Promise<Client[]> {
    const path = this.COLLECTION;
    try {
      const q = query(collection(db, path), orderBy('totalVisitas', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Client));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  }

  static async getClientHistory(clientId: string, limitCount: number = 20): Promise<Attendance[]> {
    const path = 'history';
    try {
      const q = query(
        collection(db, path),
        where('clienteId', '==', clientId),
        orderBy('horaInicio', 'desc'),
        firestoreLimit(limitCount)
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Attendance));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  }

  static async updateClient(
    id: string,
    data: Partial<Pick<Client, 'nome' | 'telefone' | 'dataNascimento'>>
  ): Promise<void> {
    const path = this.COLLECTION;
    try {
      await updateDoc(doc(db, path, id), data);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
      throw error;
    }
  }

  static async toggleActive(id: string, ativo: boolean): Promise<void> {
    const path = this.COLLECTION;
    try {
      await updateDoc(doc(db, path, id), { ativo });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
      throw error;
    }
  }

  static enrichClients(clients: Client[], allAttendances: Attendance[], today: string): ClientWithInsights[] {
    const currentMonth = today.slice(5, 7);

    return clients.map(client => {
      const history = allAttendances
        .filter(a => a.clienteId === client.id)
        .sort((a, b) => b.horaInicio - a.horaInicio);

      const lastVisitDate = history[0]?.data;

      let averageInterval: number | undefined;
      if (history.length >= 2) {
        const intervals: number[] = [];
        for (let i = 0; i < history.length - 1; i++) {
          const diff = (history[i].horaInicio - history[i + 1].horaInicio) / (1000 * 60 * 60 * 24);
          intervals.push(diff);
        }
        averageInterval = Math.round(intervals.reduce((s, v) => s + v, 0) / intervals.length);
      }

      const daysSinceLastVisit = lastVisitDate
        ? Math.floor(
            (new Date(today + 'T12:00:00').getTime() - new Date(lastVisitDate + 'T12:00:00').getTime()) /
            (1000 * 60 * 60 * 24)
          )
        : Infinity;

      const isAtRisk =
        client.totalVisitas > 0 &&
        (daysSinceLastVisit > 45 ||
          (averageInterval !== undefined && daysSinceLastVisit > averageInterval * 1.5));

      let segment: ClientWithInsights['segment'];
      if (isAtRisk) segment = 'AT_RISK';
      else if (client.totalVisitas >= 10) segment = 'VIP';
      else if (client.totalVisitas >= 3) segment = 'REGULAR';
      else segment = 'NEW';

      const birthdayThisMonth =
        !!client.dataNascimento && client.dataNascimento.slice(5, 7) === currentMonth;

      return {
        ...client,
        lastVisitDate,
        averageInterval,
        segment,
        birthdayThisMonth,
        isAtRisk,
      };
    });
  }
}
