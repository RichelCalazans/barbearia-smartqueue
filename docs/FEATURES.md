# FEATURES.md — Features do SmartQueue

> Última atualização: 2026-03-27

---

## Feature 1: Autenticação e Autorização

### Status: ✅ Pronto

### User Story
Como **dono da barbearia**, quero fazer login para acessar o dashboard admin, de forma que apenas pessoas autorizadas possam gerenciar a fila e configurações.

### Fluxo
1. Barbeiro acessa `/login`
2. Pode logar via email/senha ou Google (redirect)
3. `useAuth` hook verifica se o email está na lista de admins ou no Firestore `users`
4. Se admin → redireciona para `/barber`
5. Se não admin → mostra tela "Acesso Negado"

### Implementação
- **Hook**: `src/hooks/useAuth.ts` — `onAuthStateChanged` listener
- **Page**: `src/pages/Login.tsx` — UI de login
- **Service**: `src/services/UserService.ts` — CRUD de usuários admin
- **Firebase**: `src/firebase.ts` — `signIn`, `requestPasswordReset`, `signInWithGoogle`, `signOut`
- **Rules**: `firestore.rules` — `isAdmin()` helper

### Detalhes Importantes
- Admin check tem **fallback hardcoded**: `['richelcalazans6@gmail.com', 'teste@teste.com']` no `useAuth.ts`
- Admin check **também** consulta Firestore `users` collection por email
- Criação de novos usuários admin usa **REST API do Firebase Auth** (não o SDK) para não deslogar o admin atual
- Após criar usuário, envia email de reset de senha automaticamente
- A tela de login permite solicitar reset com o botão **Esqueci minha senha**

### Edge Cases
- Google redirect result é checado no `Login.tsx` useEffect
- Se redirect falha, fica em estado de loading — sem feedback visual claro
- Logout redireciona para `/login` via `window.location.href`

### Próximos Passos
- [ ] Remover emails hardcoded do `useAuth.ts` — depender apenas do Firestore
- [ ] Adicionar feedback visual quando Google redirect falha

---

## Feature 2: Entrada na Fila (Cliente)

### Status: ✅ Pronto

### User Story
Como **cliente da barbearia**, quero entrar na fila informando meu nome, telefone e serviços desejados, para que eu saiba minha posição e horário previsto.

### Fluxo
1. Cliente acessa `/` (ClientView)
2. Se agenda fechada ou pausada → mostra mensagem e impede entrada
3. Se agenda aberta → formulário: nome + telefone + serviços
4. Ao submeter:
   - `ClientService.findOrCreate` — busca por telefone ou cria novo
   - `QueueService.addToQueue` — calcula posição, tempo estimado, hora prevista
5. Cliente vê sua posição na fila em tempo real (onSnapshot via `useQueue`)
6. Pode cancelar seu lugar (muda status para CANCELADO)

### Implementação
- **Page**: `src/pages/ClientView.tsx` — formulário + lista da fila
- **Service**: `src/services/ClientService.ts` — `findOrCreate`
- **Service**: `src/services/QueueService.ts` — `addToQueue`
- **Service**: `src/services/TimePredictorService.ts` — `predictServiceTime`
- **Hook**: `src/hooks/useQueue.ts` — realtime listener

### Detalhes Importantes
- Telefone é **mascarado** antes de salvar na fila: `(11) *****-1234`
- Cliente é identificado pelo telefone (chave natural)
- Se cliente já existe, usa o `tempoMedio` EWMA para predição mais precisa
- Se cliente é novo, aplica `tempoBase × 1.25` (multiplicador de incerteza)
- Limite diário configurável: `MAX_DAILY_CLIENTS` (default 30)

### Edge Cases
- Fila cheia → erro "Fila cheia para hoje"
- Agenda pausada → mostra horário de retomada
- Cliente já na fila → não há proteção explícita (pode entrar duplicado)
- Auto-refresh: ConfigService.AUTO_REFRESH_SECONDS (default 12s) para atualizar estado

### Próximos Passos
- [ ] Impedir cliente duplicado na fila (verificar por clienteId + data + status AGUARDANDO)
- [ ] Notificação quando chegar a vez (WhatsApp via Z-API — não implementado)
- [ ] QR Code para facilitar entrada (scan e já abre a página)

---

## Feature 3: Gerenciamento da Fila (Barbeiro)

### Status: ✅ Pronto

### User Story
Como **barbeiro**, quero ver quem está na fila, chamar o próximo, finalizar atendimentos e marcar ausentes, para gerenciar meu dia de trabalho.

### Fluxo
1. Barbeiro acessa `/barber` (BarberDashboard, tab FILA)
2. Vê grid de métricas do dia (atendidos, média, aderência, fila)
3. Seção "Atendimento Atual":
   - Se alguém em atendimento → Timer circular + botões Finalizar/Ausente
   - Se ninguém → botão "Chamar Próximo"
4. Seção "Próximos na Fila" — lista com nome, serviço, hora prevista
5. Seção "Controle da Agenda" — Abrir/Fechar/Pausar

### Implementação
- **Page**: `src/pages/BarberDashboard.tsx` (1009 linhas — file mais complexo do projeto)
- **Components**: `Timer.tsx` (circular SVG), `Card.tsx`, `Modal.tsx`, `BottomNavigation.tsx`
- **Services**: `QueueService.updateStatus`, `AttendanceService.finalizeAttendance`, `AttendanceService.markAsAbsent`

### Ações do Barbeiro

| Ação | Service Method | O que Acontece |
|---|---|---|
| Chamar próximo | `QueueService.updateStatus(id, 'EM_ATENDIMENTO')` | Seta `horaChamada = Date.now()` |
| Finalizar | `AttendanceService.finalizeAttendance(item, config, email)` | Transaction: cria history + atualiza EWMA + marca CONCLUIDO + recalcula fila |
| Ausente | `AttendanceService.markAsAbsent(item, config)` | Marca AUSENTE + recalcula fila |
| Abrir agenda | `ConfigService.toggleAgenda(true)` | Seta `agendaAberta: true` |
| Fechar agenda | `ConfigService.toggleAgenda(false)` | Com opção de limpar ou manter fila |
| Pausar | `ConfigService.togglePause(true, minutos)` | Seta `agendaPausada: true` + `tempoRetomada` |
| Retomar | `ConfigService.togglePause(false)` | Limpa pausa |

### Timer Component
- Timer circular SVG que mostra tempo decorrido vs estimado
- Verde (`#00D4A5`) → Amarelo (`#EAB308`) em 75% → Vermelho (`#EF4444`) quando passa do estimado
- Atualiza a cada segundo

### Edge Cases
- Fechar agenda com clientes na fila → modal pergunta: "Limpar fila?" ou "Manter fila?"
- Pausar agenda → countdown visual + auto-resume quando tempo expira
- Auto open/close baseado em `WEEKLY_SCHEDULE` + `AUTO_OPEN_CLOSE` flag

### Próximos Passos
- [ ] Refatorar BarberDashboard.tsx (1009 linhas) — extrair componentes menores
- [ ] Permitir reordenação manual da fila (drag and drop)
- [ ] Adicionar confirmação ao cancelar cliente da fila

---

## Feature 4: Predição de Tempo (EWMA)

### Status: ✅ Pronto

### User Story
Como **cliente**, quero saber quanto tempo vou esperar, para decidir se vale a pena ficar na fila.

### Fluxo
1. Cliente entra na fila → `TimePredictorService.predictServiceTime` calcula estimativa
2. Se novo → `tempoBase × 1.25`
3. Se recorrente → usa `tempoMedio` EWMA pessoal
4. Hora prevista calculada em cascata: item anterior + seu tempo + buffer
5. Ao finalizar atendimento → `calculateNewAverage` atualiza EWMA

### Implementação
- **Service**: `src/services/TimePredictorService.ts`
  - `predictServiceTime(client, baseTime, config)` — estimativa inicial
  - `calculateNewAverage(current, actual, alpha)` — atualiza EWMA
  - `addMinutes(timeStr, mins)` — aritmética de horários
  - `formatTime(minutes)` — formata para HH:MM
- **Documentação**: `directives/time_prediction.md`

### Fórmula EWMA
```
novaMedia = α × duracaoReal + (1 - α) × mediaAnterior
α = 0.3 (default, configurável via EWMA_ALPHA)
```

### Recálculo da Fila
`QueueService.recalculateQueue` — chamado após cada finalização/ausência:
1. Busca todos os itens AGUARDANDO + EM_ATENDIMENTO ordenados por posição
2. Para item EM_ATENDIMENTO: calcula tempo restante baseado no horaChamada
3. Para AGUARDANDO: cascata de `horaPrevista = horaPrevista_anterior + tempoEstimado + BUFFER_MINUTES`
4. Usa writeBatch para atomicidade

### Edge Cases
- Primeiro atendimento de um cliente (tempoMedio = 0): usa tempoBase × multiplier
- Cliente com tempoMedio muito alto/baixo: sem capping implementado (debt)
- Buffer entre atendimentos: `BUFFER_MINUTES` (default 8 min)

### Próximos Passos
- [ ] Implementar capping de outliers (ex: mínimo 5 min, máximo 3× tempoBase)
- [ ] Considerar sazonalidade (horários de pico → mais tempo)
- [ ] Dashboard mostrando precisão da estimativa (estimado vs real)

---

## Feature 5: Métricas e Analytics

### Status: ✅ Pronto

### User Story
Como **barbeiro**, quero ver métricas de desempenho (clientes atendidos, tempo médio, retenção, etc.) para entender meu negócio.

### Fluxo
1. Barbeiro acessa tab METRICAS no dashboard
2. Seleciona período: Hoje | 7 dias | 30 dias
3. Vê KPIs com deltas (comparação com período anterior):
   - Total atendidos
   - Tempo médio
   - Taxa de retenção
   - Taxa de no-show
   - Utilização da cadeira
4. Gráficos:
   - Atendimentos por dia (barras)
   - Distribuição por hora do dia
   - Popularidade de serviços
   - Top clientes

### Implementação
- **Page**: `src/pages/MetricsPage.tsx` (406 linhas)
- **Service**: `src/services/AnalyticsService.ts`
  - `getPeriodMetrics(period, config)` — KPIs com deltas vs período anterior
  - `computeDailyCounts` — contagem por dia
  - `computeHourDistribution` — distribuição por hora
  - `computeServicePopularity` — ranking de serviços
  - `getTopClientsFromAttendances` — top clientes por frequência
  - `computeChairUtilization` — (minutos trabalhados / minutos disponíveis) × 100

### Cálculos Importantes

| Métrica | Fórmula |
|---|---|
| Retenção | clientes com ≥ 2 visitas / total clientes únicos × 100 |
| No-show | itens AUSENTE / (CONCLUIDO + AUSENTE) × 100 |
| Chair Utilization | total minutos trabalhados / (minutos_diários × dias) × 100 |
| Deltas | (atual - anterior) / anterior × 100 |

### Edge Cases
- Período sem dados → métricas zeradas, deltas = 0
- Divisão por zero → tratada com fallback (0% ou 100%)

### Próximos Passos
- [ ] Gráficos reais com Recharts ou Chart.js (atualmente são barras CSS custom)
- [ ] Export de relatório (PDF ou CSV)
- [ ] Comparação entre períodos customizados

---

## Feature 6: CRM de Clientes

### Status: ✅ Pronto

### User Story
Como **barbeiro**, quero ver e gerenciar meus clientes, sabendo quem é VIP, quem está em risco de churn, e quem faz aniversário este mês.

### Fluxo
1. Barbeiro acessa tab CLIENTES no dashboard
2. Vê lista de clientes com segmento (NEW/REGULAR/VIP/AT_RISK)
3. Pode filtrar por segmento
4. Pode buscar por nome
5. Card de cliente mostra: nome, telefone, total visitas, último atendimento, tempo médio
6. Pode editar nome/telefone, desativar, ou deletar cliente

### Implementação
- **Page**: `src/pages/ClientsPage.tsx` (382 linhas)
- **Service**: `src/services/ClientService.ts`
  - `listAllIncludingInactive` — todos os clientes
  - `enrichClients` — adiciona segmentação, last visit, average interval
  - `updateClient`, `toggleActive`, `deleteClient`
- **Service**: `src/services/AnalyticsService.ts`
  - `getHistoryForPeriod(90)` — últimos 90 dias para calcular segmentação

### Segmentação (definida em `ClientService.enrichClients`)
| Segmento | Critério |
|---|---|
| NEW | < 3 visitas |
| REGULAR | 3-9 visitas |
| VIP | ≥ 10 visitas |
| AT_RISK | > 45 dias sem visita OU > 1.5× intervalo médio |

### Dados Calculados por Cliente
- `lastVisitDate` — data da última visita
- `averageInterval` — média de dias entre visitas
- `birthdayThisMonth` — flag se aniversário é no mês atual
- `isAtRisk` — flag de risco de churn

### Próximos Passos
- [ ] Notificação para clientes AT_RISK (WhatsApp)
- [ ] Mensagem de aniversário automática
- [ ] Histórico detalhado por cliente (timeline)

---

## Feature 7: Configurações da Barbearia

### Status: ✅ Pronto

### User Story
Como **dono**, quero configurar horários de funcionamento, parâmetros de estimativa e dados da barbearia.

### Implementação
- **Service**: `src/services/ConfigService.ts`
- **UI**: Modal de Settings no BarberDashboard

### Parâmetros Configuráveis

| Parâmetro | Default | Descrição |
|---|---|---|
| `BUFFER_MINUTES` | 8 | Minutos entre atendimentos |
| `EWMA_ALPHA` | 0.3 | Peso do dado recente na EWMA |
| `NEW_CLIENT_MULTIPLIER` | 1.25 | Multiplicador para clientes sem histórico |
| `MAX_DAILY_CLIENTS` | 30 | Limite de clientes por dia |
| `OPENING_TIME` | 09:00 | Horário de abertura |
| `CLOSING_TIME` | 19:00 | Horário de fechamento |
| `AUTO_REFRESH_SECONDS` | 12 | Intervalo de refresh do estado |
| `WEEKLY_SCHEDULE` | Seg-Sex 09-19, Sab 09-14, Dom off | Agenda semanal |
| `AUTO_OPEN_CLOSE` | false | Abrir/fechar automaticamente por horário |

### Auto Open/Close
- `ConfigService.checkAutoOpenClose` — roda a cada 60s no dashboard
- Compara hora atual com `WEEKLY_SCHEDULE` do dia da semana
- Se deve estar aberto e está fechado → abre. E vice-versa.

---

## Feature 8: Gerenciamento de Serviços

### Status: ✅ Pronto

### User Story
Como **dono**, quero cadastrar e gerenciar os serviços que ofereço (nome, tempo base, preço).

### Implementação
- **Service**: `src/services/ServiceService.ts` — CRUD completo
- **UI**: Modal "Gerenciar Serviços" no BarberDashboard
- **Default**: 8 serviços pré-cadastrados (Corte Social, Degradê, Barba, etc.)
- IDs gerados como `SRV` + timestamp

### Serviços Default
| Serviço | Tempo Base | Preço |
|---|---|---|
| Corte Social | 30 min | R$ 35 |
| Degradê | 45 min | R$ 45 |
| Barba | 20 min | R$ 25 |
| Corte + Barba | 60 min | R$ 60 |
| Sobrancelha | 10 min | R$ 15 |
| Luzes | 90 min | R$ 80 |
| Platinado | 120 min | R$ 120 |
| Lavagem | 10 min | R$ 10 |

---

## Feature 9: Notificações WhatsApp

### Status: ❌ Não Implementado

### User Story (Planejada)
Como **cliente**, quero receber notificação no WhatsApp quando minha vez estiver próxima.

### O que falta
- Integração com Z-API ou Evolution API
- Webhook para receber confirmações
- Template de mensagem
- Trigger no `QueueService.updateStatus` quando `EM_ATENDIMENTO`

---

## Feature 10: Pagamento Pix

### Status: ❌ Não Implementado

### User Story (Planejada)
Como **cliente**, quero pagar via Pix diretamente pelo app.

### O que falta
- Integração com AbacatePay
- Geração de QR code Pix
- Webhook de confirmação
- Tela de pagamento no ClientView
