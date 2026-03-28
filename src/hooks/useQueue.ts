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
      const items = snapshot.docs.map(d => {
        const data = d.data() as QueueItem;
        // Ensure horaPrevista is always in HH:MM format
        if (typeof data.horaPrevista === 'string' && data.horaPrevista.match(/^\d{2}:\d{2}$/)) {
          return { id: d.id, ...data };
        }
        // If horaPrevista is malformed, try to extract HH:MM part
        if (typeof data.horaPrevista === 'string') {
          const match = data.horaPrevista.match(/^(\d{2}:\d{2})/);
          if (match) {
            data.horaPrevista = match[1];
          } else {
            // Handle cases like "06:45.14918333333344" - extract just HH:MM
            const parts = data.horaPrevista.split(':');
            if (parts.length >= 2) {
              data.horaPrevista = `${parts[0].padStart(2, '0')}:${parts[1].split('.')[0].padStart(2, '0')}`;
            } else {
              data.horaPrevista = '--:--';
            }
          }
        } else {
          data.horaPrevista = '--:--';
        }
        return { id: d.id, ...data };
      });
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
