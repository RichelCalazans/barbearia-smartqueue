# Trigger.dev Skill

## Objetivo
Criar, configurar e depurar jobs em background usando Trigger.dev. Cobre desde tasks simples até workflows complexos com retry, concurrency e scheduling.

## Quando usar
- Processar tarefas pesadas fora do ciclo de request/response
- Agendar jobs recorrentes
- Orquestrar sequências de operações com retry automático
- Substituir cron jobs frágeis por jobs confiáveis com observabilidade

## Como executar
1. Leia core-reference.md para entender estrutura base de tasks e runs
2. Leia config-reference.md para configuração do projeto e variáveis de ambiente
3. Leia advanced-reference.md para concurrency, batching e workflows complexos
4. Implemente a task com tipagem correta e retry strategy adequada
5. Teste localmente com Trigger.dev CLI antes de deployar

## Estrutura básica
```typescript
import { task } from "@trigger.dev/sdk/v3";

export const meuJob = task({
  id: "meu-job",
  run: async (payload: { userId: string }) => {
    // lógica aqui
    return { sucesso: true };
  },
});
```

## Output esperado
- Task com tipagem correta no payload
- Retry e timeout configurados adequadamente para o caso de uso
- Logs estruturados dentro da task
- Documentação de como acionar (trigger) a task
