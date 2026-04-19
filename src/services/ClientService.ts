import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
  orderBy,
  limit as firestoreLimit,
  writeBatch,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Client, Attendance, ClientWithInsights, ClientOrigin, ClientRegistrationStatus } from '../types';
import { normalizePhone } from '../utils';

interface ManualClientUpsertResult {
  client: Client;
  created: boolean;
  reused: boolean;
}

export class ClientService {
  private static COLLECTION = 'clients';

  private static toClient(id: string, data: any): Client {
    const normalizedPhone = normalizePhone(data.telefoneNormalizado || data.telefone || '');
    const resolvedStatus: ClientRegistrationStatus =
      data.registrationStatus || (data.dataNascimento ? 'ACTIVE' : 'PENDING_COMPLETION');
    const resolvedOrigin: ClientOrigin =
      data.createdOrigin || (data.createdByBarber ? 'BARBER_MANUAL' : 'CLIENT_SELF');
    const now = Date.now();

    return {
      id,
      nome: data.nome || '',
      telefone: normalizePhone(data.telefone || normalizedPhone),
      telefoneNormalizado: normalizedPhone,
      dataNascimento: data.dataNascimento,
      totalVisitas: data.totalVisitas ?? 0,
      tempoMedio: data.tempoMedio ?? 0,
      dataCadastro: data.dataCadastro ?? now,
      ativo: data.ativo ?? true,
      registrationStatus: resolvedStatus,
      createdOrigin: resolvedOrigin,
      createdByBarber: data.createdByBarber ?? (resolvedOrigin === 'BARBER_MANUAL'),
      hasCompletedSignup: data.hasCompletedSignup ?? (resolvedStatus === 'ACTIVE'),
      completedAt: data.completedAt ?? (resolvedStatus === 'ACTIVE' ? (data.dataCadastro ?? now) : null),
      updatedAt: data.updatedAt ?? (data.dataCadastro ?? now),
    };
  }

  private static pickPrimaryClient(clients: Client[]): Client {
    return [...clients].sort((a, b) => {
      const scoreA = (a.registrationStatus === 'ACTIVE' ? 100000 : 0) + (a.totalVisitas || 0) * 100 - (a.dataCadastro || 0);
      const scoreB = (b.registrationStatus === 'ACTIVE' ? 100000 : 0) + (b.totalVisitas || 0) * 100 - (b.dataCadastro || 0);
      return scoreB - scoreA;
    })[0];
  }

  private static async findAllByNormalizedPhone(telefoneNormalizado: string): Promise<Client[]> {
    const path = this.COLLECTION;
    try {
      const normalized = normalizePhone(telefoneNormalizado);
      if (!normalized) return [];

      const byNormalizedQuery = query(collection(db, path), where('telefoneNormalizado', '==', normalized));
      const byNormalizedSnapshot = await getDocs(byNormalizedQuery);

      if (!byNormalizedSnapshot.empty) {
        return byNormalizedSnapshot.docs.map(d => this.toClient(d.id, d.data()));
      }

      // Fallback for legacy docs that do not have `telefoneNormalizado`.
      const byLegacyPhoneQuery = query(collection(db, path), where('telefone', '==', normalized));
      const byLegacySnapshot = await getDocs(byLegacyPhoneQuery);
      return byLegacySnapshot.docs.map(d => this.toClient(d.id, d.data()));
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
      return [];
    }
  }

  private static async ensureCanonicalPhoneFields(client: Client): Promise<void> {
    const path = this.COLLECTION;
    const normalized = normalizePhone(client.telefoneNormalizado || client.telefone);
    const needsPhone = client.telefone !== normalized;
    const needsNormalized = client.telefoneNormalizado !== normalized;

    if (!needsPhone && !needsNormalized) return;

    try {
      await updateDoc(doc(db, path, client.id), {
        telefone: normalized,
        telefoneNormalizado: normalized,
        updatedAt: Date.now(),
      });
    } catch {
      // Non-blocking migration patch.
    }
  }

  /**
   * Searches for a client by phone number.
   */
  static async findByTelefone(telefone: string): Promise<Client | null> {
    const normalized = normalizePhone(telefone);
    if (!normalized) return null;

    try {
      const allCandidates = await this.findAllByNormalizedPhone(normalized);
      if (allCandidates.length === 0) return null;

      const client = this.pickPrimaryClient(allCandidates);
      await this.ensureCanonicalPhoneFields(client);
      return client;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, this.COLLECTION);
      return null;
    }
  }

  /**
   * Searches for a client by phone number or creates a new one.
   */
  static async findOrCreate(nome: string, telefone: string, dataNascimento?: string): Promise<{ client: Client, isNew: boolean }> {
    const path = this.COLLECTION;
    try {
      const normalizedPhone = normalizePhone(telefone);
      const cleanName = nome.trim();
      const now = Date.now();
      const existing = await this.findByTelefone(normalizedPhone);

      if (existing) {
        const updates: Record<string, unknown> = {
          telefone: normalizedPhone,
          telefoneNormalizado: normalizedPhone,
          updatedAt: now,
        };

        if (cleanName && cleanName !== existing.nome) {
          updates.nome = cleanName;
        }

        if (!existing.dataNascimento && dataNascimento) {
          updates.dataNascimento = dataNascimento;
        }

        const willCompleteSignup = !!dataNascimento && existing.registrationStatus !== 'ACTIVE';
        if (willCompleteSignup) {
          updates.registrationStatus = 'ACTIVE';
          updates.hasCompletedSignup = true;
          updates.completedAt = now;
        }

        if (Object.keys(updates).length > 0) {
          await updateDoc(doc(db, path, existing.id), updates);
        }

        const mergedClient: Client = {
          ...existing,
          ...updates,
        } as Client;

        return { client: mergedClient, isNew: false };
      }

      const hasCompletedSignup = !!dataNascimento;
      // Create new client
      const newClient: Partial<Client> = {
        nome: cleanName,
        telefone: normalizedPhone,
        telefoneNormalizado: normalizedPhone,
        dataNascimento,
        totalVisitas: 0,
        tempoMedio: 0,
        dataCadastro: now,
        ativo: true,
        registrationStatus: hasCompletedSignup ? 'ACTIVE' : 'PENDING_COMPLETION',
        createdOrigin: 'CLIENT_SELF',
        createdByBarber: false,
        hasCompletedSignup,
        completedAt: hasCompletedSignup ? now : null,
        updatedAt: now,
      };

      const docRef = await addDoc(collection(db, path), newClient);
      return { client: this.toClient(docRef.id, newClient), isNew: true };
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
      throw error;
    }
  }

  /**
   * Creates (or reuses) a minimal client draft added manually by the barber.
   */
  static async createOrReuseManualClient(nome: string, telefone: string): Promise<ManualClientUpsertResult> {
    const path = this.COLLECTION;
    try {
      const cleanName = nome.trim();
      const normalizedPhone = normalizePhone(telefone);
      const now = Date.now();

      const existing = await this.findByTelefone(normalizedPhone);
      if (existing) {
        const updates: Record<string, unknown> = {
          telefone: normalizedPhone,
          telefoneNormalizado: normalizedPhone,
          ativo: true,
          updatedAt: now,
        };

        const canRefreshName = existing.registrationStatus !== 'ACTIVE' || existing.createdByBarber;
        if (canRefreshName && cleanName && cleanName !== existing.nome) {
          updates.nome = cleanName;
        }

        if (!existing.registrationStatus) {
          updates.registrationStatus = existing.dataNascimento ? 'ACTIVE' : 'PENDING_COMPLETION';
        }
        if (existing.hasCompletedSignup === undefined) {
          updates.hasCompletedSignup = existing.registrationStatus === 'ACTIVE' || !!existing.dataNascimento;
        }

        if (Object.keys(updates).length > 0) {
          await updateDoc(doc(db, path, existing.id), updates);
        }

        return {
          client: { ...existing, ...updates } as Client,
          created: false,
          reused: true,
        };
      }

      const draftClient: Partial<Client> = {
        nome: cleanName,
        telefone: normalizedPhone,
        telefoneNormalizado: normalizedPhone,
        totalVisitas: 0,
        tempoMedio: 0,
        dataCadastro: now,
        ativo: true,
        registrationStatus: 'PENDING_COMPLETION',
        createdOrigin: 'BARBER_MANUAL',
        createdByBarber: true,
        hasCompletedSignup: false,
        completedAt: null,
        updatedAt: now,
      };

      const docRef = await addDoc(collection(db, path), draftClient);
      return {
        client: this.toClient(docRef.id, draftClient),
        created: true,
        reused: false,
      };
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
      throw error;
    }
  }

  /**
   * Completes an existing pre-registered client without changing identity.
   */
  static async completeExistingClientRegistration(
    clientId: string,
    data: { nome: string; telefone: string; dataNascimento: string }
  ): Promise<Client> {
    const path = this.COLLECTION;
    try {
      const ref = doc(db, path, clientId);
      const snapshot = await getDoc(ref);
      if (!snapshot.exists()) {
        throw new Error('Cliente não encontrado para completar cadastro.');
      }

      const currentClient = this.toClient(snapshot.id, snapshot.data());
      const normalizedPhone = normalizePhone(data.telefone);
      const now = Date.now();

      if (normalizedPhone !== currentClient.telefoneNormalizado) {
        const existingByPhone = await this.findByTelefone(normalizedPhone);
        if (existingByPhone && existingByPhone.id !== currentClient.id) {
          throw new Error('Este telefone já pertence a outro cliente.');
        }
      }

      const updates: Partial<Client> = {
        nome: data.nome.trim(),
        telefone: normalizedPhone,
        telefoneNormalizado: normalizedPhone,
        dataNascimento: data.dataNascimento,
        registrationStatus: 'ACTIVE',
        hasCompletedSignup: true,
        completedAt: now,
        updatedAt: now,
      };

      await updateDoc(ref, updates);
      return {
        ...currentClient,
        ...updates,
      } as Client;
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `${path}/${clientId}`);
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
      return snapshot.docs.map(d => this.toClient(d.id, d.data()));
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
      return snapshot.docs.map(d => this.toClient(d.id, d.data()));
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
      const updates: Record<string, unknown> = {
        ...data,
        updatedAt: Date.now(),
      };
      if (data.telefone) {
        const normalized = normalizePhone(data.telefone);
        updates.telefone = normalized;
        updates.telefoneNormalizado = normalized;
      }
      await updateDoc(doc(db, path, id), updates);
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

  static async deleteClient(id: string): Promise<void> {
    const path = this.COLLECTION;
    try {
      await deleteDoc(doc(db, path, id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
      throw error;
    }
  }

  static async resetTempoMedioAll(): Promise<number> {
    const path = this.COLLECTION;
    try {
      const snapshot = await getDocs(collection(db, path));
      const toReset = snapshot.docs.filter(d => d.data().tempoMedio !== 0);
      if (toReset.length === 0) return 0;

      // Firestore batch limit is 500 ops
      for (let i = 0; i < toReset.length; i += 500) {
        const batch = writeBatch(db);
        toReset.slice(i, i + 500).forEach(d => {
          batch.update(d.ref, { tempoMedio: 0 });
        });
        await batch.commit();
      }
      return toReset.length;
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
      throw error;
    }
  }

  static async resetTempoMedioById(id: string): Promise<void> {
    const path = this.COLLECTION;
    try {
      await updateDoc(doc(db, path, id), { tempoMedio: 0 });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
      throw error;
    }
  }

  static async searchByNomeOrTelefone(query_: string): Promise<Client[]> {
    const all = await this.listAllIncludingInactive();
    const q = query_.toLowerCase().trim();
    if (!q) return [];
    return all
      .filter(c =>
        c.nome.toLowerCase().includes(q) ||
        normalizePhone(c.telefone).includes(normalizePhone(q)) ||
        (c.telefoneNormalizado || '').includes(normalizePhone(q))
      )
      .slice(0, 20);
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
