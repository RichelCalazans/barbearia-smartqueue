import { useState, useEffect, useCallback } from 'react';
import { collection, query, where, orderBy, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { QueueItem, AppConfig } from '../types';
import { QueueService } from '../services/QueueService';
import { QueueMedianService } from '../services/QueueMedianService';

export interface QueueState {
  items: QueueItem[];
  loading: boolean;
  activeCount: number;
  waitingCount: number;
  ewtByTicket: Map<string, number>;
}

export function useQueueRealtime(config: AppConfig) {
  const [state, setState] = useState<QueueState>({
    items: [],
    loading: true,
    activeCount: 0,
    waitingCount: 0,
    ewtByTicket: new Map(),
  });

  const recalculateEWT = useCallback(async (items: QueueItem[]) => {
    const ewtByTicket = new Map<string, number>();
    
    const serviceMedians = new Map<string, number>();
    for (const item of items) {
      for (const serviceId of item.servicosIds) {
        if (!serviceMedians.has(serviceId)) {
          const result = await QueueMedianService.getServiceMedian(serviceId, config);
          serviceMedians.set(serviceId, result.median);
        }
      }
    }

    let activeBarbers = state.activeCount || 1;
    if (activeBarbers === 0) activeBarbers = 1;

    let cumulativeTime = 0;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.status === 'EM_ATENDIMENTO') {
        cumulativeTime += item.tempoEstimado;
      } else {
        const ewt = QueueMedianService.calculateEWT(
          i,
          serviceMedians,
          activeBarbers
        );
        ewtByTicket.set(item.id, ewt);
      }
    }

    setState(prev => ({ ...prev, items, ewtByTicket, loading: false }));
  }, [config, state.activeCount]);

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    const q = query(
      collection(db, 'queue'),
      where('data', '==', today),
      where('status', 'in', ['AGUARDANDO', 'EM_ATENDIMENTO']),
      orderBy('posicao', 'asc')
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as QueueItem));
      const activeCount = items.filter(i => i.status === 'EM_ATENDIMENTO').length;
      const waitingCount = items.filter(i => i.status === 'AGUARDANDO').length;

      setState(prev => ({ 
        ...prev, 
        items, 
        activeCount, 
        waitingCount,
        loading: false 
      }));

      await recalculateEWT(items);
    });

    return unsubscribe;
  }, [config, recalculateEWT]);

  const reorder = useCallback(async (ticketId: string, newPosition: number) => {
    await QueueService.reorderQueue(ticketId, newPosition, config);
  }, [config]);

  const addToQueue = useCallback(async (client: any, services: any[]) => {
    await QueueService.addToQueue(client, services, config);
  }, [config]);

  return {
    ...state,
    reorder,
    addToQueue,
  };
}