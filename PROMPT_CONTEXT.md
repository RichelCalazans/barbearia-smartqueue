# Barbearia SmartQueue - Contexto do Projeto

## Stack Atual
- **Frontend**: React 19 + TypeScript + Vite
- **Backend**: Firebase (Firestore, Auth)
- **Estilização**: Tailwind CSS 4
- **Animações**: Motion (Framer Motion)
- **Realtime**: Firebase onSnapshot (equivalente a SSE/WebSocket)
- **Deploy**: Firebase Hosting

## Estrutura de Arquivos
```
src/
├── components/     # Componentes React reutilizáveis
├── pages/         # Páginas (Login, BarberDashboard, ClientView, etc.)
├── services/      # Service layer (Firebase + lógica de negócio)
├── hooks/        # React hooks customizados
├── types/        # TypeScript interfaces
├── contexts/      # React Context (AppContext, Auth)
├── firebase.ts   # Configuração Firebase
└── db/
    └── schema.ts  # Types Drizzle (prontos para futura migração PostgreSQL)
```

## Features Implementadas
1. **Fila Virtual** - Adicionar clientes manualmente, positions ordenáveis
2. **Drag-and-Drop** - Reordenar fila arrantando (@dnd-kit/core)
3. **EWT (Estimated Wait Time)** - Cálculo com mediana histórica (7 dias), cache 5min, fallback
4. **Realtime** - Updates automáticos via Firebase onSnapshot
5. **Transacional** - reorderQueue com Firestore runTransaction
6. **Dashboard Barber** - Controles de status, métricas, agenda
7. **View Cliente** - ticket virtual com posição e tempo estimado

## Models Firestore (atuais)
- `clients` - Clientes com EWMA de tempo
- `queue` - Itens da fila (posicao, status, servicos, horaPrevista)
- `history` - Histórico de atendimentos (para mediana)
- `services` - Tipos de serviço com tempoBase e preco
- `config` - Configurações (AppConfig, estado da agenda)

## Próximos Passos Possíveis
- Migrar para PostgreSQL + Drizzle + Supabase
- Adicionar multi-tenant
- SSE/Redis para realtime
- Dashboard admin completo
- App mobile (React Native/Expo)

---

**Para usar:** Copie este arquivo e injete no ChatGPT antes de pedir prompts específicos sobre o que você precisa implementar.