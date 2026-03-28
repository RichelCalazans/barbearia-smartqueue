# PROBLEMAS_ROADMAP.md — Problemas Conhecidos, Débitos e Roadmap

> Última atualização: 2026-03-27

---

## 1. Bugs Conhecidos

### BUG-001: Cliente pode entrar duplicado na fila
- **Severidade**: High
- **Como reproduzir**: Cliente entra na fila, abre outra aba, entra novamente com mesmo telefone
- **Impacto**: Fila fica inconsistente, duas posições para o mesmo cliente
- **Solução sugerida**: Antes de `addToQueue`, verificar se já existe item na fila do dia com `clienteId` + `status: AGUARDANDO`
- **Onde corrigir**: `src/services/QueueService.ts` → `addToQueue`, adicionar query de verificação

### BUG-002: Horários previstos não recalculam após cancelamento pelo cliente
- **Severidade**: Medium
- **Como reproduzir**: Cliente cancela; próximos clientes mantêm horários antigos
- **Impacto**: Horários previstos ficam incorretos até próxima ação do barbeiro
- **Solução sugerida**: Chamar `recalculateQueue` após cancelamento. Problema: o cliente não é autenticado, então não pode chamar a função (rules bloqueiam). Alternativa: Cloud Function triggered por write no queue doc.
- **Onde corrigir**: Requer Cloud Function ou mudança na arquitetura

### BUG-003: Auto open/close e auto-resume dependem do dashboard aberto
- **Severidade**: Medium
- **Como reproduzir**: Fechar browser → auto open/close não funciona
- **Impacto**: Barbearia não abre/fecha automaticamente se barbeiro não estiver logado
- **Solução sugerida**: Mover para Cloud Scheduler + Cloud Function
- **Bloqueado por**: Requer setup de Cloud Functions (custo adicional)

### BUG-004: Google login redirect pode ficar em loading infinito
- **Severidade**: Low
- **Como reproduzir**: Login com Google → redirect → se `getRedirectResult` falha silenciosamente
- **Impacto**: UX ruim, usuário não sabe o que aconteceu
- **Solução sugerida**: Adicionar timeout + mensagem de erro + botão "tentar novamente"
- **Onde corrigir**: `src/pages/Login.tsx` → useEffect que chama `getGoogleRedirectResult`

### BUG-005: `horaPrevista` pode ficar em formato inconsistente
- **Severidade**: Low
- **Como reproduzir**: Dados legados ou edge cases no cálculo de tempo
- **Impacto**: UI mostra "00:00" ou formato estranho
- **Mitigação atual**: `useQueue.ts` já tem parsing defensivo com regex `/^\d{2}:\d{2}$/`
- **Solução definitiva**: Validar formato no `addToQueue` e `recalculateQueue`

---

## 2. Débitos Técnicos

### DEBT-001: BarberDashboard.tsx com 1009 linhas
- **Por que existe**: Crescimento orgânico — features foram adicionadas ao mesmo componente
- **Impacto**: Difícil de entender, testar e manter. Alta cognitive load.
- **Quando refatorar**: Antes de adicionar qualquer nova feature no dashboard
- **Como refatorar**:
  1. Extrair `QueueTab.tsx` — seção de atendimento + fila
  2. Extrair `AgendaControls.tsx` — seção abrir/fechar/pausar
  3. Extrair `SettingsModal.tsx` — modal de configurações
  4. Extrair `UserManagementModal.tsx` — modal de usuários
  5. Extrair `ServiceManagementModal.tsx` — modal de serviços
  6. Manter `BarberDashboard.tsx` como orchestrador (~100 linhas)

### DEBT-002: Sem testes automatizados
- **Por que existe**: MVP focou em velocidade de entrega
- **Impacto**: Qualquer mudança pode quebrar features sem aviso
- **Quando refatorar**: Antes de onboarding de novo dev
- **Como resolver**:
  1. Instalar Vitest (`npm install -D vitest @testing-library/react`)
  2. Começar por unit tests nos services (TimePredictorService, AnalyticsService)
  3. Depois integration tests nos hooks (useAuth, useQueue com mock do Firestore)
  4. Por último E2E com Playwright

### DEBT-003: State management espalhado (useState em tudo)
- **Por que existe**: Simplicidade inicial suficiente
- **Impacto**: Props drilling entre componentes, re-renders desnecessários
- **Quando refatorar**: Quando extrair sub-componentes do BarberDashboard
- **Como resolver**: Introduzir Context para config/state, ou Zustand para estado mais complexo

### DEBT-004: Admin emails hardcoded em 2 lugares
- **Por que existe**: Facilidade durante desenvolvimento
- **Impacto**: Para trocar admin, precisa alterar código + rules + deploy
- **Locais**: `src/hooks/useAuth.ts` (linha ~6) e `firestore.rules` (função `isAdmin`)
- **Quando refatorar**: Quando implementar sistema de roles robusto
- **Como resolver**: Depender apenas da collection `users` no Firestore, com custom claims no Firebase Auth

### DEBT-005: Sem validação de input no client-side
- **Por que existe**: Confiança nas Firestore rules para validação
- **Impacto**: UX ruim — erros aparecem como mensagens genéricas do Firestore
- **Quando refatorar**: Quando melhorar UX do formulário de entrada na fila
- **Como resolver**: Adicionar Zod ou validação manual antes de chamar services

### DEBT-006: Sem backup automatizado do Firestore
- **Por que existe**: Não configurado no MVP
- **Impacto**: Risco de perda de dados em caso de exclusão acidental
- **Quando resolver**: Imediatamente (antes de mais nada)
- **Como resolver**: Configurar Cloud Scheduler + `gcloud firestore export`

### DEBT-007: Sem rate limiting
- **Por que existe**: Dependência do Firebase quotas
- **Impacto**: Potencial abuso (spam de entradas na fila)
- **Quando resolver**: Se/quando houver abuso
- **Como resolver**: Firebase App Check ou custom Cloud Function com rate limit

### DEBT-008: Navegação manual sem react-router
- **Por que existe**: Simplicidade inicial, poucas rotas
- **Impacto**: Sem transições de rota, sem route guards, sem query params
- **Quando resolver**: Se/quando adicionar mais rotas
- **Como resolver**: Migrar para react-router v7 (já está no package.json mas não usado)

---

## 3. Roadmap (Features Planejadas)

### Prioridade Alta

#### FEAT-001: Notificações WhatsApp
- **Descrição**: Notificar cliente via WhatsApp quando sua vez estiver próxima
- **Por que**: Feature mais pedida, resolve o problema de "não sei quando é minha vez"
- **Dependências**: Z-API ou Evolution API account, webhook endpoint
- **Esforço estimado**: 2-3 dias
- **Bloqueadores**: Precisa de backend (Cloud Function) para enviar mensagens

#### FEAT-002: Backup Automatizado
- **Descrição**: Export diário do Firestore para Cloud Storage
- **Por que**: Proteção contra perda de dados
- **Dependências**: GCP billing account, Cloud Scheduler
- **Esforço estimado**: 2-4 horas

#### FEAT-003: Proteção contra Duplicados na Fila
- **Descrição**: Verificar se cliente já está na fila antes de adicionar
- **Por que**: Bug BUG-001
- **Esforço estimado**: 1-2 horas

### Prioridade Média

#### FEAT-004: Refatoração do BarberDashboard
- **Descrição**: Quebrar em componentes menores (ver DEBT-001)
- **Por que**: Facilitar manutenção e onboarding de novos devs
- **Esforço estimado**: 1 dia

#### FEAT-005: Testes Automatizados
- **Descrição**: Setup Vitest + testes unitários para services
- **Por que**: Segurança para fazer mudanças (ver DEBT-002)
- **Esforço estimado**: 2-3 dias para cobertura básica

#### FEAT-006: Pagamento Pix via AbacatePay
- **Descrição**: Cliente paga via QR code Pix diretamente no app
- **Por que**: Monetização, conveniência
- **Dependências**: Conta AbacatePay, webhook endpoint (Cloud Function)
- **Esforço estimado**: 3-5 dias

#### FEAT-007: Cloud Functions para Auto Open/Close
- **Descrição**: Mover auto open/close para server-side
- **Por que**: BUG-003 — não depender do browser do barbeiro
- **Esforço estimado**: 4-6 horas

### Prioridade Baixa

#### FEAT-008: QR Code de Entrada
- **Descrição**: Gerar QR code com link direto para entrar na fila
- **Esforço estimado**: 2-4 horas (lib `qrcode` + componente)

#### FEAT-009: Multi-Barbeiro (Multi-Tenant)
- **Descrição**: Suporte a múltiplos barbeiros/barbearias
- **Por que**: Escalabilidade do produto
- **Dependências**: Refatoração de modelo de dados, tenantId em todas as collections
- **Esforço estimado**: 1-2 semanas
- **Bloqueadores**: Mudança arquitetural grande, possível migração de stack

#### FEAT-010: PWA / App Instalável
- **Descrição**: Service worker + manifest para instalação no celular
- **Esforço estimado**: 4-6 horas

#### FEAT-011: Dashboard de Gráficos Reais
- **Descrição**: Substituir barras CSS por Recharts/Chart.js
- **Esforço estimado**: 1 dia
