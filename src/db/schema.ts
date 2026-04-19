import { QueueStatus } from '../types';

export interface DbQueuePosition {
  id: string;
  tenantId: string;
  ticketId: string;
  clientId: string;
  clientName: string;
  serviceTypeId: string;
  serviceTypeName: string;
  position: number;
  status: QueueStatus;
  addedAt: Date;
  calledAt?: Date;
  finishedAt?: Date;
  estimatedTime?: number;
  phone?: string;
}

export interface DbAttendance {
  id: string;
  tenantId: string;
  clientId: string;
  serviceTypeId: string;
  data: string;
  horaInicio: Date;
  horaFim: Date;
  duracaoReal: number;
  duracaoEstimada: number;
}

export interface DbServiceType {
  id: string;
  tenantId: string;
  nome: string;
  tempoBase: number;
}

export interface QueueState {
  items: DbQueuePosition[];
  activeCount: number;
  waitingCount: number;
}

export interface EWTResult {
  median: number;
  source: 'median' | 'default' | 'unavailable';
  capped?: boolean;
}

export interface ReorderPayload {
  ticketId: string;
  newPosition: number;
}

export interface SSEQueueUpdate {
  ticketId: string;
  clientName: string;
  service: string;
  position: number;
  ewt: number;
  action: 'add' | 'reorder' | 'remove' | 'update';
}
