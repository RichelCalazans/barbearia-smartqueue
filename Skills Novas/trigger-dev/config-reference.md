# Trigger.dev Config Reference

## trigger.config.ts
```typescript
import { defineConfig } from "@trigger.dev/sdk/v3";

export default defineConfig({
  project: "proj_seu_id_aqui",
  runtime: "node",
  logLevel: "log",
  maxDuration: 60,              // timeout padrão para todas as tasks
  retries: {
    enabledInDev: false,        // desabilita retry em dev para facilitar debug
    default: {
      maxAttempts: 3,
      minTimeoutInMs: 1000,
      maxTimeoutInMs: 30000,
      factor: 2,
    },
  },
  dirs: ["./src/trigger"],      // onde ficam as tasks
});
```

## Variáveis de ambiente

### Obrigatórias
- TRIGGER_SECRET_KEY: chave da API do projeto (diferente por ambiente)

### Por ambiente
- dev: use .env local
- staging/prod: configure no dashboard do Trigger.dev

## Instalação
```bash
npm install @trigger.dev/sdk
npx trigger.dev@latest init
```

## Deploy
```bash
npx trigger.dev@latest deploy
```

## CLI para desenvolvimento local
```bash
npx trigger.dev@latest dev
# mantém processo rodando e sincroniza tasks automaticamente
```

## Ambientes
- dev: execução local com CLI
- staging: ambiente de teste isolado
- prod: produção

Nunca use a chave de prod em dev. Configure variáveis de ambiente separadas por ambiente no dashboard.
