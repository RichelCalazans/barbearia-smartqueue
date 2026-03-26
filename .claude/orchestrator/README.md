# SmartQueue Orchestrator

Prompts paralelos para implementar melhorias do SmartQueue.

## Métricas + Clientes + Navegação

```bash
# Passo 1 — Foundation (tipos + serviços)
claude -p "$(cat .claude/orchestrator/04-foundation.md)"

# Passo 2 — Telas (paralelo, após Passo 1)
claude -p "$(cat .claude/orchestrator/05-metrics.md)" &
claude -p "$(cat .claude/orchestrator/06-clients.md)" &
wait

# Passo 3 — Integração (após Passo 2)
claude -p "$(cat .claude/orchestrator/07-integration.md)"
```

### Diagrama de dependência

```
04-foundation ──→ 05-metrics ──┐
                  06-clients ──┤──→ 07-integration
                  [paralelos]  ┘
```

### Arquivos por agente (zero overlap)

| Agente | Foco | Arquivos |
|--------|------|----------|
| 04-foundation | Tipos + serviços | `types/index.ts`, `AnalyticsService.ts`, `ClientService.ts` |
| 05-metrics | Tela de métricas | `MetricsPage.tsx` (novo) |
| 06-clients | Tela de clientes | `ClientsPage.tsx` (novo) |
| 07-integration | Navegação | `BarberDashboard.tsx`, `BottomNavigation.tsx` |

### O que cada tela entrega

**MetricsPage:**
- KPIs com delta vs período anterior: Atendidos, Tempo Médio, Taxa de Retorno, No-Show
- Filtro: Hoje / 7 dias / 30 dias
- Gráfico SVG: atendimentos por dia
- Gráfico CSS: horários de pico
- Ranking: serviços populares
- Top 5 clientes + clientes em risco

**ClientsPage:**
- Busca por nome ou telefone
- Filtro: Todos / Ativos / VIP / Em Risco
- Segmentação automática: Novo / Regular / VIP / Em Risco
- Banner de aniversário mensal
- Modal de detalhe: histórico, edição, ativar/desativar

---

## Prompts anteriores (segurança/otimização)

```bash
# Independentes entre si
claude -p "$(cat .claude/orchestrator/01-security.md)"
claude -p "$(cat .claude/orchestrator/02-atomicity.md)"
claude -p "$(cat .claude/orchestrator/03-bundle.md)"
```

| Agente | Foco | Arquivos |
|--------|------|----------|
| 01-security | Firestore rules | `firestore.rules` |
| 02-atomicity | Transações | `AttendanceService.ts`, `QueueService.ts` |
| 03-bundle | Otimização Vite | `App.tsx`, `vite.config.ts` |
