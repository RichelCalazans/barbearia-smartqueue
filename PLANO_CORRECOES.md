# Plano de Correções - SmartQueue

## Visão Geral
Este documento planeja todas as correções necessárias para colocar o SmartQueue em produção e testar com um barbeiro real.

---

## 🚨 FASE 1: Correções Críticas (Impedem o uso em produção)

### 1.1 BUG-001: Cliente pode entrar na fila duas vezes
- **Arquivo:** `src/services/QueueService.ts` (função `addToQueue`)
- **Arquivo:** `src/pages/ClientView.tsx` (função `handleJoinQueue`)
- **Problema:** Não há verificação de ticket ativo antes de adicionar cliente à fila
- **Solução:** Adicionar verificação de `clienteId` + `status: 'AGUARDANDO'` antes de inserir
- **Prioridade:** CRÍTICA
- **Complexidade:** Simples

### 1.2 BUG-002: Tempos não recalculam quando cliente cancela
- **Arquivo:** `src/pages/ClientView.tsx` (função `handleCancel`)
- **Arquivo:** `src/services/QueueService.ts` (função `recalculateQueue`)
- **Problema:** Ao cancelar, só muda status para `CANCELADO`, mas não recalcula tempos dos demais
- **Solução:** Chamar `recalculateQueue` após cancelar (via Cloud Function ou listener do dashboard)
- **Prioridade:** ALTA
- **Complexidade:** Média

### 1.3 BUG-005: Formato inconsistente de `horaPrevista`
- **Arquivo:** `src/services/TimePredictorService.ts` (função `addMinutes`)
- **Problema:** Strings de tempo mal formatadas podem gerar `NaN:NaN`
- **Solução:** Adicionar validação de formato `HH:MM` na função `addMinutes`
- **Prioridade:** BAIXA
- **Complexidade:** Simples

---

## ⚠️ FASE 2: Melhorias de Segurança e Configuração

### 2.1 ISSUE-006: Emails de admin hardcoded em múltiplos locais
- **Arquivos:** 
  - `src/hooks/useAuth.ts` (linha 7)
  - `src/services/ConfigService.ts` (linha 22)
  - `firestore.rules` (função `isAdmin`)
- **Problema:** Emails admin estão hardcoded, exigindo redeploy para trocar admin
- **Solução:** 
  1. Criar constante centralizada em `src/config/admin.ts`
  2. Usar apenas essa constante em todos os locais
  3. Documentar como alterar
- **Prioridade:** ALTA
- **Complexidade:** Média

### 2.2 ISSUE-007: Validação de inputs faltando
- **Arquivos:** `src/pages/ClientView.tsx`, `src/services/QueueService.ts`
- **Problema:** Formulários sem validação adequada (telefone, nome, data)
- **Solução:** Adicionar validação básica com funções auxiliares em `src/utils/validation.ts`
- **Prioridade:** MÉDIA
- **Complexidade:** Média

### 2.3 BUG-004: Loop de redirect no login Google
- **Arquivo:** `src/pages/Login.tsx` (linhas 50-54)
- **Problema:** Loading infinito sem timeout ou botão de retry
- **Solução:** Adicionar timeout de 10s + botão "Tentar novamente"
- **Prioridade:** MÉDIA
- **Complexidade:** Média

---

## 🔧 FASE 3: Melhorias de Arquitetura

### 3.1 ISSUE-008: Extrair componentes do BarberDashboard
- **Arquivo:** `src/pages/BarberDashboard.tsx` (1457 linhas)
- **Problema:** Componente gigante, difícil de manter e testar
- **Solução:** Extrair em sub-componentes:
  - `QueueTab.tsx` - Fila atual
  - `AgendaControls.tsx` - Abrir/fechar/pausar
  - `BarberStatusControls.tsx` - Botões de status
  - `SettingsModal.tsx` - Configurações
  - `DelayAlertBanner.tsx` - Alerta de atraso
- **Prioridade:** ALTA
- **Complexidade:** Complexa

### 3.2 ISSUE-010: Migrar para React Router
- **Arquivo:** `src/App.tsx`
- **Problema:** Roteamento manual com `window.location`
- **Solução:** Usar `react-router-dom` (já instalado) com route guards
- **Prioridade:** MÉDIA
- **Complexidade:** Média

### 3.3 ISSUE-009: Remover dependências não usadas
- **Arquivo:** `package.json`
- **Problema:** `express`, `dotenv`, `@types/express` não são usados
- **Solução:** Remover do `package.json` e rodar `npm install`
- **Prioridade:** BAIXA
- **Complexidade:** Simples

---

## 📋 FASE 4: Funcionalidades Faltando

### 4.1 BUG-003: Auto abrir/fechar agenda só funciona com dashboard aberto
- **Arquivo:** `src/pages/BarberDashboard.tsx` (linhas 95-102)
- **Arquivo:** `src/services/ConfigService.ts` (função `checkAutoOpenClose`)
- **Problema:** Lógica só roda enquanto dashboard está aberto
- **Solução:** Implementar Cloud Function com Cloud Scheduler (requer billing)
- **Prioridade:** ALTA (mas pode ser pós-MVP)
- **Complexidade:** Complexa

### 4.2 Configuração inicial do Firebase
- **Arquivo:** `.env.example` → `.env.local`
- **Problema:** Sem instruções claras de setup
- **Solução:** Criar script `setup.sh` ou melhorar README
- **Prioridade:** MÉDIA
- **Complexidade:** Simples

---

## 🎯 ORDEM DE EXECUÇÃO RECOMENDADA

### Para testar com barbeiro URGENTE (MVP):
1. ✅ BUG-001 - Evitar fila duplicada
2. ✅ BUG-002 - Recalcular tempos ao cancelar
3. ✅ BUG-005 - Validar formato de hora
4. ✅ Configuração Firebase (.env.local)
5. ✅ ISSUE-007 - Validação básica de inputs

### Para produção estável:
6. ✅ ISSUE-006 - Centralizar emails admin
7. ✅ BUG-004 - Fix login Google
8. ✅ ISSUE-010 - Migrar para React Router
9. ✅ ISSUE-009 - Limpar dependências

### Para qualidade de código:
10. ✅ ISSUE-008 - Refatorar BarberDashboard
11. ✅ BUG-003 - Cloud Functions para auto open/close

---

## 📊 Estimativa Total
- **Fase 1 (Crítico):** 2-4 horas
- **Fase 2 (Segurança):** 3-5 horas
- **Fase 3 (Arquitetura):** 6-10 horas
- **Fase 4 (Features):** 4-8 horas (excluindo Cloud Functions)

**Total MVP urgente:** ~6 horas
**Total produção estável:** ~15 horas
