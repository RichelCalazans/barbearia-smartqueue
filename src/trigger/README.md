# Trigger.dev - Background Jobs

Documentação dos jobs em background para SmartQueue.

## Jobs Implementados

### 1. cleanup-old-queues (Cron: 3h diariamente)
- Remove registros de fila com mais de 30 dias
- Reduz custos do Firestore
- Batch delete automático

### 2. daily-metrics-snapshot (Cron: 23h)
- Calcula métricas do dia
- Salva snapshot para dashboard rápido
- Evita cálculos pesados no frontend

### 3. auto-resume-agenda (On-demand)
- Retoma agenda após pausa
- Funciona sem browser aberto
- Retry automático em caso de falha

## Configuração

```bash
npm install @trigger.dev/sdk @trigger.dev/react
npx trigger.dev@latest init

# Variáveis de ambiente necessárias:
FIREBASE_PROJECT_ID=barbearia-smartqueue
FIREBASE_PRIVATE_KEY=<sua chave>
FIREBASE_CLIENT_EMAIL=<seu email>
TRIGGER_API_KEY=<sua chave de API>
```

## Testes Locais

```bash
npx trigger.dev@latest dev
```

## Deploy

```bash
npx trigger.dev@latest deploy
```

## Integração com Código Existente

### BarberDashboard
```typescript
import { autoResumeAgenda } from '../trigger/auto-resume-agenda';

// Ao pausar agenda
await autoResumeAgenda.trigger({ resumeAt });
```

### AttendanceService
```typescript
import { recalculateQueueTask } from '../trigger/recalculate-queue';

// Após finalizar atendimento
await recalculateQueueTask.trigger();
```

## Monitoramento

Acesse https://dashboard.trigger.dev/ para:
- Ver execuções dos jobs
- Logs estruturados
- Retry automático
- Alertas em caso de falha
