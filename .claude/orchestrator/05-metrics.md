Você é um especialista em React + TypeScript + Tailwind CSS. Crie a tela de Métricas do SmartQueue — app de fila virtual para barbearia.

**ATENÇÃO:** Execute este prompt SOMENTE após o agente 04-foundation ter concluído. Os tipos `PeriodMetrics`, `DailyCount`, `HourDistribution`, `ServicePopularity`, `ClientWithInsights`, `MetricsPeriod` e os métodos `getPeriodMetrics`, `computeDailyCounts`, `computeHourDistribution`, `computeServicePopularity`, `getTopClientsFromAttendances`, `getAtRiskClients` devem existir.

## Arquivo a criar
`src/pages/MetricsPage.tsx`

## Arquivos que você NÃO pode modificar
Todos os outros. NÃO toque em App.tsx, BarberDashboard.tsx, BottomNavigation.tsx, services/*.

---

## Design System (seguir rigorosamente)

### Cores
- bg página: `#0A0A0A` | card: `#111111` | surface: `#1A1A1A` | border: `#1E1E1E`
- texto: `#F1F5F9` | muted: `#64748B` | accent: `#00D4A5` | danger: `#EF4444` | warning: `#F59E0B`

### Tipografia
- Section header: `text-xs font-bold uppercase tracking-widest text-[#64748B] ml-1`
- KPI value: `text-2xl font-bold text-[#F1F5F9]`
- KPI label: `text-xs font-medium text-[#64748B] uppercase`
- Delta positivo: `text-[#00D4A5] text-xs font-bold`
- Delta negativo: `text-[#EF4444] text-xs font-bold`

### Componentes disponíveis
```typescript
import { Card } from '../components/Card';        // <Card className="...">children</Card>
import { Skeleton } from '../components/Skeleton'; // <Skeleton variant="rect" className="h-32" />
import { ScissorsLoading } from '../components/ScissorsLoading';
```

### Ícones (lucide-react)
```typescript
import { Users, Timer, TrendingUp, TrendingDown, UserX, ArrowUp, ArrowDown, Minus, Crown, AlertTriangle } from 'lucide-react';
```

### Animações
```typescript
import { motion } from 'motion/react';
// Transição suave: initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
```

---

## Tipos (já existem em types/index.ts)

```typescript
type MetricsPeriod = 'hoje' | '7dias' | '30dias';

interface PeriodMetrics {
  totalAttended: number;
  averageTime: number;
  retentionRate: number;
  noShowRate: number;
  chairUtilization: number;
  attendances: Attendance[];
  deltas: { totalAttended: number; averageTime: number; retentionRate: number; noShowRate: number };
}
interface DailyCount { date: string; count: number; }
interface HourDistribution { hour: number; count: number; }
interface ServicePopularity { name: string; count: number; percentage: number; }
interface ClientWithInsights extends Client {
  lastVisitDate?: string; averageInterval?: number;
  segment: 'NEW' | 'REGULAR' | 'VIP' | 'AT_RISK';
  birthdayThisMonth: boolean; isAtRisk: boolean;
}
interface AppConfig {
  OPENING_TIME: string; CLOSING_TIME: string; BARBER_NAME: string;
  SHOP_NAME: string; /* ... outros campos */
}
```

## Serviços disponíveis (importar de ../services/AnalyticsService)
```typescript
AnalyticsService.getPeriodMetrics(period: MetricsPeriod, config: AppConfig): Promise<PeriodMetrics>
AnalyticsService.computeDailyCounts(attendances: Attendance[], days: number): DailyCount[]
AnalyticsService.computeHourDistribution(attendances: Attendance[]): HourDistribution[]
AnalyticsService.computeServicePopularity(attendances: Attendance[]): ServicePopularity[]
AnalyticsService.getTopClientsFromAttendances(attendances: Attendance[], limit: number): Array<{clienteId: string; clienteNome: string; count: number}>
AnalyticsService.getAtRiskClients(): Promise<ClientWithInsights[]>
```

---

## Implementação

### Props
```typescript
interface MetricsPageProps {
  config: AppConfig;
}
export function MetricsPage({ config }: MetricsPageProps) { ... }
```

### Estado
```typescript
const [period, setPeriod] = useState<MetricsPeriod>('7dias');
const [metrics, setMetrics] = useState<PeriodMetrics | null>(null);
const [atRiskClients, setAtRiskClients] = useState<ClientWithInsights[]>([]);
const [loading, setLoading] = useState(true);
```

### Data fetching
```typescript
useEffect(() => {
  setLoading(true);
  AnalyticsService.getPeriodMetrics(period, config)
    .then(setMetrics)
    .finally(() => setLoading(false));
}, [period, config]);

useEffect(() => {
  AnalyticsService.getAtRiskClients().then(setAtRiskClients);
}, []);
```

### Dados derivados (useMemo)
```typescript
const days = period === 'hoje' ? 1 : period === '7dias' ? 7 : 30;
const dailyCounts = useMemo(() => metrics ? AnalyticsService.computeDailyCounts(metrics.attendances, days) : [], [metrics, days]);
const hourDistribution = useMemo(() => metrics ? AnalyticsService.computeHourDistribution(metrics.attendances) : [], [metrics]);
const servicePopularity = useMemo(() => metrics ? AnalyticsService.computeServicePopularity(metrics.attendances) : [], [metrics]);
const topClients = useMemo(() => metrics ? AnalyticsService.getTopClientsFromAttendances(metrics.attendances, 5) : [], [metrics]);
```

---

## Layout (ordem vertical)

### 1. Filtro de período
```
[Hoje] [7 dias] [30 dias]
```
Pill tabs horizontais. Tab ativa: `bg-[#00D4A5] text-black font-bold`. Inativa: `bg-[#1A1A1A] text-[#64748B]`.
Container: `flex gap-2 mb-6`
Cada pill: `px-4 py-2 rounded-full text-sm font-medium transition-colors cursor-pointer`

### 2. KPI Cards (grid 2x2)
```
┌─────────────┐  ┌─────────────┐
│ 👥 23       │  │ ⏱️ 28m      │
│ ATENDIDOS   │  │ TEMPO MÉDIO │
│ ↑ +15%      │  │ ↓ -5%       │
└─────────────┘  └─────────────┘
┌─────────────┐  ┌─────────────┐
│ 📈 72%      │  │ ❌ 3%       │
│ RETORNO     │  │ NO-SHOW     │
└─────────────┘  └─────────────┘
```

Grid: `grid grid-cols-2 gap-3`

Cada card usa `<Card className="p-4 space-y-1">`:
- Ícone: `h-4 w-4 text-[#64748B]` (linha 1)
- Valor: `text-2xl font-bold text-[#F1F5F9]` (linha 2)
- Label: `text-[10px] font-medium text-[#64748B] uppercase tracking-wider` (linha 3)
- Delta: (linha 4)
  ```tsx
  function DeltaBadge({ value }: { value: number }) {
    if (value === 0) return <span className="text-[10px] text-[#64748B] flex items-center gap-0.5"><Minus className="h-3 w-3" />sem dados</span>;
    const isPositive = value > 0;
    return (
      <span className={`text-[10px] font-bold flex items-center gap-0.5 ${isPositive ? 'text-[#00D4A5]' : 'text-[#EF4444]'}`}>
        {isPositive ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
        {isPositive ? '+' : ''}{value}%
      </span>
    );
  }
  ```

**NOTA:** Para No-Show, o delta é INVERTIDO (menos no-show = bom = verde):
```tsx
<DeltaBadge value={-metrics.deltas.noShowRate} />
```

### 3. Gráfico: Atendimentos por Dia

Section header: `text-xs font-bold uppercase tracking-widest text-[#64748B] ml-1 mb-3`
Título: "Atendimentos por Dia"

**Implementar como SVG puro** dentro de um `<Card>`:

```tsx
function BarChart({ data }: { data: DailyCount[] }) {
  const maxCount = Math.max(...data.map(d => d.count), 1);
  const barWidth = 100 / data.length; // porcentagem
  const chartHeight = 120;
  const labelHeight = 20;

  return (
    <svg viewBox={`0 0 ${data.length * 40} ${chartHeight + labelHeight}`} className="w-full h-40" preserveAspectRatio="none">
      {data.map((d, i) => {
        const barH = (d.count / maxCount) * chartHeight;
        const x = i * 40 + 8;
        const dayLabel = new Date(d.date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short' }).slice(0, 3);
        const isMax = d.count === maxCount && d.count > 0;
        return (
          <g key={d.date}>
            <rect
              x={x} y={chartHeight - barH} width={24} height={Math.max(barH, 2)}
              rx={4} fill={isMax ? '#00D4A5' : d.count > 0 ? '#00D4A5' : '#1E1E1E'}
              opacity={isMax ? 1 : 0.6}
            />
            {d.count > 0 && (
              <text x={x + 12} y={chartHeight - barH - 4} textAnchor="middle" fill="#64748B" fontSize="10" fontWeight="600">
                {d.count}
              </text>
            )}
            <text x={x + 12} y={chartHeight + 14} textAnchor="middle" fill="#64748B" fontSize="9" fontFamily="inherit">
              {dayLabel}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
```

Para "Hoje": mostrar 1 barra centralizada.
Para 7/30 dias: mostrar todas as barras.

### 4. Gráfico: Horários de Pico

Título: "Horários de Pico"

**Barras horizontais com CSS** (NÃO SVG):

```tsx
function PeakHours({ data }: { data: HourDistribution[] }) {
  const maxCount = Math.max(...data.map(d => d.count), 1);
  // Filtrar apenas horários com pelo menos 1 atendimento
  const filtered = data.filter(d => d.count > 0);

  return (
    <Card className="p-4 space-y-3">
      {filtered.map(d => {
        const isPeak = d.count === maxCount;
        return (
          <div key={d.hour} className="flex items-center gap-3">
            <span className="text-xs font-bold text-[#64748B] w-10 shrink-0">{String(d.hour).padStart(2, '0')}h</span>
            <div className="flex-1 bg-[#1A1A1A] rounded-full h-2 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${(d.count / maxCount) * 100}%`,
                  backgroundColor: isPeak ? '#F59E0B' : '#00D4A5',
                }}
              />
            </div>
            <span className={`text-xs font-bold w-6 text-right ${isPeak ? 'text-[#F59E0B]' : 'text-[#F1F5F9]'}`}>{d.count}</span>
          </div>
        );
      })}
      {filtered.length === 0 && <p className="text-sm text-[#64748B] text-center py-4">Sem dados no período</p>}
    </Card>
  );
}
```

### 5. Serviços Populares

Título: "Serviços Populares"

```tsx
<Card className="p-4 space-y-3">
  {servicePopularity.map((s, i) => (
    <div key={s.name} className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-[#F1F5F9]">{s.name}</span>
        <span className="text-xs font-bold text-[#64748B]">{s.count}x</span>
      </div>
      <div className="bg-[#1A1A1A] rounded-full h-1.5 overflow-hidden">
        <div
          className="h-full rounded-full bg-[#00D4A5] transition-all duration-500"
          style={{ width: `${s.percentage}%` }}
        />
      </div>
    </div>
  ))}
  {servicePopularity.length === 0 && <p className="text-sm text-[#64748B] text-center py-4">Sem dados no período</p>}
</Card>
```

### 6. Top Clientes e Em Risco (2 seções)

**Top 5 Clientes Fiéis:**

```tsx
<Card className="p-4 space-y-3">
  {topClients.map((c, i) => {
    const medalColors = ['#F59E0B', '#94A3B8', '#CD7C2F']; // ouro, prata, bronze
    const color = i < 3 ? medalColors[i] : '#64748B';
    const initials = c.clienteNome.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
    return (
      <div key={c.clienteId} className="flex items-center gap-3">
        <span className="text-sm font-bold w-5 text-center" style={{ color }}>{i + 1}º</span>
        <div className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold" style={{ backgroundColor: color + '20', color }}>
          {initials}
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-[#F1F5F9]">{c.clienteNome}</p>
        </div>
        <span className="text-xs font-bold text-[#00D4A5]">{c.count}x</span>
      </div>
    );
  })}
</Card>
```

**Clientes Em Risco:**

```tsx
{atRiskClients.length > 0 && (
  <>
    <h3 className="text-xs font-bold uppercase tracking-widest text-[#EF4444] ml-1 mt-6">Em Risco ({atRiskClients.length})</h3>
    <Card className="p-4 space-y-3 border-[#EF4444]/20">
      {atRiskClients.slice(0, 5).map(c => {
        const daysSince = c.lastVisitDate
          ? Math.floor((Date.now() - new Date(c.lastVisitDate + 'T12:00:00').getTime()) / (86400000))
          : null;
        const initials = c.nome.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
        return (
          <div key={c.id} className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-[#EF4444]/10 flex items-center justify-center">
              <AlertTriangle className="h-4 w-4 text-[#EF4444]" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-[#F1F5F9]">{c.nome}</p>
              <p className="text-[10px] text-[#EF4444]">
                {daysSince !== null ? `Última visita há ${daysSince} dias` : 'Nunca visitou'}
              </p>
            </div>
          </div>
        );
      })}
    </Card>
  </>
)}
```

### Loading state
Se `loading && !metrics`:
```tsx
<div className="space-y-4">
  <div className="grid grid-cols-2 gap-3">
    {[1,2,3,4].map(i => <Skeleton key={i} variant="rect" className="h-24 rounded-2xl" />)}
  </div>
  <Skeleton variant="rect" className="h-40 rounded-2xl" />
  <Skeleton variant="rect" className="h-32 rounded-2xl" />
</div>
```

### Container principal
```tsx
<div className="p-6 space-y-6 max-w-4xl mx-auto">
  {/* Period filter */}
  {/* Loading ou conteúdo */}
</div>
```

---

## Verificação final

1. O componente exporta `MetricsPage` como named export
2. Todos os imports apontam para arquivos existentes
3. Não há dependências externas (sem recharts, chart.js, etc.)
4. Gráficos usam SVG puro e CSS puro
5. Todos os textos estão em português brasileiro
6. O design segue o dark theme consistentemente
7. `useMemo` é usado para todos os cálculos derivados
