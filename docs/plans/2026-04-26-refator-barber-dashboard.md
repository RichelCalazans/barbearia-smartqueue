# Plano: Refatoracao do BarberDashboard

## Objetivo

Reduzir `src/pages/BarberDashboard.tsx` de 1883 linhas para um orquestrador menor, extraindo modais, secoes e logica de negocio sem alterar comportamento visual.

## Estado Atual

- `BarberDashboard.tsx` concentra:
  - auth e permissao;
  - config/state listeners;
  - fila e reorder;
  - agenda open/close/pause;
  - modais de usuarios, servicos, settings, reset e cliente manual;
  - abas de fila, metricas e clientes.
- Ja existem componentes reutilizaveis:
  - `AgendaControls`;
  - `QueueDragList`;
  - `SettingsForm`;
  - `ResetEstimativasModal`;
  - `BottomNavigation`;
  - `BarberStatusControls`.
- O maior ganho rapido e extrair `ManageServicesModalBody` e `ManageUsersModalBody`.

## Principio

Fazer PRs pequenos, cada um compilando sozinho, sem reescrever fluxo de dados no mesmo passo da extracao visual.

## Sessao 1: Tipos e Registry de Modais

- Criar `src/pages/barberDashboard/types.ts` com:
  - `DashboardModalType`;
  - props compartilhadas dos modais;
  - helpers de titulo e footer quando simples.
- Substituir o union inline gigante de `modalType`.
- Criar `getModalTitle(modalType)` para remover o ternario longo do JSX.

Resultado esperado: pouco impacto visual, melhora a legibilidade antes das extracoes.

## Sessao 2: Extrair Usuarios e Servicos

- Criar `src/pages/barberDashboard/ManageUsersModalBody.tsx`.
- Criar `src/pages/barberDashboard/ManageServicesModalBody.tsx`.
- Passar estado e callbacks por props explicitas.
- Manter handlers no `BarberDashboard.tsx` nesta primeira extracao.

Resultado esperado: remover aproximadamente 350-400 linhas com risco baixo.

## Sessao 3: Extrair Modais Menores

- Criar:
  - `AddManualClientModalBody.tsx`;
  - `PauseTimeModalBody.tsx`;
  - `ResetStatsModalBody.tsx`;
  - `OpenAgendaCustomTimeModalBody.tsx`;
  - `ConfirmationModalBody.tsx`.
- Remover o switch/ternario de corpo do modal.
- Centralizar footer por tipo de modal.

Resultado esperado: o JSX final do `Modal` fica declarativo e curto.

## Sessao 4: Extrair Logica de Agenda

- Criar hook `useAgendaActions`.
- Mover handlers relacionados a:
  - abrir agenda;
  - fechar agenda;
  - fechar mantendo ou limpando fila;
  - pausar e retomar;
  - status do barbeiro;
  - auto-resume client fallback.
- Manter `ConfigService` como fonte das escritas.

Resultado esperado: reduzir acoplamento entre UI e efeitos de agenda.

## Sessao 5: Extrair Logica de Fila Manual e Reorder

- Criar hook `useManualQueueEntry`.
- Criar hook `useQueueReorder`.
- Mover validacoes de cliente manual para helper testavel.
- Manter UI usando `QueueDragList` e componentes existentes.

Resultado esperado: facilitar testes unitarios de validacao e reorder.

## Sessao 6: Orquestrador Final

- Extrair secoes de layout se ainda necessario:
  - `DashboardHeader`;
  - `QueueTab`;
  - `DashboardTabs`;
  - `DashboardActionModal`.
- `BarberDashboard.tsx` deve ficar responsavel por:
  - carregar hooks principais;
  - decidir aba ativa;
  - montar layout geral;
  - passar props.

Meta: ficar abaixo de 350 linhas sem mudar as telas de `MetricsPage` e `ClientsPage`.

## Testes e Checks

Antes de cada sessao:

- `npm run lint`
- `npm run build`

Depois da Sessao 2 em diante:

- adicionar testes unitarios para helpers extraidos quando houver logica.
- teste manual em `/barber`:
  - abrir/fechar agenda;
  - pausar/retomar;
  - adicionar cliente manual;
  - gerenciar usuario;
  - gerenciar servico;
  - resetar estimativas;
  - alternar abas.

## Riscos

- Props demais nos primeiros componentes extraidos. Aceitar temporariamente; consolidar em hooks depois.
- Mudanca acidental de estilo em modais. Comparar visualmente antes/depois.
- Efeitos duplicados em hooks se dependencies nao forem preservadas.

## Criterio de Conclusao

- `BarberDashboard.tsx` abaixo de 350 linhas.
- Modais principais fora do arquivo.
- Handlers de agenda/fila separados em hooks.
- `npm run lint` e `npm run build` passando.
