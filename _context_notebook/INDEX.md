# SmartQueue - Contexto do Projeto para Notebook LM

Pasta de contexto com cópias dos arquivos principais do SmartQueue para usar em notebook (Jupyter, Claude, etc).

## 📁 Estrutura da Pasta

```
_context_notebook/
├── types/              # Data model do projeto
│   └── index.ts
├── services/           # Lógica de negócio
│   ├── QueueService.ts          # Gerenciamento de fila
│   ├── TimePredictorService.ts  # EWMA para tempo estimado
│   ├── ClientService.ts         # Gerenciamento de clientes
│   ├── ConfigService.ts         # Configurações
│   ├── AttendanceService.ts     # Registro de presença
│   ├── AnalyticsService.ts      # Métricas
│   ├── ServiceService.ts        # Serviços de barbearia
│   ├── NotificationService.ts   # Notificações
│   └── UserService.ts           # Gestão de usuários
├── pages/              # Componentes principais (páginas)
│   ├── ClientView.tsx           # Visão do cliente
│   ├── BarberDashboard.tsx      # Dashboard do barbeiro
│   └── App.tsx                  # Roteamento
├── hooks/              # Hooks customizados
│   ├── useAuth.ts      # Autenticação
│   └── useQueue.ts     # Estado da fila
├── firebase/           # Configuração e setup
│   ├── firebase.ts
│   └── firebase.config.ts
├── directives/         # Documentação de regras de negócio
│   ├── queue_management.md      # Regras de fila
│   └── time_prediction.md       # Algoritmo EWMA
├── README.md           # Documentação do projeto
└── INDEX.md            # Este arquivo
```

## 🎯 Como Usar

1. **Para contexto rápido:** Leia primeiro os arquivos em ordem:
   - `types/index.ts` → entender estrutura de dados
   - `directives/` → entender regras de negócio
   - `services/` → entender lógica

2. **Para explorar feature específica:**
   - Fila: `services/QueueService.ts` + `directives/queue_management.md`
   - Tempo estimado: `services/TimePredictorService.ts` + `directives/time_prediction.md`
   - Autenticação: `hooks/useAuth.ts` + `firebase/`

3. **Para integração completa:** Leia `pages/ClientView.tsx` ou `pages/BarberDashboard.tsx`

## 📋 Resumo do Projeto

**SmartQueue** é um app de fila virtual para barbearia onde:
- Clientes entram na fila via WhatsApp
- Barbeiro gerencia atendimento em tempo real
- Sistema estima tempo de espera com EWMA
- Deploy em Google Cloud Run + Firebase

**Stack:** React 18 + TypeScript + Vite + Tailwind + Firebase

---

⚠️ **Nota:** Estes são arquivos de cópia. Qualquer modificação aqui **não afeta** o projeto original.
