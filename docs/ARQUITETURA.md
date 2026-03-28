# ARQUITETURA.md — SmartQueue (Barbearia)

> Última atualização: 2026-03-27
> Stack real: React 19 + Vite 6 + Firebase (Firestore + Auth) + Framer Motion + Tailwind CSS v4

---

## 1. Visão Geral

SmartQueue é uma **fila virtual para barbearias** (inicialmente single-tenant, uma barbearia). Permite que clientes entrem na fila via interface pública, enquanto o barbeiro gerencia atendimentos, métricas e configurações via dashboard admin.

### Stack de Decisões

| Tecnologia | Escolha | Justificativa |
|---|---|---|
| **Frontend** | React 19 + Vite 6 | SPA leve, HMR rápido, sem SSR necessário para este caso |
| **Banco de dados** | Firebase Firestore | Realtime listeners nativos (onSnapshot), zero infra de backend |
| **Autenticação** | Firebase Auth | Email/senha + Google OAuth, integrado com Firestore rules |
| **Estilização** | Tailwind CSS v4 + clsx + tailwind-merge | Utility-first, theme customizado via @theme |
| **Animações** | Framer Motion (via `motion/react`) | Transições de página, modais, componentes animados |
| **Deploy** | Firebase Hosting + GitHub Actions | CI/CD automático, deploy a cada push na main |
| **Ícones** | Lucide React | Lightweight, tree-shakeable |

### Por que NÃO Next.js?

O prompt original mencionava Next.js + Prisma + Supabase, mas o projeto real usa Vite + Firebase. As razões prováveis:
- **Sem necessidade de SSR/SSG** — app é 100% client-side com dados real-time
- **Firebase substitui backend inteiro** — Firestore rules fazem o papel de API + autorização
- **Simplicidade de deploy** — Firebase Hosting serve estáticos, sem servidores

### Por que NÃO Prisma?

- Firestore é NoSQL — Prisma é ORM para SQL. Não se aplicam aqui
- A camada de dados é feita por services estáticos que encapsulam o Firestore SDK

---

## 2. Estrutura de Pastas

```
/
├── .claude/orchestrator/     # Prompts de orquestração para Claude (security, atomicity, bundle)
├── .github/workflows/        # CI/CD — deploy-firebase.yml
├── directives/               # Docs de domínio (queue_management.md, time_prediction.md)
├── dist/                     # Build output (Vite)
├── src/
│   ├── App.tsx               # Router manual (path-based switch), lazy loading
│   ├── main.tsx              # Entry point — React 19 createRoot
│   ├── index.css             # Tailwind imports + @theme customizado (Inter, JetBrains Mono)
│   ├── firebase.ts           # Firebase SDK init, auth helpers, error handling
│   ├── firebase.config.ts    # Firebase project config (API keys)
│   ├── utils.ts              # cn() — clsx + tailwind-merge
│   ├── types/index.ts        # Todas as interfaces TypeScript (Client, QueueItem, Attendance, etc.)
│   ├── hooks/
│   │   ├── useAuth.ts        # Firebase Auth listener + admin check
│   │   └── useQueue.ts       # Firestore onSnapshot da fila do dia
│   ├── services/
│   │   ├── QueueService.ts       # CRUD da fila, recalculateQueue (writeBatch)
│   │   ├── AttendanceService.ts  # Finalização atômica (runTransaction)
│   │   ├── ClientService.ts      # CRUD de clientes, enrichClients (segmentação)
│   │   ├── ConfigService.ts      # Config/state da barbearia, auto open/close
│   │   ├── ServiceService.ts     # CRUD dos serviços oferecidos
│   │   ├── TimePredictorService.ts # EWMA, predição de tempo
│   │   ├── AnalyticsService.ts   # Métricas por período, chair utilization
│   │   └── UserService.ts        # CRUD de usuários admin (via REST API)
│   ├── components/
│   │   ├── Button.tsx        # Botão com variantes (primary, secondary, danger, ghost, outline)
│   │   ├── Card.tsx          # Card container com variantes
│   │   ├── Modal.tsx         # Modal animado com backdrop
│   │   ├── Input.tsx         # Input com label e erro
│   │   ├── Timer.tsx         # Timer circular SVG com progresso visual
│   │   ├── ServiceChip.tsx   # Chip selecionável para serviços
│   │   ├── Skeleton.tsx      # Loading placeholder
│   │   ├── ScissorsLoading.tsx # Loading animado com tesoura
│   │   └── BottomNavigation.tsx # Nav inferior mobile (Fila/Métricas/Clientes)
│   └── pages/
│       ├── ClientView.tsx     # 342 linhas — Tela pública do cliente (entrar na fila)
│       ├── BarberDashboard.tsx # 1009 linhas — Dashboard completo do barbeiro
│       ├── MetricsPage.tsx    # 406 linhas — Gráficos e analytics
│       ├── ClientsPage.tsx    # 382 linhas — CRM de clientes
│       └── Login.tsx          # 160 linhas — Login com email/senha + Google
├── firestore.rules           # Regras de segurança do Firestore (validação, admin-only, etc.)
├── firebase.json             # Config Firebase Hosting (SPA rewrite)
├── vite.config.ts            # Plugins, manual chunks, env vars
├── tsconfig.json             # ES2022, bundler resolution, React JSX
└── package.json              # Scripts: dev, build, preview, lint
```

---

## 3. Modelo de Dados (Firestore — NoSQL)

### ERD Conceitual (ASCII)

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐
│   clients    │     │    queue      │     │   history    │
├─────────────┤     ├──────────────┤     ├──────────────┤
│ id           │◄────│ clienteId    │     │ clienteId    │
│ nome         │     │ clienteNome  │     │ clienteNome  │
│ telefone     │     │ servicos     │     │ servicos     │
│ dataNascimento│    │ servicosIds[]│     │ data         │
│ totalVisitas │     │ tempoEstimado│     │ horaInicio   │
│ tempoMedio   │     │ horaPrevista │     │ horaFim      │
│ dataCadastro │     │ status       │     │ duracaoReal  │
│ ativo        │     │ horaEntrada  │     │ duracaoEstimada│
└─────────────┘     │ horaChamada? │     │ barbeiro     │
                     │ horaFim?     │     │ manual       │
                     │ data         │     └──────────────┘
                     │ telefone     │
                     │ posicao      │     ┌──────────────┐
                     │ manual       │     │   services   │
                     └──────────────┘     ├──────────────┤
                                          │ id           │
┌─────────────┐     ┌──────────────┐     │ nome         │
│ config/      │     │   users      │     │ tempoBase    │
│  settings    │     ├──────────────┤     │ preco        │
├─────────────┤     │ id           │     │ ativo        │
│ BUFFER_MIN   │     │ email        │     └──────────────┘
│ EWMA_ALPHA   │     │ nome         │
│ MAX_DAILY    │     │ isAdmin      │
│ OPENING_TIME │     │ ativo        │
│ CLOSING_TIME │     │ createdAt    │
│ WEEKLY_SCHED │     └──────────────┘
│ AUTO_OPEN_CLS│
├─────────────┤
│ config/state │
├─────────────┤
│ agendaAberta │
│ agendaPausada│
│ dataAbertura │
│ tempoRetomada│
└─────────────┘
```

### Collections

| Collection | Propósito | Leitura | Escrita |
|---|---|---|---|
| `clients` | Cadastro de clientes | Público (get/list) | Create: validação; Update: autenticado; Delete: admin |
| `queue` | Fila do dia | Público | Create: validado; Update: admin ou auto-cancelamento; Delete: admin |
| `history` | Registro de atendimentos | Admin only | Admin only |
| `services` | Catálogo de serviços | Público | Admin only |
| `config/settings` | Parâmetros da barbearia | Autenticado (get) | Autenticado |
| `config/state` | Estado da agenda (aberta/fechada/pausada) | Autenticado (get) | Autenticado |
| `users` | Usuários do sistema | Owner ou admin | Admin only |

### Campos Críticos

- **`client.tempoMedio`** — EWMA (Exponentially Weighted Moving Average) do tempo de atendimento individual
- **`queue.horaPrevista`** — Calculada em cascata baseada nos itens anteriores na fila
- **`queue.status`** — FSM: `AGUARDANDO → EM_ATENDIMENTO → CONCLUIDO | CANCELADO | AUSENTE`
- **`config.EWMA_ALPHA`** — Peso do dado mais recente (default 0.3)

---

## 4. Rotas da Aplicação

| Rota | Componente | Acesso | Descrição |
|---|---|---|---|
| `/` | `ClientView` | Público | Interface do cliente para entrar na fila |
| `/login` | `Login` | Público | Autenticação (email/senha ou Google) |
| `/barber` | `BarberDashboard` | Admin only | Dashboard com 3 tabs: Fila, Métricas, Clientes |

O roteamento é **manual** (não usa react-router para navegação entre páginas): `window.location.pathname` + `switch/case` no `App.tsx`. `react-router-dom` está no `package.json` mas só é usado indiretamente.

---

## 5. Fluxo de Dados End-to-End

```
Cliente (/) ──► Firestore (queue collection) ──► onSnapshot ──► Barbeiro (/barber)
     │                    │                           │
     │  [addToQueue]      │   [realtime sync]        │  [updateStatus]
     │  ClientService     │                          │  QueueService
     │  TimePredictorSvc  │                          │  AttendanceService
     │                    │                          │
     ▼                    ▼                          ▼
   POST queue doc    Firestore Rules          POST queue/history
   (validado por     (isValidClient,          (runTransaction —
    rules do FS)      isValidQueueItem)        atômico)
```

### Realtime

O sistema usa **Firestore onSnapshot** para sincronização em tempo real:
- `useQueue` hook — listener na collection `queue` filtrada por data de hoje + status ativo
- `ConfigService.onConfigChange` — listener na configuração
- `ConfigService.onStateChange` — listener no estado da agenda

Não há SSE, WebSockets custom, ou Redis. Firebase Firestore realtime é suficiente para o volume atual.

---

## 6. Integrações Externas

| Integração | Status | Notas |
|---|---|---|
| **Firebase Auth** | ✅ Implementado | Email/senha + Google OAuth |
| **Firebase Firestore** | ✅ Implementado | Banco principal + realtime |
| **Firebase Hosting** | ✅ Implementado | Deploy via GitHub Actions |
| **Z-API / Evolution (WhatsApp)** | ❌ Não implementado | Planejado no prompt original |
| **AbacatePay (Pix)** | ❌ Não implementado | Planejado no prompt original |
| **Gemini API** | ⚠️ Parcial | Presente no .env.example mas sem uso no código |

---

## 7. Decisões Arquiteturais Notáveis

### 7.1 Operações Atômicas
- `AttendanceService.finalizeAttendance` usa `runTransaction` — garante que histórico, EWMA do cliente e status da fila são atualizados juntos ou nenhum
- `QueueService.recalculateQueue` usa `writeBatch` — atualiza horários previstos de toda a fila em uma operação

### 7.2 Predição de Tempo (EWMA)
- Fórmula: `novaMedia = α × duracaoReal + (1 - α) × mediaAnterior`
- α default = 0.3 (configurável)
- Clientes novos: `tempoBase × NEW_CLIENT_MULTIPLIER (1.25)`
- Clientes recorrentes: usa o `tempoMedio` pessoal acumulado

### 7.3 Segmentação de Clientes
Definida em `ClientService.enrichClients`:
- **NEW**: < 3 visitas
- **REGULAR**: 3-9 visitas
- **VIP**: ≥ 10 visitas
- **AT_RISK**: > 45 dias sem visita OU > 1.5× intervalo médio entre visitas

### 7.4 Security Rules
Firestore rules fazem validação de schema (campos obrigatórios, tipos, valores iniciais), autorização por role (admin, owner, público), e restrição de campos mutáveis por clientes (só podem cancelar próprio item na fila, mudando apenas `status` e `horaFim`).

### 7.5 Code Splitting
`App.tsx` usa `React.lazy` para carregar páginas sob demanda. `vite.config.ts` define manual chunks separando vendor-react, vendor-firebase e vendor-motion.
