# Orquestrador de Revisao QA - SmartQueue

Sistema de agentes autonomos para corrigir problemas identificados no relatorio de QA de 28/03/2026.

## Problemas a Resolver

| # | Prioridade | Problema | Agente |
|---|------------|----------|--------|
| 1 | CRITICA | Botao "Em breve..." disabled | agent-01-fix-em-breve.md |
| 2 | CRITICA | Tela "Agenda Fechada" sem opcao futura | agent-02-fix-agenda-fechada.md |
| 3 | MEDIA | Fluxo de cancelamento quebrado | agent-03-fix-cancel-flow.md |
| 4 | MEDIA | Dashboard sem filtro de datas | agent-04-add-date-filter.md |
| 5 | ALTA | Configuracao do Sabado incorreta | agent-05-fix-saturday-config.md |

## Como Executar

### Opcao 1: Execucao Manual (Sequencial)

```bash
# No Claude Code, execute cada agente:
claude "Execute o agente em orchestrator/revisao-qa/agent-01-fix-em-breve.md"
claude "Execute o agente em orchestrator/revisao-qa/agent-02-fix-agenda-fechada.md"
# ... etc
```

### Opcao 2: Execucao Paralela via Agent Tool

No Claude Code, use o Agent tool para executar em paralelo:

**Onda 1 (agentes independentes):**
- Agent 01: Fix "Em breve..." button
- Agent 04: Add date filter to dashboard
- Agent 05: Fix Saturday config

**Onda 2 (apos Onda 1):**
- Agent 02: Fix "Agenda Fechada" view
- Agent 03: Fix cancel flow

## Arquivos Criticos

```
src/
├── pages/
│   ├── ClientView.tsx      # Agents 01, 02, 03
│   └── BarberDashboard.tsx # Agent 04
├── hooks/
│   └── useQueue.ts         # Agent 04
├── services/
│   └── QueueService.ts     # Agent 01
└── utils.ts                # Agent 01
```

## Verificacao Pos-Correcao

1. `npm run build` - Deve compilar sem erros
2. `npm run dev` - Testar localmente
3. Testar cenarios do relatorio QA
4. `firebase deploy --only hosting` - Deploy em producao

## Criterios de Sucesso

- [ ] Botao "Em breve..." clicavel e mostra lista de datas
- [ ] Tela "Agenda Fechada" oferece opcao de agendar para outros dias
- [ ] Cancelamento volta para tela inicial limpa
- [ ] Dashboard do barbeiro tem filtro de datas
- [ ] Sabado com horario de abertura correto (nao 00:00)
