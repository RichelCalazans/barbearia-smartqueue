# Plano: Auto Open/Close Server-Side

## Objetivo

Mover a automacao de abrir e fechar agenda para o servidor, para que a barbearia siga o horario configurado mesmo sem o dashboard aberto.

## Estado Atual

- `ConfigService.checkAutoOpenClose(config, state)` roda no client, dentro de `BarberDashboard.tsx`.
- O dashboard agenda um `setInterval` de 60 segundos quando admin esta logado.
- `config/settings` possui `AUTO_OPEN_CLOSE`, `TIMEZONE` e `WEEKLY_SCHEDULE`.
- `config/state` guarda `agendaAberta`, `agendaPausada`, `dataAbertura`, override manual e status do barbeiro.
- Existem arquivos `src/trigger/*`, mas o plano escolhido e Cloud Functions + Scheduler, nao Trigger.dev.

## Decisao

Usar Cloud Functions + Cloud Scheduler. A frequencia de uma execucao por minuto gera cerca de 43k execucoes por mes, o que estoura facilmente o free tier operacional do Trigger.dev. Em Cloud Scheduler + Functions, o custo estimado fica muito baixo para este volume.

## Desenho

- Criar pasta `functions/` com Firebase Functions v2 e Admin SDK.
- Criar scheduled function a cada minuto:
  - `onSchedule({ schedule: '* * * * *', timeZone: 'America/Sao_Paulo' }, handler)`.
- Ler `config/settings` e `config/state` via Admin SDK.
- Calcular acao com funcao pura:
  - `OPEN`;
  - `CLOSE`;
  - `CLEAR_MANUAL_OVERRIDE`;
  - `NOOP`.
- Aplicar lock por bucket de minuto dentro de transacao Firestore.

## Lock de Concorrencia

Usar doc de lock por minuto, por exemplo:

```text
automationLocks/auto-open-close-YYYY-MM-DD-HH-mm
```

Na transacao:

- se lock ja existe, sair como `NOOP`;
- criar lock com `createdAt`, `action` e `source`;
- atualizar `config/state` se a acao calculada exigir mudanca.

Esse lock evita race entre retries, invocacoes duplicadas e execucao simultanea em cold start.

## Timezone

- Usar `config.TIMEZONE` quando valido; fallback `America/Sao_Paulo`.
- Usar `Intl.DateTimeFormat` para obter data local, dia da semana e `HH:MM`.
- Evitar `new Date().toISOString().split('T')[0]` para datas de negocio, porque isso usa UTC.

## Funcao Pura Sugerida

```ts
type AgendaAction = 'OPEN' | 'CLOSE' | 'CLEAR_MANUAL_OVERRIDE' | 'NOOP';

export function decideAgendaAction(
  config: AppConfig,
  state: AppState,
  now: Date
): AgendaAction
```

Regras:

- Se `AUTO_OPEN_CLOSE` esta desligado, `NOOP`.
- Se ha override manual valido para hoje:
  - manter estado enquanto `now < manualOverrideCloseTime`;
  - fechar e limpar override quando horario expirar.
- Se dia esta desabilitado:
  - fechar se estiver aberto;
  - caso contrario `NOOP`.
- Se esta dentro da janela semanal:
  - abrir se agenda esta fechada;
  - caso contrario `NOOP`.
- Se esta fora da janela:
  - fechar se agenda esta aberta;
  - caso contrario `NOOP`.

## Escritas em `config/state`

Ao abrir:

- `agendaAberta: true`
- `agendaPausada: false`
- `dataAbertura: data local YYYY-MM-DD`
- `barberStatus: 'AGUARDANDO_CLIENTE'`
- `barberStatusLastAction: 'ABRIU_AGENDA'`
- atualizar historico de status.

Ao fechar:

- `agendaAberta: false`
- `agendaPausada: false`
- `dataAbertura: null`
- limpar override manual;
- `barberStatus: 'FILA_FECHADA'`
- `barberStatusLastAction: 'FECHOU_FILA'`
- atualizar historico de status.

## Migracao

1. Criar `functions/` e deployar uma funcao de smoke test.
2. Extrair `decideAgendaAction` e testar com Vitest.
3. Implementar scheduled function com logs estruturados.
4. Deployar em producao com client fallback ainda ativo.
5. Observar logs por 7 dias.
6. Remover ou reduzir o fallback em `BarberDashboard.tsx`.

## Validacao

- Testes unitarios para:
  - segunda-feira dentro e fora do horario;
  - sabado com horario reduzido;
  - domingo desabilitado;
  - override manual antes e depois do fechamento;
  - timezone em `America/Sao_Paulo`.
- Teste manual em staging/producao:
  - ligar `AUTO_OPEN_CLOSE`;
  - ajustar horario para proximo minuto;
  - confirmar alteracao em `config/state`;
  - confirmar logs e lock criado.

## Rollback

- Desabilitar a scheduled function.
- Manter `ConfigService.checkAutoOpenClose` no client durante a janela de validacao.
- Reverter deploy de functions se necessario, sem alterar o frontend.
