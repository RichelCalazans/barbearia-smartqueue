# FLUXOS.md — Fluxos de Dados Críticos

> Última atualização: 2026-03-27

---

## Fluxo 1: Cliente Entra na Fila (Happy Path)

### Sequência

```
ClientView.tsx                    ClientService.ts              QueueService.ts              TimePredictorService.ts
     │                                  │                            │                              │
     │ 1. Submit form                   │                            │                              │
     │    (nome, telefone, serviços)    │                            │                              │
     │──────────────────────────────────►│                            │                              │
     │                                  │ 2. findOrCreate(nome, tel) │                              │
     │                                  │    Firestore query:        │                              │
     │                                  │    clients WHERE           │                              │
     │                                  │    telefone == tel         │                              │
     │                                  │                            │                              │
     │                                  │ 3a. Se existe → retorna    │                              │
     │                                  │ 3b. Se novo → addDoc       │                              │
     │                                  │    {totalVisitas:0,        │                              │
     │                                  │     tempoMedio:0}          │                              │
     │◄──────────────────────────────────│                            │                              │
     │ client + isNew                   │                            │                              │
     │                                  │                            │                              │
     │──────────────────────────────────────────────────────────────►│                              │
     │                                  │  4. addToQueue(client,     │                              │
     │                                  │     services, config)      │                              │
     │                                  │                            │ 5. getDocs(queue hoje)       │
     │                                  │                            │    Verifica se < MAX_DAILY   │
     │                                  │                            │                              │
     │                                  │                            │──────────────────────────────►│
     │                                  │                            │ 6. predictServiceTime        │
     │                                  │                            │    (client, baseTime, config)│
     │                                  │                            │                              │
     │                                  │                            │    Se novo: baseTime × 1.25  │
     │                                  │                            │    Se recorrente: tempoMedio │
     │                                  │                            │◄──────────────────────────────│
     │                                  │                            │                              │
     │                                  │                            │ 7. Calcula horaPrevista:     │
     │                                  │                            │    último.horaPrevista +     │
     │                                  │                            │    último.tempoEstimado +    │
     │                                  │                            │    BUFFER_MINUTES            │
     │                                  │                            │                              │
     │                                  │                            │ 8. addDoc(queue, {           │
     │                                  │                            │      status: AGUARDANDO,     │
     │                                  │                            │      posicao, tempoEstimado, │
     │                                  │                            │      horaPrevista, ...       │
     │                                  │                            │    })                        │
     │◄────────────────────────────────────────────────────────────────│                              │
     │ queueId                          │                            │                              │
     │                                  │                            │                              │
     │ 9. useQueue hook (onSnapshot)    │                            │                              │
     │    atualiza a fila em realtime   │                            │                              │
```

### Firestore Writes
1. `clients` — addDoc (se novo) com validação por rules
2. `queue` — addDoc com `status: 'AGUARDANDO'` + todos os campos obrigatórios

### Possíveis Erros
- `Fila cheia para hoje` — se `currentQueue.length >= MAX_DAILY_CLIENTS`
- Firestore permission denied — se rules rejeitam (campo faltando, tipo errado)
- Network error — sem tratamento de retry (depende do SDK do Firebase)

### Latência Esperada
- findOrCreate: ~100-200ms (1-2 queries Firestore)
- addToQueue: ~200-400ms (1 query + 1 write)
- Total: **~300-600ms**

---

## Fluxo 2: Barbeiro Finaliza Atendimento (Happy Path)

### Sequência

```
BarberDashboard.tsx          AttendanceService.ts           Firestore (Transaction)        QueueService.ts
     │                            │                              │                              │
     │ 1. Click "Finalizar"       │                              │                              │
     │    → Modal confirma        │                              │                              │
     │──────────────────────────►│                              │                              │
     │                            │ 2. finalizeAttendance        │                              │
     │                            │    (queueItem, config, email)│                              │
     │                            │                              │                              │
     │                            │──────── runTransaction ─────►│                              │
     │                            │                              │                              │
     │                            │  DENTRO DA TRANSACTION:       │                              │
     │                            │  3. transaction.get(clientRef)│                              │
     │                            │     Lê client atual          │                              │
     │                            │                              │                              │
     │                            │  4. transaction.set(historyRef)                             │
     │                            │     Cria registro em history: │                              │
     │                            │     {duracaoReal, duracaoEstimada,                          │
     │                            │      clienteId, servicos, ...}│                              │
     │                            │                              │                              │
     │                            │  5. calculateNewAverage       │                              │
     │                            │     novaMedia = 0.3×real +    │                              │
     │                            │                0.7×anterior   │                              │
     │                            │                              │                              │
     │                            │  6. transaction.update(clientRef)                           │
     │                            │     {tempoMedio: novaMedia,   │                              │
     │                            │      totalVisitas: +1}        │                              │
     │                            │                              │                              │
     │                            │  7. transaction.update(queueRef)                            │
     │                            │     {status: CONCLUIDO,       │                              │
     │                            │      horaFim: now}            │                              │
     │                            │                              │                              │
     │                            │◄─── Transaction committed ───│                              │
     │                            │                              │                              │
     │                            │──────────────────────────────────────────────────────────────►│
     │                            │                              │  8. recalculateQueue(config) │
     │                            │                              │     writeBatch:               │
     │                            │                              │     Para cada AGUARDANDO:     │
     │                            │                              │     atualiza horaPrevista     │
     │                            │                              │     em cascata                │
     │◄──────────────────────────────────────────────────────────────────────────────────────────│
     │                            │                              │                              │
     │ 9. onSnapshot dispara      │                              │                              │
     │    UI atualiza: cliente    │                              │                              │
     │    removido da fila ativa  │                              │                              │
```

### Firestore Writes (atômico via transaction)
1. `history` — set (novo documento de atendimento)
2. `clients/{id}` — update (tempoMedio + totalVisitas)
3. `queue/{id}` — update (status: CONCLUIDO, horaFim)
4. Fora da transaction: `queue` — writeBatch (recalcula horaPrevista de todos)

### Possíveis Erros
- Transaction conflict — se outro write acontece simultaneamente (retry automático do Firestore, até 5x)
- Permission denied — se user não é admin
- recalculateQueue falha — tolerado (fila fica com horários desatualizados até próxima ação)

### Latência Esperada
- Transaction: ~200-500ms
- recalculateQueue: ~100-300ms (depende do tamanho da fila)
- Total: **~300-800ms**

---

## Fluxo 3: Cliente Cancela Sua Posição

### Sequência

```
ClientView.tsx                    Firestore Rules                     QueueService.ts
     │                                  │                                  │
     │ 1. Click "Cancelar"              │                                  │
     │    updateDoc(queue/{id}, {       │                                  │
     │      status: 'CANCELADO',        │                                  │
     │      horaFim: now                │                                  │
     │    })                            │                                  │
     │──────────────────────────────────►│                                  │
     │                                  │ 2. Rules verificam:              │
     │                                  │    resource.data.status ==       │
     │                                  │    'AGUARDANDO' &&               │
     │                                  │    request.resource.data.status  │
     │                                  │    == 'CANCELADO' &&             │
     │                                  │    diff.affectedKeys.hasOnly     │
     │                                  │    (['status', 'horaFim'])       │
     │                                  │                                  │
     │                                  │ 3. Se válido → write aceito     │
     │◄──────────────────────────────────│                                  │
     │                                  │                                  │
     │ 4. onSnapshot atualiza fila      │                                  │
     │    (item some da lista ativa)    │                                  │
```

### Segurança
O cliente **não precisa estar autenticado** para cancelar, mas as rules garantem que:
- Só pode mudar de AGUARDANDO → CANCELADO
- Só pode alterar `status` e `horaFim` (nenhum outro campo)
- Não pode cancelar item EM_ATENDIMENTO

### Nota
Após cancelamento, a fila **não** é recalculada automaticamente. Os horários previstos dos clientes seguintes ficam incorretos até que o barbeiro faça outra ação (chamar próximo, finalizar). Isso é um **debt técnico**.

---

## Fluxo 4: Auto Open/Close da Agenda

### Sequência

```
BarberDashboard.tsx              ConfigService.ts                    Firestore
     │                                  │                              │
     │ useEffect → setInterval(60s)     │                              │
     │──────────────────────────────────►│                              │
     │                                  │ checkAutoOpenClose            │
     │                                  │ (config, currentState)        │
     │                                  │                              │
     │                                  │ 1. config.AUTO_OPEN_CLOSE?   │
     │                                  │    Se false → return          │
     │                                  │                              │
     │                                  │ 2. dayOfWeek = now.getDay()  │
     │                                  │    schedule = WEEKLY_SCHEDULE │
     │                                  │    [dayOfWeek]                │
     │                                  │                              │
     │                                  │ 3. Se dia desabilitado &&    │
     │                                  │    agenda aberta → fechar     │
     │                                  │                              │
     │                                  │ 4. Se dentro do horário &&   │
     │                                  │    agenda fechada → abrir     │
     │                                  │                              │
     │                                  │ 5. Se fora do horário &&     │
     │                                  │    agenda aberta → fechar     │
     │                                  │                              │
     │                                  │───────────────────────────────►│
     │                                  │    setDoc(config/state, {     │
     │                                  │      agendaAberta: shouldBeOpen│
     │                                  │    }, { merge: true })        │
     │◄──────────────────────────────────│◄──────────────────────────────│
     │ onStateChange listener atualiza  │                              │
```

### Importante
O auto open/close **só funciona quando o dashboard do barbeiro está aberto** — roda no useEffect do `BarberDashboard`. Se ninguém estiver logado, o auto open/close não acontece.

---

## Fluxo 5: Pausa e Auto-Resume da Agenda

### Sequência

```
BarberDashboard.tsx              ConfigService.ts                    Firestore
     │                                  │                              │
     │ 1. Click "Pausar" → Modal        │                              │
     │    seleciona tempo (15/30/...)    │                              │
     │──────────────────────────────────►│                              │
     │                                  │ 2. togglePause(true, 30)     │
     │                                  │    tempoRetomada =            │
     │                                  │    Date.now() + 30*60*1000   │
     │                                  │───────────────────────────────►│
     │                                  │    setDoc(config/state, {     │
     │                                  │      agendaPausada: true,     │
     │                                  │      tempoRetomada: ts        │
     │                                  │    })                         │
     │                                  │                              │
     │ 3. useEffect → setInterval(1s)   │                              │
     │    Calcula remaining =            │                              │
     │    tempoRetomada - Date.now()    │                              │
     │    Mostra countdown na UI         │                              │
     │                                  │                              │
     │ 4. Quando remaining <= 0:         │                              │
     │──────────────────────────────────►│                              │
     │                                  │ togglePause(false)            │
     │                                  │───────────────────────────────►│
     │                                  │    setDoc(config/state, {     │
     │                                  │      agendaPausada: false,    │
     │                                  │      tempoRetomada: null      │
     │                                  │    })                         │
     │◄──────────────────────────────────│◄──────────────────────────────│
     │ onStateChange → UI volta ao      │                              │
     │ normal                            │                              │
```

### Nota
Como no auto open/close, o auto-resume **depende do dashboard estar aberto**. Se o barbeiro fechar o browser durante uma pausa, ela não será retomada automaticamente.
