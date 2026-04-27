# Planos de Refatoracao e Hardening — 2026-04-26

> Fonte: panorama consolidado recebido em 2026-04-26.
> Backup remoto informado: `backup/pre-refactor-2026-04-26` no commit `28102b5`.

Esta pasta guarda os quatro planos de trabalho que guiam a proxima rodada de estabilizacao do SmartQueue. Eles foram reescritos como planos executaveis com base no estado atual do codigo e nos resumos recebidos dos agentes.

## Visao Consolidada

| Plano | Esforco | Risco | Impacto |
|---|---:|---|---|
| [Admin custom claims](./2026-04-26-admin-custom-claims.md) | ~3h | Baixo | Critico: remove dessincronia entre client e rules |
| [Vitest e estrategia de testes](./2026-04-26-vitest.md) | ~10h | Baixo | Fundacao para refactors futuros |
| [Auto open/close server-side](./2026-04-26-auto-open-close-server-side.md) | 1-2 dias | Medio | Critico: agenda funciona sem dashboard aberto |
| [Refatoracao do BarberDashboard](./2026-04-26-refator-barber-dashboard.md) | 10-12h | Medio | Manutencao: reduz `BarberDashboard.tsx` de 1883 linhas |

## Ordem Recomendada

1. Admin custom claims.
2. Vitest e testes unitarios.
3. Auto open/close server-side com Cloud Functions + Scheduler.
4. Refatoracao incremental do `BarberDashboard.tsx`.

Motivo: o plano de admin e rapido e fecha um gap de seguranca. A base de testes vem antes das mudancas server-side e da refatoracao maior. O auto open/close resolve um problema operacional real, e o dashboard fica por ultimo porque ganha mais seguranca depois dos testes.

## Alternativa Pragmatica

Se o problema "barbearia nao abre sozinha" for a dor principal de producao, inverter os planos 2 e 3:

1. Admin custom claims.
2. Auto open/close server-side.
3. Vitest.
4. Refatoracao do `BarberDashboard.tsx`.

Nesse caminho, extrair primeiro uma funcao pura `decideAgendaAction(config, state, now)` reduz o risco da Cloud Function mesmo antes do setup completo de testes.

## Guardrails

- Manter fallback hardcoded de super admin ate a fase final da migracao de claims.
- Nao remover o fallback client-side de auto open/close antes de observar a Cloud Function por pelo menos 7 dias.
- Rodar `npm run lint` e `npm run build` em cada PR operacional.
- Refatorar o dashboard em PRs pequenos, sem mudanca visual deliberada.
