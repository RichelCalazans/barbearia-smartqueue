Você é um especialista em React + TypeScript. Sua tarefa é integrar as novas telas MetricsPage e ClientsPage ao painel do barbeiro via BottomNavigation com tabs.

**ATENÇÃO:** Execute este prompt SOMENTE após os agentes 04, 05 e 06 terem concluído. Verifique que estes arquivos existem antes de continuar:
- `src/pages/MetricsPage.tsx` — exporta `MetricsPage`
- `src/pages/ClientsPage.tsx` — exporta `ClientsPage`

Se não existirem, pare e informe.

## Arquivos que você DEVE modificar
1. `src/components/BottomNavigation.tsx`
2. `src/pages/BarberDashboard.tsx`

## Arquivos que você NÃO pode modificar
Todos os outros.

---

## TAREFA 1: Atualizar BottomNavigation.tsx

Substitua o conteúdo COMPLETO de `src/components/BottomNavigation.tsx` por:

```tsx
import { motion } from 'motion/react';
import { LayoutDashboard, BarChart3, UserSearch } from 'lucide-react';
import { cn } from '../utils';

export type AdminTab = 'FILA' | 'METRICAS' | 'CLIENTES';

interface BottomNavigationProps {
  activeTab: AdminTab;
  onTabChange: (tab: AdminTab) => void;
}

export function BottomNavigation({ activeTab, onTabChange }: BottomNavigationProps) {
  const tabs = [
    { id: 'FILA', label: 'Fila', icon: LayoutDashboard },
    { id: 'METRICAS', label: 'Métricas', icon: BarChart3 },
    { id: 'CLIENTES', label: 'Clientes', icon: UserSearch },
  ] as const;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-[#0A0A0A]/80 backdrop-blur-xl border-t border-[#1E1E1E] px-6 py-4 z-50">
      <div className="max-w-md mx-auto flex items-center justify-between">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                'relative flex flex-col items-center gap-1 transition-all duration-300',
                isActive ? 'text-[#00D4A5]' : 'text-[#64748B] hover:text-[#F1F5F9]'
              )}
            >
              <Icon className={cn('h-6 w-6', isActive && 'animate-pulse')} />
              <span className="text-[10px] font-bold uppercase tracking-wider">
                {tab.label}
              </span>
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute -top-4 h-1 w-8 bg-[#00D4A5] rounded-full"
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
```

---

## TAREFA 2: Modificar BarberDashboard.tsx

O arquivo tem ~812 linhas. Faça as seguintes alterações CIRÚRGICAS (NÃO reescreva o arquivo inteiro):

### 2a. Adicionar imports (no topo, junto aos outros imports)

Adicione estas linhas de import:
```typescript
import { MetricsPage } from './MetricsPage';
import { ClientsPage } from './ClientsPage';
import { BottomNavigation, AdminTab } from '../components/BottomNavigation';
```

### 2b. Adicionar estado de tab

Logo após a linha que declara `const [userError, setUserError] = useState<string | null>(null);`, adicione:
```typescript
const [activeTab, setActiveTab] = useState<AdminTab>('FILA');
```

### 2c. Substituir o return principal

O return atual começa com:
```tsx
return (
  <div className="min-h-screen bg-[#0A0A0A] p-6 pb-24">
    <header className="mb-10 flex items-center justify-between">
```

E contém o `<main>`, as seções de conteúdo (métricas grid, atendimento atual, fila, agenda), e o `<Modal>` no final.

**Substitua o return por esta estrutura:**

```tsx
return (
  <div className="min-h-screen bg-[#0A0A0A]">
    {/* Header sticky — visível em todas as tabs */}
    <header className="sticky top-0 z-40 bg-[#0A0A0A]/95 backdrop-blur-sm border-b border-[#1E1E1E] px-6 py-4">
      <div className="max-w-4xl mx-auto flex items-center justify-between">
        <div className="space-y-0.5">
          <h1 className="text-xs font-bold uppercase tracking-[0.2em] text-[#00D4A5]">
            {activeTab === 'FILA' ? 'Painel do Barbeiro' : activeTab === 'METRICAS' ? 'Métricas' : 'Clientes'}
          </h1>
          <p className="text-lg font-bold tracking-tight text-[#F1F5F9]">
            {activeTab === 'FILA' ? `Olá, ${config?.BARBER_NAME}` : activeTab === 'METRICAS' ? 'Análise de desempenho' : 'Gerenciar clientes'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={openManageUsers} title="Gerenciar usuários">
            <UserPlus className="h-5 w-5 text-[#64748B]" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => { setTempConfig(config); setModalType('SETTINGS'); setIsModalOpen(true); }}>
            <Settings className="h-5 w-5 text-[#64748B]" />
          </Button>
          <Button variant="ghost" size="icon" onClick={signOut}>
            <UserMinus className="h-5 w-5 text-[#64748B]" />
          </Button>
        </div>
      </div>
    </header>

    {/* Conteúdo por tab */}
    <AnimatePresence mode="wait">
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.2 }}
      >
        {activeTab === 'FILA' && (
          <main className="p-6 pb-24 max-w-4xl mx-auto space-y-8">
            {/* ========== COLE AQUI TODO O CONTEÚDO EXISTENTE DO <main> ========== */}
            {/* Inclui: error banner, metrics grid, botão resetar config, debug info,
                seção atendimento atual, seção fila, seção controle agenda */}
            {/* NÃO inclua o header antigo nem o Modal — eles ficam fora */}
          </main>
        )}

        {activeTab === 'METRICAS' && config && (
          <MetricsPage config={config} />
        )}

        {activeTab === 'CLIENTES' && config && (
          <ClientsPage config={config} />
        )}
      </motion.div>
    </AnimatePresence>

    {/* Bottom Navigation */}
    <BottomNavigation activeTab={activeTab} onTabChange={setActiveTab} />

    {/* Modais existentes — mantidos fora das tabs (compartilhados) */}
    <Modal
      {/* ... todo o Modal existente fica aqui, inalterado ... */}
    </Modal>
  </div>
);
```

### Detalhamento da migração:

1. **Remova** o `<header>` antigo (o que tinha `className="mb-10 flex items-center justify-between"`)
2. **Remova** as tags `<main className="max-w-4xl mx-auto space-y-8">` e `</main>` antigas
3. **Mova** todo o conteúdo que estava dentro de `<main>` para dentro da `motion.div` da tab `FILA`:
   - Error banner (`{error && ...}`)
   - Metrics grid (`<div className="grid grid-cols-2 md:grid-cols-4 gap-4">`)
   - Botão "Resetar Configurações"
   - Debug info
   - Seção "Atendimento Atual"
   - Seção "Próximos na Fila"
   - Seção "Controle da Agenda"
4. **NÃO mova** o `<Modal>` — ele fica no nível do `<div>` raiz, FORA do `AnimatePresence`, para funcionar em qualquer tab
5. O `<div>` raiz perde o `p-6 pb-24` (o padding agora está dentro de cada tab)

### 2d. Remover o `<header>` antigo do conteúdo

O header antigo era aproximadamente:
```tsx
<header className="mb-10 flex items-center justify-between">
  <div className="space-y-1">
    <h1 className="text-sm font-bold uppercase tracking-[0.2em] text-[#00D4A5]">Painel do Barbeiro</h1>
    <p className="text-2xl font-bold tracking-tight text-[#F1F5F9]">Olá, {config?.BARBER_NAME}</p>
  </div>
  <div className="flex items-center gap-2">
    {/* botões de ação */}
  </div>
</header>
```

Este header foi substituído pelo novo header sticky. Remova-o.

---

## Verificação final

Após editar, leia AMBOS os arquivos e confirme:

1. **BottomNavigation.tsx**:
   - Exporta `AdminTab` type e `BottomNavigation` component
   - 3 tabs: FILA (LayoutDashboard), METRICAS (BarChart3), CLIENTES (UserSearch)
   - Spring animation no indicador ativo

2. **BarberDashboard.tsx**:
   - Importa MetricsPage, ClientsPage, BottomNavigation
   - Tem `activeTab` state
   - Header sticky com título dinâmico por tab
   - Tab FILA contém todo o conteúdo original do dashboard (métricas, fila, agenda)
   - Tab METRICAS renderiza `<MetricsPage config={config} />`
   - Tab CLIENTES renderiza `<ClientsPage config={config} />`
   - BottomNavigation renderizado antes do Modal
   - TODOS os modais (FINALIZE, ABSENT, OPEN_AGENDA, CLOSE_AGENDA, SETTINGS, MANAGE_USERS) continuam funcionando
   - TODOS os useEffects e handlers existentes estão intactos
   - Sem imports duplicados ou não utilizados
   - Auth guard (`!user` redirect e `!isAdmin` check) está antes do return principal
