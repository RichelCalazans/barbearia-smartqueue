import { useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import {
  Users,
  Timer,
  TrendingUp,
  TrendingDown,
  ArrowUp,
  ArrowDown,
  Minus,
  AlertTriangle,
} from 'lucide-react';
import { Card } from '../components/Card';
import { Skeleton } from '../components/Skeleton';
import { AnalyticsService } from '../services/AnalyticsService';
import {
  MetricsPeriod,
  PeriodMetrics,
  DailyCount,
  HourDistribution,
  ServicePopularity,
  ClientWithInsights,
  AppConfig,
} from '../types';

interface MetricsPageProps {
  config: AppConfig;
}

function DeltaBadge({ value }: { value: number }) {
  if (value === 0) {
    return (
      <span className="text-[10px] text-[#64748B] flex items-center gap-0.5">
        <Minus className="h-3 w-3" />
        sem dados
      </span>
    );
  }
  const isPositive = value > 0;
  return (
    <span
      className={`text-[10px] font-bold flex items-center gap-0.5 ${
        isPositive ? 'text-brand' : 'text-[#EF4444]'
      }`}
    >
      {isPositive ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
      {isPositive ? '+' : ''}
      {value}%
    </span>
  );
}

function BarChart({ data }: { data: DailyCount[] }) {
  const maxCount = Math.max(...data.map((d) => d.count), 1);
  const chartHeight = 120;
  const labelHeight = 20;

  return (
    <svg
      viewBox={`0 0 ${data.length * 40} ${chartHeight + labelHeight}`}
      className="w-full h-40"
      preserveAspectRatio="none"
    >
      {data.map((d, i) => {
        const barH = (d.count / maxCount) * chartHeight;
        const x = i * 40 + 8;
        const dayLabel = new Date(d.date + 'T12:00:00').toLocaleDateString('pt-BR', {
          weekday: 'short',
        }).slice(0, 3);
        const isMax = d.count === maxCount && d.count > 0;
        return (
          <g key={d.date}>
            <rect
              x={x}
              y={chartHeight - barH}
              width={24}
              height={Math.max(barH, 2)}
              rx={4}
              fill={isMax ? 'var(--color-primary)' : d.count > 0 ? 'var(--color-primary)' : '#1E1E1E'}
              opacity={isMax ? 1 : 0.6}
            />
            {d.count > 0 && (
              <text
                x={x + 12}
                y={chartHeight - barH - 4}
                textAnchor="middle"
                fill="#64748B"
                fontSize="10"
                fontWeight="600"
              >
                {d.count}
              </text>
            )}
            <text
              x={x + 12}
              y={chartHeight + 14}
              textAnchor="middle"
              fill="#64748B"
              fontSize="9"
              fontFamily="inherit"
            >
              {dayLabel}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function PeakHours({ data }: { data: HourDistribution[] }) {
  const maxCount = Math.max(...data.map((d) => d.count), 1);
  const filtered = data.filter((d) => d.count > 0);

  return (
    <Card className="p-4 space-y-3">
      {filtered.map((d) => {
        const isPeak = d.count === maxCount;
        return (
          <div key={d.hour} className="flex items-center gap-3">
            <span className="text-xs font-bold text-[#64748B] w-10 shrink-0">
              {String(d.hour).padStart(2, '0')}h
            </span>
            <div className="flex-1 bg-[#1A1A1A] rounded-full h-2 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${(d.count / maxCount) * 100}%`,
                  backgroundColor: isPeak ? '#F59E0B' : 'var(--color-primary)',
                }}
              />
            </div>
            <span
              className={`text-xs font-bold w-6 text-right ${
                isPeak ? 'text-[#F59E0B]' : 'text-[#F1F5F9]'
              }`}
            >
              {d.count}
            </span>
          </div>
        );
      })}
      {filtered.length === 0 && (
        <p className="text-sm text-[#64748B] text-center py-4">Sem dados no período</p>
      )}
    </Card>
  );
}

export function MetricsPage({ config }: MetricsPageProps) {
  const [period, setPeriod] = useState<MetricsPeriod>('7dias');
  const [metrics, setMetrics] = useState<PeriodMetrics | null>(null);
  const [atRiskClients, setAtRiskClients] = useState<ClientWithInsights[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    AnalyticsService.getPeriodMetrics(period, config)
      .then(setMetrics)
      .finally(() => setLoading(false));
  }, [period, config]);

  useEffect(() => {
    AnalyticsService.getAtRiskClients().then(setAtRiskClients);
  }, []);

  const days = period === 'hoje' ? 1 : period === '7dias' ? 7 : 30;
  const dailyCounts = useMemo(
    () =>
      metrics
        ? AnalyticsService.computeDailyCounts(metrics.attendances, days)
        : [],
    [metrics, days]
  );
  const hourDistribution = useMemo(
    () =>
      metrics
        ? AnalyticsService.computeHourDistribution(metrics.attendances)
        : [],
    [metrics]
  );
  const servicePopularity = useMemo(
    () =>
      metrics
        ? AnalyticsService.computeServicePopularity(metrics.attendances)
        : [],
    [metrics]
  );
  const topClients = useMemo(
    () =>
      metrics
        ? AnalyticsService.getTopClientsFromAttendances(metrics.attendances, 5)
        : [],
    [metrics]
  );

  const periodLabels: Record<MetricsPeriod, string> = {
    hoje: 'Hoje',
    '7dias': '7 dias',
    '30dias': '30 dias',
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-5 pb-[calc(env(safe-area-inset-bottom)+5.5rem)] sm:px-6 sm:py-6 sm:pb-24">
      <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
        {(['hoje', '7dias', '30dias'] as MetricsPeriod[]).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`min-h-10 whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-colors cursor-pointer ${
              period === p
                ? 'bg-brand text-black font-bold'
                : 'bg-[#1A1A1A] text-[#64748B]'
            }`}
          >
            {periodLabels[p]}
          </button>
        ))}
      </div>

      {loading && !metrics ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i}>
                <Skeleton variant="rect" className="h-24 rounded-2xl" />
              </div>
            ))}
          </div>
          <Skeleton variant="rect" className="h-40 rounded-2xl" />
          <Skeleton variant="rect" className="h-32 rounded-2xl" />
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="grid grid-cols-2 gap-3">
            <Card className="p-4 space-y-1">
              <Users className="h-4 w-4 text-[#64748B]" />
              <p className="text-2xl font-bold text-[#F1F5F9]">
                {metrics?.totalAttended ?? 0}
              </p>
              <p className="text-[10px] font-medium text-[#64748B] uppercase tracking-wider">
                ATENDIDOS
              </p>
              <DeltaBadge value={metrics?.deltas.totalAttended ?? 0} />
            </Card>

            <Card className="p-4 space-y-1">
              <Timer className="h-4 w-4 text-[#64748B]" />
              <p className="text-2xl font-bold text-[#F1F5F9]">
                {metrics?.averageTime ? `${Math.round(metrics.averageTime)}m` : '0m'}
              </p>
              <p className="text-[10px] font-medium text-[#64748B] uppercase tracking-wider">
                TEMPO MÉDIO
              </p>
              <DeltaBadge value={metrics?.deltas.averageTime ?? 0} />
            </Card>

            <Card className="p-4 space-y-1">
              <TrendingUp className="h-4 w-4 text-[#64748B]" />
              <p className="text-2xl font-bold text-[#F1F5F9]">
                {metrics?.retentionRate ?? 0}%
              </p>
              <p className="text-[10px] font-medium text-[#64748B] uppercase tracking-wider">
                RETORNO
              </p>
              <DeltaBadge value={metrics?.deltas.retentionRate ?? 0} />
            </Card>

            <Card className="p-4 space-y-1">
              <TrendingDown className="h-4 w-4 text-[#64748B]" />
              <p className="text-2xl font-bold text-[#F1F5F9]">
                {metrics?.noShowRate ?? 0}%
              </p>
              <p className="text-[10px] font-medium text-[#64748B] uppercase tracking-wider">
                NO-SHOW
              </p>
              <DeltaBadge value={metrics ? -metrics.deltas.noShowRate : 0} />
            </Card>
          </div>

          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-[#64748B] ml-1 mb-3">
              Atendimentos por Dia
            </h3>
            <Card className="p-4">
              <BarChart data={dailyCounts} />
            </Card>
          </div>

          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-[#64748B] ml-1 mb-3">
              Horários de Pico
            </h3>
            <PeakHours data={hourDistribution} />
          </div>

          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-[#64748B] ml-1 mb-3">
              Serviços Populares
            </h3>
            <Card className="p-4 space-y-3">
              {servicePopularity.map((s) => (
                <div key={s.name} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-[#F1F5F9]">{s.name}</span>
                    <span className="text-xs font-bold text-[#64748B]">{s.count}x</span>
                  </div>
                  <div className="bg-[#1A1A1A] rounded-full h-1.5 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-brand transition-all duration-500"
                      style={{ width: `${s.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
              {servicePopularity.length === 0 && (
                <p className="text-sm text-[#64748B] text-center py-4">
                  Sem dados no período
                </p>
              )}
            </Card>
          </div>

          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-[#64748B] ml-1 mb-3">
              Top 5 Clientes Fiéis
            </h3>
            <Card className="p-4 space-y-3">
              {topClients.map((c, i) => {
                const medalColors = ['#F59E0B', '#94A3B8', '#CD7C2F'];
                const color = i < 3 ? medalColors[i] : '#64748B';
                const initials = c.clienteNome
                  .split(' ')
                  .slice(0, 2)
                  .map((n) => n[0])
                  .join('')
                  .toUpperCase();
                return (
                  <div key={c.clienteId} className="flex items-center gap-3">
                    <span className="text-sm font-bold w-5 text-center" style={{ color }}>
                      {i + 1}º
                    </span>
                    <div
                      className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold"
                      style={{ backgroundColor: color + '20', color }}
                    >
                      {initials}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-[#F1F5F9]">{c.clienteNome}</p>
                    </div>
                    <span className="text-xs font-bold text-brand">{c.count}x</span>
                  </div>
                );
              })}
            </Card>
          </div>

          {atRiskClients.length > 0 && (
            <>
              <h3 className="text-xs font-bold uppercase tracking-widest text-[#EF4444] ml-1 mt-6">
                Em Risco ({atRiskClients.length})
              </h3>
              <Card className="p-4 space-y-3 border-[#EF4444]/20">
                {atRiskClients.slice(0, 5).map((c) => {
                  const daysSince = c.lastVisitDate
                    ? Math.floor(
                        (Date.now() -
                          new Date(c.lastVisitDate + 'T12:00:00').getTime()) /
                          86400000
                      )
                    : null;
                  const initials = c.nome
                    .split(' ')
                    .slice(0, 2)
                    .map((n) => n[0])
                    .join('')
                    .toUpperCase();
                  return (
                    <div key={c.id} className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-[#EF4444]/10 flex items-center justify-center">
                        <AlertTriangle className="h-4 w-4 text-[#EF4444]" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-[#F1F5F9]">{c.nome}</p>
                        <p className="text-[10px] text-[#EF4444]">
                          {daysSince !== null
                            ? `Última visita há ${daysSince} dias`
                            : 'Nunca visitou'}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </Card>
            </>
          )}
        </motion.div>
      )}
    </div>
  );
}
