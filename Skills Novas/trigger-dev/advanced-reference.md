# Trigger.dev Advanced Reference

## Concurrency e filas

### Limitar execuções simultâneas
```typescript
export const processarImagem = task({
  id: "processar-imagem",
  queue: {
    concurrencyLimit: 5,    // máximo 5 rodando ao mesmo tempo
  },
  run: async (payload) => { ... },
});
```

### Fila compartilhada entre tasks
```typescript
const filaEmail = queue({
  name: "emails",
  concurrencyLimit: 10,
});

export const emailBoasVindas = task({
  id: "email-boas-vindas",
  queue: filaEmail,
  run: async (payload) => { ... },
});
```

## Batch triggering
```typescript
// disparar muitas tasks de uma vez
await processar.batchTrigger(
  pedidos.map(p => ({ payload: { pedidoId: p.id } }))
);
```

## Subtasks (tasks chamando outras tasks)
```typescript
export const workflow = task({
  id: "workflow-completo",
  run: async (payload) => {
    // chamar subtask e aguardar
    const resultado = await etapa1.triggerAndWait({ dados: payload.dados });

    if (resultado.ok) {
      await etapa2.trigger({ resultado: resultado.output });
    }
  },
});
```

## Wait (pausar e retomar)
```typescript
import { wait } from "@trigger.dev/sdk/v3";

export const aguardar = task({
  id: "aguardar-aprovacao",
  run: async (payload) => {
    // executa até aqui, pausa, retoma quando evento chegar
    const aprovacao = await wait.forEvent("aprovacao-recebida", {
      timeout: "24h",
    });
    return { aprovado: aprovacao.data.aprovado };
  },
});
```

## Idempotency keys
```typescript
await processar.trigger(
  { pedidoId: "123" },
  { idempotencyKey: `pedido-123-${Date.now()}` }  // evita duplicatas
);
```
