Você é um especialista em Firebase/Firestore e React. Sua tarefa é tornar as operações críticas do SmartQueue atômicas usando transactions e batches.

## Contexto

O SmartQueue tem operações que fazem múltiplas escritas no Firestore sem garantia de atomicidade. Se uma escrita falhar no meio, os dados ficam inconsistentes.

## Tarefa 1: Corrigir AttendanceService.ts

Edite `src/services/AttendanceService.ts` para usar `runTransaction`:

### Adicionar imports

No topo do arquivo, adicionar `runTransaction` e `collection` aos imports:
```typescript
import {
  collection,
  addDoc,
  updateDoc,
  doc,
  getDoc,
  runTransaction,
  serverTimestamp
} from 'firebase/firestore';
```

### Reescrever finalizeAttendance

Substituir o método `finalizeAttendance` completo por:

```typescript
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
```

## Tarefa 2: Corrigir QueueService.ts

Edite `src/services/QueueService.ts` para usar `writeBatch`:

### Adicionar import

Adicionar `writeBatch` aos imports existentes:
```typescript
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
```

### Reescrever recalculateQueue

Substituir o método `recalculateQueue` completo por:

```typescript
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

    const batch = writeBatch(db);
    let lastTime = config.OPENING_TIME;
    const now = new Date();
    const currentHHMM = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    for (let i = 0; i < queue.length; i++) {
      const item = queue[i];
      if (item.status === 'EM_ATENDIMENTO') {
        const elapsed = (Date.now() - (item.horaChamada || Date.now())) / 60000;
        const remaining = Math.max(0, item.tempoEstimado - elapsed);
        lastTime = TimePredictorService.addMinutes(currentHHMM, remaining + config.BUFFER_MINUTES);
      } else {
        let horaPrevista: string;
        if (i === 0 && !queue.some(it => it.status === 'EM_ATENDIMENTO')) {
          horaPrevista = currentHHMM > config.OPENING_TIME ? currentHHMM : config.OPENING_TIME;
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
```

## Verificação

1. Leia `AttendanceService.ts` e confirme que `runTransaction` está sendo usado
2. Leia `QueueService.ts` e confirme que `writeBatch` está sendo usado
3. Verifique que os imports estão corretos em ambos os arquivos

## Importante

- NÃO modifique outros métodos dos services
- Mantenha os error handlers existentes (`handleFirestoreError`)
- NÃO altere as interfaces ou tipos
