Você é um especialista em TypeScript e Firebase Firestore. Sua tarefa é expandir os tipos e serviços do SmartQueue — um app de fila virtual para barbearia.

## Stack
- TypeScript strict
- Firebase Firestore SDK v9 (modular imports)
- Todas as computações de agregação são client-side (Firestore não suporta server-side)

## Arquivos que você DEVE modificar
1. `src/types/index.ts`
2. `src/services/AnalyticsService.ts`
3. `src/services/ClientService.ts`

## Arquivos que você NÃO pode modificar
Todos os outros. Especialmente: App.tsx, BarberDashboard.tsx, BottomNavigation.tsx, pages/*.

---

## TAREFA 1: Expandir types/index.ts

Adicione os seguintes tipos ao FINAL do arquivo. NÃO remova nenhum tipo existente.

```typescript
// === Metrics Types ===

export type MetricsPeriod = 'hoje' | '7dias' | '30dias';

export type ClientSegment = 'ALL' | 'ACTIVE' | 'VIP' | 'AT_RISK';

export interface PeriodMetrics {
  totalAttended: number;
  averageTime: number;
  retentionRate: number;
  noShowRate: number;
  chairUtilization: number;
  attendances: Attendance[];
  deltas: {
    totalAttended: number;
    averageTime: number;
    retentionRate: number;
    noShowRate: number;
  };
}

export interface DailyCount {
  date: string;
  count: number;
}

export interface HourDistribution {
  hour: number;
  count: number;
}

export interface ServicePopularity {
  name: string;
  count: number;
  percentage: number;
}

export interface ClientWithInsights extends Client {
  lastVisitDate?: string;
  averageInterval?: number;
  segment: 'NEW' | 'REGULAR' | 'VIP' | 'AT_RISK';
  birthdayThisMonth: boolean;
  isAtRisk: boolean;
}
```

---

## TAREFA 2: Expandir AnalyticsService.ts

O arquivo atual tem 2 métodos: `getDailyMetrics()` e `getTopClients()`. NÃO os remova.

### Contexto dos tipos existentes (já importados)
```typescript
interface Attendance {
  id: string; clienteId: string; clienteNome: string; servicos: string;
  data: string; horaInicio: number; horaFim: number;
  duracaoReal: number; duracaoEstimada: number; barbeiro: string; manual: boolean;
}
interface AppConfig {
  BUFFER_MINUTES: number; EWMA_ALPHA: number; NEW_CLIENT_MULTIPLIER: number;
  MAX_DAILY_CLIENTS: number; OPENING_TIME: string; CLOSING_TIME: string;
  BARBER_EMAIL: string; BARBER_NAME: string; SHOP_NAME: string;
  AUTO_REFRESH_SECONDS: number; TIMEZONE: string;
  WEEKLY_SCHEDULE: DaySchedule[]; AUTO_OPEN_CLOSE: boolean;
}
interface QueueItem {
  id: string; posicao: number; clienteId: string; clienteNome: string;
  servicos: string; servicosIds: string[]; tempoEstimado: number;
  horaPrevista: string; status: QueueStatus; horaEntrada: number;
  horaChamada?: number; horaFim?: number; data: string; telefone: string; manual: boolean;
}
```

### Imports a adicionar
```typescript
import { QueueItem, AppConfig, MetricsPeriod, PeriodMetrics, DailyCount, HourDistribution, ServicePopularity, ClientWithInsights, Client } from '../types';
```

### Métodos a implementar

#### `getHistoryForPeriod(days: number): Promise<Attendance[]>`
Busca history onde `data >= startDate` (YYYY-MM-DD).
- Calcule startDate: `new Date()`, subtraia `days - 1` dias, formate como YYYY-MM-DD
- Query: `query(collection(db, 'history'), where('data', '>=', startDate), orderBy('data', 'asc'))`
- Wrap em try/catch com handleFirestoreError

#### `getQueueForPeriod(days: number): Promise<QueueItem[]>`
Mesma lógica para a coleção `queue`.
- Query: `query(collection(db, 'queue'), where('data', '>=', startDate), orderBy('data', 'asc'))`

#### `getPeriodMetrics(period: MetricsPeriod, config: AppConfig): Promise<PeriodMetrics>`
Método principal. Lógica:
```
const days = period === 'hoje' ? 1 : period === '7dias' ? 7 : 30;
const doubleDays = days * 2;

// Uma única query — 60 dias de history
const allHistory = await this.getHistoryForPeriod(doubleDays);
const allQueue = await this.getQueueForPeriod(doubleDays);

const today = new Date();
const cutoffDate = // YYYY-MM-DD de (today - days) dias atrás

const current = allHistory.filter(a => a.data >= cutoffDate);
const previous = allHistory.filter(a => a.data < cutoffDate);

const currentQueue = allQueue.filter(q => q.data >= cutoffDate);

// Calcular métricas
const totalAttended = current.length;
const averageTime = totalAttended > 0
  ? Math.round(current.reduce((s, a) => s + a.duracaoReal, 0) / totalAttended)
  : 0;

// Taxa de retorno: % de clienteId únicos que aparecem 2+ vezes no período
const clientCounts = new Map<string, number>();
current.forEach(a => clientCounts.set(a.clienteId, (clientCounts.get(a.clienteId) || 0) + 1));
const uniqueClients = clientCounts.size;
const returningClients = [...clientCounts.values()].filter(c => c >= 2).length;
const retentionRate = uniqueClients > 0 ? Math.round((returningClients / uniqueClients) * 100) : 0;

// Taxa no-show: % de queue items com status AUSENTE
const totalQueueItems = currentQueue.filter(q => ['CONCLUIDO', 'AUSENTE'].includes(q.status)).length;
const absentItems = currentQueue.filter(q => q.status === 'AUSENTE').length;
const noShowRate = totalQueueItems > 0 ? Math.round((absentItems / totalQueueItems) * 100) : 0;

// Chair utilization
const chairUtilization = this.computeChairUtilization(current, config, days);

// Deltas vs período anterior
const prevTotal = previous.length;
const prevAvg = prevTotal > 0 ? Math.round(previous.reduce((s, a) => s + a.duracaoReal, 0) / prevTotal) : 0;
// ... mesmo cálculo de retention e noShow para previous

const delta = (curr: number, prev: number) => prev === 0 ? 0 : Math.round(((curr - prev) / prev) * 100);
```

Retorne `PeriodMetrics` completo.

#### `computeDailyCounts(attendances: Attendance[], days: number): DailyCount[]`
Cria array com um item por dia (últimos N dias), preenchendo zeros.
```
const result: DailyCount[] = [];
for (let i = days - 1; i >= 0; i--) {
  const d = new Date(); d.setDate(d.getDate() - i);
  const dateStr = d.toISOString().split('T')[0];
  const count = attendances.filter(a => a.data === dateStr).length;
  result.push({ date: dateStr, count });
}
```

#### `computeHourDistribution(attendances: Attendance[]): HourDistribution[]`
Agrupa por hora (extraída de `horaInicio` timestamp).
```
const hours = new Map<number, number>();
attendances.forEach(a => {
  const h = new Date(a.horaInicio).getHours();
  hours.set(h, (hours.get(h) || 0) + 1);
});
return [...hours.entries()]
  .map(([hour, count]) => ({ hour, count }))
  .sort((a, b) => a.hour - b.hour);
```

#### `computeServicePopularity(attendances: Attendance[]): ServicePopularity[]`
Parse serviços (comma-separated) e conta frequência.
```
const counts = new Map<string, number>();
attendances.forEach(a => {
  a.servicos.split(/,\s*/).forEach(s => {
    const trimmed = s.trim();
    if (trimmed) counts.set(trimmed, (counts.get(trimmed) || 0) + 1);
  });
});
const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
const max = sorted[0]?.[1] || 1;
return sorted.map(([name, count]) => ({
  name, count, percentage: Math.round((count / max) * 100),
}));
```

#### `computeChairUtilization(attendances: Attendance[], config: AppConfig, days: number): number`
```
const totalWorkedMinutes = attendances.reduce((s, a) => s + a.duracaoReal, 0);
// Minutos disponíveis: (CLOSING - OPENING) em minutos × dias úteis
const [oh, om] = config.OPENING_TIME.split(':').map(Number);
const [ch, cm] = config.CLOSING_TIME.split(':').map(Number);
const dailyMinutes = (ch * 60 + cm) - (oh * 60 + om);
const availableMinutes = dailyMinutes * days;
return availableMinutes > 0 ? Math.round((totalWorkedMinutes / availableMinutes) * 100) : 0;
```

#### `getTopClientsFromAttendances(attendances: Attendance[], limitCount: number): Array<{clienteId: string; clienteNome: string; count: number}>`
Conta visitas por clienteId, retorna top N.

#### `getAtRiskClients(): Promise<ClientWithInsights[]>`
Busca todos os clientes ativos, busca history dos últimos 90 dias, cruza:
```
const clients = await getDocs(query(collection(db, 'clients'), where('ativo', '==', true)));
const history = await this.getHistoryForPeriod(90);
// Para cada cliente, achar último atendimento e calcular intervalo médio
// Retornar apenas os que estão em risco (>45 dias sem visita ou intervalo 50%+ acima da média)
```

Use a mesma lógica de `enrichClients` do ClientService (veja Tarefa 3) para calcular o segmento.

---

## TAREFA 3: Expandir ClientService.ts

O arquivo atual tem 3 métodos: `findByTelefone()`, `findOrCreate()`, `listAll()`. NÃO os remova.

### Imports a adicionar
```typescript
import { orderBy, limit as firestoreLimit } from 'firebase/firestore';
import { Client, Attendance, ClientWithInsights } from '../types';
```
Note: renomeie o import `limit` para `firestoreLimit` para evitar conflito com o `limit` já importado.

### Métodos a implementar

#### `listAllIncludingInactive(): Promise<Client[]>`
```typescript
const q = query(collection(db, path), orderBy('totalVisitas', 'desc'));
const snapshot = await getDocs(q);
return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Client));
```

#### `getClientHistory(clientId: string, limitCount: number = 20): Promise<Attendance[]>`
```typescript
const q = query(
  collection(db, 'history'),
  where('clienteId', '==', clientId),
  orderBy('horaInicio', 'desc'),
  firestoreLimit(limitCount)
);
const snapshot = await getDocs(q);
return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Attendance));
```

#### `updateClient(id: string, data: Partial<Pick<Client, 'nome' | 'telefone' | 'dataNascimento'>>): Promise<void>`
```typescript
await updateDoc(doc(db, this.COLLECTION, id), data);
```

#### `toggleActive(id: string, ativo: boolean): Promise<void>`
```typescript
await updateDoc(doc(db, this.COLLECTION, id), { ativo });
```

#### `enrichClients(clients: Client[], allAttendances: Attendance[], today: string): ClientWithInsights[]`
Método ESTÁTICO e PURO (sem Firestore). Lógica:

```typescript
const currentMonth = today.slice(5, 7); // "03" para março

return clients.map(client => {
  // Histórico deste cliente
  const history = allAttendances
    .filter(a => a.clienteId === client.id)
    .sort((a, b) => b.horaInicio - a.horaInicio);

  // Última visita
  const lastVisitDate = history[0]?.data;

  // Intervalo médio entre visitas (dias)
  let averageInterval: number | undefined;
  if (history.length >= 2) {
    const intervals: number[] = [];
    for (let i = 0; i < history.length - 1; i++) {
      const diff = (history[i].horaInicio - history[i + 1].horaInicio) / (1000 * 60 * 60 * 24);
      intervals.push(diff);
    }
    averageInterval = Math.round(intervals.reduce((s, v) => s + v, 0) / intervals.length);
  }

  // Dias desde última visita
  const daysSinceLastVisit = lastVisitDate
    ? Math.floor((new Date(today + 'T12:00:00').getTime() - new Date(lastVisitDate + 'T12:00:00').getTime()) / (1000 * 60 * 60 * 24))
    : Infinity;

  // Em risco: >45 dias OU intervalo 50%+ acima da média
  const isAtRisk = client.totalVisitas > 0 && (
    daysSinceLastVisit > 45 ||
    (averageInterval !== undefined && daysSinceLastVisit > averageInterval * 1.5)
  );

  // Segmento
  let segment: ClientWithInsights['segment'];
  if (isAtRisk) segment = 'AT_RISK';
  else if (client.totalVisitas >= 10) segment = 'VIP';
  else if (client.totalVisitas >= 3) segment = 'REGULAR';
  else segment = 'NEW';

  // Aniversário este mês
  const birthdayThisMonth = !!client.dataNascimento && client.dataNascimento.slice(5, 7) === currentMonth;

  return {
    ...client,
    lastVisitDate,
    averageInterval,
    segment,
    birthdayThisMonth,
    isAtRisk,
  };
});
```

---

## Verificação final

Após implementar, leia os 3 arquivos modificados e confirme:
1. `types/index.ts` — todos os tipos existentes intactos + 8 novos tipos adicionados
2. `AnalyticsService.ts` — `getDailyMetrics()` e `getTopClients()` intactos + 8 novos métodos
3. `ClientService.ts` — `findByTelefone()`, `findOrCreate()`, `listAll()` intactos + 5 novos métodos
4. Sem imports de módulos inexistentes
5. Todos os catch blocks usam `handleFirestoreError` e `OperationType`
6. Todos os métodos client-side (compute*) são estáticos e não fazem chamadas Firestore
