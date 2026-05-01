import {beforeEach, describe, expect, it, vi} from 'vitest';
import {createAppConfig, createClient, createQueueItem, createService} from '../test/factories';

const firestoreMocks = vi.hoisted(() => ({
  collection: vi.fn((_db: unknown, path: string) => ({path})),
  doc: vi.fn((...args: unknown[]) => {
    const maybeCollection = args[0] as {path?: string} | undefined;
    const id = typeof args[2] === 'string' ? args[2] : 'new-ticket';
    return {id, path: maybeCollection?.path ? `${maybeCollection.path}/${id}` : id};
  }),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  onSnapshot: vi.fn(),
  orderBy: vi.fn((field: string, direction: string) => ({field, direction})),
  query: vi.fn((...args: unknown[]) => ({args})),
  runTransaction: vi.fn(),
  updateDoc: vi.fn(),
  where: vi.fn((field: string, operator: string, value: unknown) => ({field, operator, value})),
  writeBatch: vi.fn(),
}));

vi.mock('firebase/firestore', () => firestoreMocks);

vi.mock('../firebase', () => ({
  db: {},
  handleFirestoreError: vi.fn((error: unknown) => {
    throw error;
  }),
  OperationType: {
    CREATE: 'create',
    UPDATE: 'update',
    DELETE: 'delete',
    LIST: 'list',
    GET: 'get',
    WRITE: 'write',
  },
}));

import {QueueService} from './QueueService';

function queueSnapshot(items: ReturnType<typeof createQueueItem>[]) {
  return {
    docs: items.map(item => ({
      id: item.id,
      data: () => item,
    })),
    empty: items.length === 0,
    size: items.length,
  };
}

describe('QueueService.addToQueue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    firestoreMocks.getDoc.mockResolvedValue({
      exists: () => false,
      data: () => ({}),
    });
  });

  it('keeps public client joins append-only', async () => {
    const transaction = {
      set: vi.fn(),
      update: vi.fn(),
    };
    firestoreMocks.getDocs.mockResolvedValue(queueSnapshot([
      createQueueItem({
        id: 'queue-1',
        clienteId: 'client-2',
        posicao: 1,
        horaPrevista: '09:00',
        tempoEstimado: 30,
      }),
    ]));
    firestoreMocks.runTransaction.mockImplementation(async (_db, callback) => callback(transaction));
    const recalculateSpy = vi.spyOn(QueueService, 'recalculateQueue').mockResolvedValue();

    const ticketId = await QueueService.addToQueue(
      createClient(),
      [createService()],
      createAppConfig(),
      '2026-04-27'
    );

    expect(ticketId).toBe('new-ticket');
    expect(transaction.set).toHaveBeenCalledOnce();
    expect(transaction.set.mock.calls[0][1]).toMatchObject({
      horaPrevista: '09:38',
      posicao: 2,
      status: 'AGUARDANDO',
    });
    expect(transaction.update).not.toHaveBeenCalled();
    expect(recalculateSpy).not.toHaveBeenCalled();
  });

  it('keeps privileged joins able to reorder and recalculate', async () => {
    const transaction = {
      set: vi.fn(),
      update: vi.fn(),
    };
    firestoreMocks.getDocs.mockResolvedValue(queueSnapshot([
      createQueueItem({id: 'queue-1', clienteId: 'client-2', posicao: 1}),
    ]));
    firestoreMocks.runTransaction.mockImplementation(async (_db, callback) => callback(transaction));
    const recalculateSpy = vi.spyOn(QueueService, 'recalculateQueue').mockResolvedValue();

    await QueueService.addToQueue(
      createClient(),
      [createService()],
      createAppConfig(),
      '2026-04-27',
      {manual: true, desiredPosition: 1}
    );

    expect(transaction.update).toHaveBeenCalledOnce();
    expect(transaction.update.mock.calls[0][0]).toMatchObject({id: 'queue-1'});
    expect(transaction.update.mock.calls[0][1]).toEqual({posicao: 2});
    expect(recalculateSpy).toHaveBeenCalledWith(createAppConfig(), '2026-04-27');
  });
});
