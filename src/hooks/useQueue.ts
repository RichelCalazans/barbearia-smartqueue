import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { QueueItem } from '../types';

export function useQueue() {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    const q = query(
      collection(db, 'queue'),
      where('data', '==', today),
      where('status', 'in', ['AGUARDANDO', 'EM_ATENDIMENTO']),
      orderBy('posicao', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as QueueItem));
      setQueue(items);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const waiting = queue.filter(item => item.status === 'AGUARDANDO');
  const inService = queue.find(item => item.status === 'EM_ATENDIMENTO');

  return {
    queue,
    waiting,
    inService,
    loading,
    totalWaiting: waiting.length,
  };
}
