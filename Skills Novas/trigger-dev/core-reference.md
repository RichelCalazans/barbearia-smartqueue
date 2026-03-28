# Trigger.dev Core Reference

## Tasks

### Definição básica
```typescript
import { task, logger } from "@trigger.dev/sdk/v3";

export const processar = task({
  id: "processar-pagamento",           // único no projeto, kebab-case
  maxDuration: 300,                     // timeout em segundos
  retry: {
    maxAttempts: 3,
    minTimeoutInMs: 1000,
    maxTimeoutInMs: 10000,
    factor: 2,                          // backoff exponencial
  },
  run: async (payload: { pedidoId: string }, { ctx }) => {
    logger.info("Processando", { pedidoId: payload.pedidoId });
    // lógica
    return { status: "ok" };
  },
});
```

### Acionar uma task (trigger)
```typescript
import { processar } from "./tasks/processar";

// fire and forget
await processar.trigger({ pedidoId: "123" });

// aguardar resultado
const handle = await processar.triggerAndWait({ pedidoId: "123" });
console.log(handle.output); // { status: "ok" }
```

## Scheduling (jobs recorrentes)
```typescript
import { schedules } from "@trigger.dev/sdk/v3";

export const relatorioSemanal = schedules.task({
  id: "relatorio-semanal",
  cron: "0 9 * * 1",    // toda segunda às 9h UTC
  run: async (payload) => {
    // gerar relatório
  },
});
```

## Logging estruturado
```typescript
logger.info("Mensagem", { chave: "valor" });    // nível info
logger.warn("Atenção", { contexto: dados });     // nível warning
logger.error("Erro", { erro: error.message });   // nível error
```

## Tipos de payload
- Sempre tipar o payload com TypeScript
- Dados simples: string, number, boolean, arrays
- Evitar circular references e instâncias de classe no payload
