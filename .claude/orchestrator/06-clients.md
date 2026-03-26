Você é um especialista em React + TypeScript + Tailwind CSS. Crie a tela de Clientes do SmartQueue — app de fila virtual para barbearia.

**ATENÇÃO:** Execute este prompt SOMENTE após o agente 04-foundation ter concluído. Os tipos `ClientWithInsights`, `ClientSegment`, `Attendance` e os métodos `ClientService.listAllIncludingInactive`, `ClientService.getClientHistory`, `ClientService.updateClient`, `ClientService.toggleActive`, `ClientService.enrichClients` devem existir.

## Arquivo a criar
`src/pages/ClientsPage.tsx`

## Arquivos que você NÃO pode modificar
Todos os outros. NÃO toque em App.tsx, BarberDashboard.tsx, BottomNavigation.tsx, services/*.

---

## Design System

### Cores
- bg página: `#0A0A0A` | card: `#111111` | surface: `#1A1A1A` | border: `#1E1E1E`
- texto: `#F1F5F9` | muted: `#64748B` | accent: `#00D4A5` | danger: `#EF4444` | warning: `#F59E0B`
- badge NEW: `#3B82F6` | badge REGULAR: `#64748B` | badge VIP: `#F59E0B` | badge AT_RISK: `#EF4444`

### Componentes disponíveis
```typescript
import { Card } from '../components/Card';
import { Button } from '../components/Button';      // variants: primary|secondary|danger|ghost|outline, sizes: sm|md|lg|icon, loading
import { Input } from '../components/Input';         // <Input label="..." value={} onChange={} />
import { Modal } from '../components/Modal';         // <Modal isOpen title footer onClose>children</Modal>
import { Skeleton } from '../components/Skeleton';   // <Skeleton variant="rect|text|circle" className="..." />
```

### Ícones (lucide-react)
```typescript
import { Search, Users, ChevronRight, Pencil, Cake, Phone, Calendar, Clock, Shield, ShieldOff, X } from 'lucide-react';
```

---

## Tipos (já existem em types/index.ts)

```typescript
type ClientSegment = 'ALL' | 'ACTIVE' | 'VIP' | 'AT_RISK';

interface Client {
  id: string; nome: string; telefone: string; dataNascimento?: string;
  totalVisitas: number; tempoMedio: number; dataCadastro: number; ativo: boolean;
}
interface Attendance {
  id: string; clienteId: string; clienteNome: string; servicos: string;
  data: string; horaInicio: number; horaFim: number;
  duracaoReal: number; duracaoEstimada: number; barbeiro: string; manual: boolean;
}
interface ClientWithInsights extends Client {
  lastVisitDate?: string; averageInterval?: number;
  segment: 'NEW' | 'REGULAR' | 'VIP' | 'AT_RISK';
  birthdayThisMonth: boolean; isAtRisk: boolean;
}
interface AppConfig { OPENING_TIME: string; CLOSING_TIME: string; /* ... */ }
```

## Serviços disponíveis
```typescript
import { ClientService } from '../services/ClientService';
import { AnalyticsService } from '../services/AnalyticsService';

ClientService.listAllIncludingInactive(): Promise<Client[]>
ClientService.getClientHistory(clientId: string, limit?: number): Promise<Attendance[]>
ClientService.updateClient(id: string, data: Partial<Pick<Client, 'nome' | 'telefone' | 'dataNascimento'>>): Promise<void>
ClientService.toggleActive(id: string, ativo: boolean): Promise<void>
ClientService.enrichClients(clients: Client[], allAttendances: Attendance[], today: string): ClientWithInsights[]

AnalyticsService.getHistoryForPeriod(days: number): Promise<Attendance[]>
```

---

## Implementação

### Props
```typescript
interface ClientsPageProps {
  config: AppConfig;
}
export function ClientsPage({ config }: ClientsPageProps) { ... }
```

### Estado
```typescript
const [clients, setClients] = useState<ClientWithInsights[]>([]);
const [loading, setLoading] = useState(true);
const [search, setSearch] = useState('');
const [filter, setFilter] = useState<ClientSegment>('ALL');

// Modal de detalhe
const [selectedClient, setSelectedClient] = useState<ClientWithInsights | null>(null);
const [clientHistory, setClientHistory] = useState<Attendance[]>([]);
const [historyLoading, setHistoryLoading] = useState(false);

// Modo edição
const [editMode, setEditMode] = useState(false);
const [editData, setEditData] = useState({ nome: '', telefone: '', dataNascimento: '' });
const [submitting, setSubmitting] = useState(false);
```

### Carregamento inicial
```typescript
useEffect(() => {
  async function load() {
    const [allClients, allHistory] = await Promise.all([
      ClientService.listAllIncludingInactive(),
      AnalyticsService.getHistoryForPeriod(90), // 90 dias para cálculo de at-risk
    ]);
    const today = new Date().toISOString().split('T')[0];
    const enriched = ClientService.enrichClients(allClients, allHistory, today);
    setClients(enriched);
    setLoading(false);
  }
  load();
}, []);
```

### Carregamento do histórico (ao abrir modal)
```typescript
useEffect(() => {
  if (!selectedClient) return;
  setHistoryLoading(true);
  setClientHistory([]);
  ClientService.getClientHistory(selectedClient.id)
    .then(setClientHistory)
    .finally(() => setHistoryLoading(false));
}, [selectedClient?.id]);
```

### Filtro e busca (useMemo)
```typescript
const filtered = useMemo(() => {
  return clients
    .filter(c => {
      if (filter === 'ACTIVE') return c.ativo;
      if (filter === 'VIP') return c.segment === 'VIP';
      if (filter === 'AT_RISK') return c.isAtRisk;
      return true; // ALL
    })
    .filter(c =>
      search === '' ||
      c.nome.toLowerCase().includes(search.toLowerCase()) ||
      c.telefone.includes(search)
    );
}, [clients, search, filter]);

const birthdayClients = useMemo(() => clients.filter(c => c.birthdayThisMonth), [clients]);
```

### Helpers
```typescript
function getAvatarColor(nome: string): string {
  const colors = ['#00D4A5', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444', '#EC4899'];
  return colors[nome.charCodeAt(0) % colors.length];
}

function getInitials(nome: string): string {
  return nome.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
}

function getSegmentBadge(segment: ClientWithInsights['segment']): { label: string; color: string } {
  switch (segment) {
    case 'NEW': return { label: 'Novo', color: '#3B82F6' };
    case 'REGULAR': return { label: 'Regular', color: '#64748B' };
    case 'VIP': return { label: 'VIP', color: '#F59E0B' };
    case 'AT_RISK': return { label: 'Em Risco', color: '#EF4444' };
  }
}

function maskPhone(tel: string): string {
  return tel.replace(/(\d{2})(\d{5})(\d{4})/, '($1) *****-$3');
}

function daysSince(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr + 'T12:00:00').getTime()) / 86400000);
}
```

### Handlers

**Abrir modal:**
```typescript
const openDetail = (client: ClientWithInsights) => {
  setSelectedClient(client);
  setEditMode(false);
  setEditData({ nome: client.nome, telefone: client.telefone, dataNascimento: client.dataNascimento || '' });
};
```

**Salvar edição:**
```typescript
const handleSave = async () => {
  if (!selectedClient) return;
  setSubmitting(true);
  try {
    await ClientService.updateClient(selectedClient.id, editData);
    setClients(prev => prev.map(c => c.id === selectedClient.id ? { ...c, ...editData } : c));
    setSelectedClient(prev => prev ? { ...prev, ...editData } : null);
    setEditMode(false);
  } finally {
    setSubmitting(false);
  }
};
```

**Toggle ativo:**
```typescript
const handleToggleActive = async () => {
  if (!selectedClient) return;
  setSubmitting(true);
  try {
    const newAtivo = !selectedClient.ativo;
    await ClientService.toggleActive(selectedClient.id, newAtivo);
    setClients(prev => prev.map(c => c.id === selectedClient.id ? { ...c, ativo: newAtivo } : c));
    setSelectedClient(prev => prev ? { ...prev, ativo: newAtivo } : null);
  } finally {
    setSubmitting(false);
  }
};
```

---

## Layout

### Container principal
```tsx
<div className="p-6 space-y-4 max-w-4xl mx-auto">
```

### 1. Header com busca
```tsx
<div className="space-y-3">
  <div className="flex items-center justify-between">
    <p className="text-sm text-[#64748B]">{filtered.length} clientes</p>
  </div>
  <div className="relative">
    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#64748B]" />
    <input
      type="text"
      placeholder="Buscar por nome ou telefone..."
      value={search}
      onChange={e => setSearch(e.target.value)}
      className="w-full h-11 pl-11 pr-4 rounded-xl border border-[#1E1E1E] bg-[#0A0A0A] text-sm text-[#F1F5F9] placeholder:text-[#64748B] focus:outline-none focus:border-[#00D4A5] transition-all"
    />
  </div>
</div>
```

### 2. Filtro por segmento (pills)
```tsx
<div className="flex gap-2 overflow-x-auto pb-1">
  {([['ALL', 'Todos'], ['ACTIVE', 'Ativos'], ['VIP', 'VIP'], ['AT_RISK', 'Em Risco']] as const).map(([key, label]) => (
    <button
      key={key}
      onClick={() => setFilter(key)}
      className={cn(
        'px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-colors whitespace-nowrap',
        filter === key
          ? 'bg-[#00D4A5] text-black'
          : 'bg-[#1A1A1A] text-[#64748B] hover:text-[#F1F5F9]'
      )}
    >
      {label}
    </button>
  ))}
</div>
```

Importar `cn` de `../utils`.

### 3. Banner de aniversário
```tsx
{birthdayClients.length > 0 && (
  <Card className="p-3 border-[#F59E0B]/20 bg-[#F59E0B]/5 flex items-center gap-3">
    <Cake className="h-5 w-5 text-[#F59E0B] shrink-0" />
    <p className="text-sm text-[#F1F5F9]">
      <span className="font-bold text-[#F59E0B]">{birthdayClients.length}</span> cliente{birthdayClients.length > 1 ? 's' : ''} faz{birthdayClients.length > 1 ? 'em' : ''} aniversário este mês
    </p>
  </Card>
)}
```

### 4. Lista de clientes
```tsx
<div className="space-y-2">
  {filtered.map(client => {
    const badge = getSegmentBadge(client.segment);
    const avatarColor = getAvatarColor(client.nome);
    return (
      <Card
        key={client.id}
        className={cn(
          'p-4 flex items-center gap-3 cursor-pointer hover:border-[#00D4A5]/30 transition-all',
          !client.ativo && 'opacity-50'
        )}
        onClick={() => openDetail(client)}
      >
        {/* Avatar */}
        <div
          className="h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
          style={{ backgroundColor: avatarColor + '15', color: avatarColor }}
        >
          {getInitials(client.nome)}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold text-[#F1F5F9] truncate">{client.nome}</p>
            <span
              className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider shrink-0"
              style={{ backgroundColor: badge.color + '15', color: badge.color }}
            >
              {badge.label}
            </span>
            {client.birthdayThisMonth && <Cake className="h-3 w-3 text-[#F59E0B] shrink-0" />}
          </div>
          <p className="text-xs text-[#64748B] mt-0.5">
            {client.totalVisitas} visitas · ~{Math.round(client.tempoMedio || 0)}m
            {client.lastVisitDate && ` · há ${daysSince(client.lastVisitDate)}d`}
          </p>
        </div>

        {/* Chevron */}
        <ChevronRight className="h-4 w-4 text-[#64748B] shrink-0" />
      </Card>
    );
  })}
</div>
```

### 5. Estado vazio
```tsx
{!loading && filtered.length === 0 && (
  <Card className="h-48 flex flex-col items-center justify-center text-center space-y-4 border-dashed">
    <div className="h-12 w-12 rounded-full bg-[#1A1A1A] flex items-center justify-center">
      <Users className="h-6 w-6 text-[#64748B]" />
    </div>
    <p className="text-[#64748B] font-medium">Nenhum cliente encontrado</p>
    {search && (
      <Button variant="ghost" size="sm" onClick={() => setSearch('')}>Limpar busca</Button>
    )}
  </Card>
)}
```

### 6. Loading state
```tsx
{loading && (
  <div className="space-y-2">
    {[1,2,3,4,5].map(i => (
      <Skeleton key={i} variant="rect" className="h-16 rounded-2xl" />
    ))}
  </div>
)}
```

---

## Modal de detalhe

```tsx
<Modal
  isOpen={!!selectedClient}
  onClose={() => { setSelectedClient(null); setEditMode(false); }}
  title={selectedClient?.nome || ''}
  className="max-w-lg"
  footer={
    editMode ? (
      <>
        <Button variant="ghost" onClick={() => setEditMode(false)}>Cancelar</Button>
        <Button onClick={handleSave} loading={submitting}>Salvar</Button>
      </>
    ) : undefined
  }
>
  {selectedClient && (
    <div className="space-y-6 max-h-[65vh] overflow-y-auto pr-1">
      {/* Cabeçalho com avatar e badge */}
      <div className="flex items-center gap-4">
        <div
          className="h-14 w-14 rounded-full flex items-center justify-center text-lg font-bold shrink-0"
          style={{
            backgroundColor: getAvatarColor(selectedClient.nome) + '15',
            color: getAvatarColor(selectedClient.nome),
          }}
        >
          {getInitials(selectedClient.nome)}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <p className="text-lg font-bold text-[#F1F5F9]">{selectedClient.nome}</p>
            <span
              className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider"
              style={{
                backgroundColor: getSegmentBadge(selectedClient.segment).color + '15',
                color: getSegmentBadge(selectedClient.segment).color,
              }}
            >
              {getSegmentBadge(selectedClient.segment).label}
            </span>
          </div>
          <p className="text-sm text-[#64748B]">{selectedClient.totalVisitas} visitas · ~{Math.round(selectedClient.tempoMedio || 0)}m médio</p>
        </div>
      </div>

      {/* Modo edição */}
      {editMode ? (
        <div className="space-y-4">
          <Input label="Nome" value={editData.nome} onChange={e => setEditData(p => ({ ...p, nome: e.target.value }))} />
          <Input label="Telefone" value={editData.telefone} onChange={e => setEditData(p => ({ ...p, telefone: e.target.value }))} />
          <Input label="Data de Nascimento" type="date" value={editData.dataNascimento} onChange={e => setEditData(p => ({ ...p, dataNascimento: e.target.value }))} />
        </div>
      ) : (
        <>
          {/* Informações */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-[#64748B]">
              <Phone className="h-4 w-4" />
              <span>{maskPhone(selectedClient.telefone)}</span>
            </div>
            {selectedClient.dataNascimento && (
              <div className="flex items-center gap-2 text-sm text-[#64748B]">
                <Cake className="h-4 w-4" />
                <span>{new Date(selectedClient.dataNascimento + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                {selectedClient.birthdayThisMonth && <span className="text-[#F59E0B] text-xs font-bold">Aniversário este mês!</span>}
              </div>
            )}
            <div className="flex items-center gap-2 text-sm text-[#64748B]">
              <Calendar className="h-4 w-4" />
              <span>Cadastro: {new Date(selectedClient.dataCadastro).toLocaleDateString('pt-BR')}</span>
            </div>
            {selectedClient.lastVisitDate && (
              <div className="flex items-center gap-2 text-sm text-[#64748B]">
                <Clock className="h-4 w-4" />
                <span>Última visita: {new Date(selectedClient.lastVisitDate + 'T12:00:00').toLocaleDateString('pt-BR')} (há {daysSince(selectedClient.lastVisitDate)} dias)</span>
              </div>
            )}
          </div>

          {/* Botões de ação */}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1" onClick={() => setEditMode(true)}>
              <Pencil className="mr-1.5 h-3.5 w-3.5" /> Editar
            </Button>
            <Button
              variant={selectedClient.ativo ? 'danger' : 'secondary'}
              size="sm"
              className="flex-1"
              onClick={handleToggleActive}
              loading={submitting}
            >
              {selectedClient.ativo ? <><ShieldOff className="mr-1.5 h-3.5 w-3.5" /> Desativar</> : <><Shield className="mr-1.5 h-3.5 w-3.5" /> Reativar</>}
            </Button>
          </div>

          {/* Histórico */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-widest text-[#64748B]">Histórico de Atendimentos</h4>
            {historyLoading ? (
              <div className="space-y-2">
                {[1,2,3].map(i => <Skeleton key={i} variant="rect" className="h-12 rounded-xl" />)}
              </div>
            ) : clientHistory.length > 0 ? (
              <div className="space-y-2">
                {clientHistory.map(a => (
                  <div key={a.id} className="p-3 rounded-xl bg-[#1A1A1A] border border-[#1E1E1E] space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-[#F1F5F9]">
                        {new Date(a.data + 'T12:00:00').toLocaleDateString('pt-BR')}
                      </p>
                      <p className="text-xs text-[#64748B]">
                        {a.duracaoReal}min <span className="text-[#64748B]/50">(est. {a.duracaoEstimada}min)</span>
                      </p>
                    </div>
                    <p className="text-xs text-[#00D4A5]">{a.servicos}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[#64748B] text-center py-4">Nenhum atendimento registrado</p>
            )}
          </div>
        </>
      )}
    </div>
  )}
</Modal>
```

---

## Verificação final

1. O componente exporta `ClientsPage` como named export
2. Todos os imports apontam para arquivos existentes
3. Busca e filtro funcionam via `useMemo` (sem re-renders desnecessários)
4. Modal carrega histórico ao abrir (`useEffect` com `selectedClient?.id`)
5. Edição atualiza lista local imediatamente (otimistic update)
6. Toggle ativar/desativar usa `variant="danger"` para desativar
7. Banner de aniversário só aparece se houver clientes aniversariantes
8. Todos os textos em português brasileiro
9. Design segue o dark theme rigorosamente
