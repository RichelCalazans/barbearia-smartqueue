# ONBOARDING.md — Guia para Novos Desenvolvedores

> Última atualização: 2026-03-27

---

## 1. Pré-Requisitos

| Software | Versão Mínima | Comando de Verificação |
|---|---|---|
| Node.js | 22.x | `node --version` |
| npm | 10.x | `npm --version` |
| Git | 2.x | `git --version` |
| Firebase CLI | 13.x | `firebase --version` |

### Instalar Firebase CLI (se não tiver)
```bash
npm install -g firebase-tools
firebase login
```

---

## 2. Clone e Setup

```bash
# 1. Clone o repositório
git clone <repo-url> smartqueue
cd smartqueue

# 2. Instale dependências
npm install

# 3. Configure variáveis de ambiente
cp .env.example .env.local
```

### Editar `.env.local`

```bash
# Obtenha a API key no Firebase Console:
# https://console.firebase.google.com/project/smartqueue-aeb94/settings/general
VITE_FIREBASE_API_KEY="sua-api-key-aqui"

# Opcional (não usado no código atual)
GEMINI_API_KEY="não-necessário"
```

---

## 3. Firebase Project

O projeto já está configurado no Firebase (`smartqueue-aeb94`). Para acessar:

1. Pedir acesso ao console: https://console.firebase.google.com/project/smartqueue-aeb94
2. Verificar que tem permissão de Editor ou Owner no projeto GCP

### Se Precisar de Projeto Próprio (desenvolvimento isolado)
```bash
# Criar novo projeto no Firebase Console
# Depois:
firebase use --add
# Selecionar o novo projeto
# Atualizar firebase.config.ts com as novas credenciais
```

---

## 4. Rodando em Desenvolvimento

```bash
# Iniciar dev server (porta 3000)
npm run dev
```

### URLs Locais
| URL | Descrição |
|---|---|
| http://localhost:3000 | Interface do cliente (entrar na fila) |
| http://localhost:3000/login | Tela de login |
| http://localhost:3000/barber | Dashboard do barbeiro (precisa ser admin) |

### Para Acessar o Dashboard
1. Ir para http://localhost:3000/login
2. Logar com um email que esteja na lista de admins:
   - `richelcalazans6@gmail.com` (hardcoded)
   - `teste@teste.com` (hardcoded)
   - Ou qualquer email cadastrado como admin na collection `users` do Firestore

---

## 5. Comandos Disponíveis

```bash
npm run dev       # Dev server com HMR (porta 3000)
npm run build     # Build de produção (output: dist/)
npm run preview   # Preview do build local
npm run lint      # Type check (tsc --noEmit)
npm run clean     # Remove dist/
```

### Deploy Manual (se necessário)
```bash
npm run build
firebase deploy
```

### Deploy Apenas Rules
```bash
firebase deploy --only firestore:rules
```

---

## 6. Estrutura do Projeto — Guia Rápido

### Onde Encontrar Cada Coisa

| Preciso... | Arquivo |
|---|---|
| Adicionar nova rota/página | `src/App.tsx` (switch no `renderPage`) + criar em `src/pages/` |
| Criar novo componente UI | `src/components/NomeComponente.tsx` |
| Adicionar campo ao banco | `src/types/index.ts` (interface) + `firestore.rules` (validação) |
| Criar novo service | `src/services/NomeService.ts` (seguir padrão de classe estática) |
| Mudar regras de acesso | `firestore.rules` |
| Mudar cores/theme | `src/index.css` (seção `@theme`) |
| Mudar configuração de build | `vite.config.ts` |
| Mudar CI/CD | `.github/workflows/` |

### Padrão para Novo Service
```typescript
import { collection, getDocs, addDoc, updateDoc, doc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';

export class MeuService {
  private static COLLECTION = 'minha_collection';

  static async meuMetodo(): Promise<ReturnType> {
    const path = this.COLLECTION;
    try {
      // Operação Firestore
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return fallback;
    }
  }
}
```

### Padrão para Novo Componente
```tsx
import { cn } from '../utils';

interface MeuComponenteProps {
  // props aqui
}

export function MeuComponente({ ...props }: MeuComponenteProps) {
  return (
    <div className={cn('bg-[#111111] rounded-2xl p-6 border border-[#1E1E1E]')}>
      {/* conteúdo */}
    </div>
  );
}
```

---

## 7. Testes de Sanidade

Após setup, verifique que tudo funciona:

### Teste 1: Build compila
```bash
npm run build
# Esperar: Sem erros, dist/ criada com chunks separados
```

### Teste 2: Interface do cliente
1. Acessar http://localhost:3000
2. Verificar se a tela de fila carrega
3. Se agenda estiver aberta: preencher nome + telefone + selecionar serviço + submeter
4. Verificar que aparece na fila com posição e hora prevista

### Teste 3: Login
1. Acessar http://localhost:3000/login
2. Logar com credenciais de admin
3. Verificar que redireciona para /barber
4. Verificar que o dashboard carrega com métricas

### Teste 4: Dashboard
1. No /barber, testar abrir/fechar agenda
2. Se houver clientes na fila: testar "Chamar Próximo"
3. Verificar que o timer aparece para o cliente em atendimento

---

## 8. Primeiras Tarefas para Novo Dev

### Ordem sugerida de familiarização:
1. Ler `ARQUITETURA.md` — entender a estrutura
2. Ler `PADROES.md` — saber como contribuir
3. Rodar localmente e testar os 3 fluxos principais (entrar na fila, gerenciar fila, ver métricas)
4. Ler `FEATURES.md` — entender o que está implementado
5. Ler `PROBLEMAS_ROADMAP.md` — ver o que priorizar

### Tarefas de Onboarding Sugeridas (para ganhar contexto):
1. **[Fácil]** Corrigir BUG-005: Adicionar validação de formato `horaPrevista` no `addToQueue`
2. **[Fácil]** FEAT-003: Adicionar check de duplicado na fila
3. **[Médio]** DEBT-001: Extrair um sub-componente do BarberDashboard (ex: `AgendaControls`)
4. **[Médio]** DEBT-005: Adicionar validação com Zod no formulário do ClientView

---

## 9. Documentação Complementar

| Documento | O que contém |
|---|---|
| `ARQUITETURA.md` | Estrutura, ERD, decisões de stack, fluxo de dados |
| `PADROES.md` | Convenções de código, naming, styling |
| `FEATURES.md` | Cada feature com status, fluxo, implementação |
| `FLUXOS.md` | Diagramas sequenciais dos 5 happy paths |
| `DEPLOY_CONFIG.md` | Variáveis de ambiente, CI/CD, rollback |
| `PROBLEMAS_ROADMAP.md` | Bugs, débitos técnicos, features planejadas |
| `directives/queue_management.md` | Spec de gerenciamento de fila |
| `directives/time_prediction.md` | Spec do algoritmo EWMA |
