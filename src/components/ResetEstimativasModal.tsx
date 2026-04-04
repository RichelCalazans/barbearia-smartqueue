import React, { useState, useEffect } from 'react';
import { RotateCcw, AlertTriangle, Search } from 'lucide-react';
import { Button } from './Button';
import { ClientService } from '../services/ClientService';
import { ConfigService } from '../services/ConfigService';
import { AppConfig, Client } from '../types';

interface Props {
  config: AppConfig;
}

export function ResetEstimativasModal({ config }: Props) {
  const [ewmaAlpha, setEwmaAlpha] = useState(config.EWMA_ALPHA ?? 0.3);
  const [savingAlpha, setSavingAlpha] = useState(false);
  const [savedAlpha, setSavedAlpha] = useState(false);

  const [globalConfirm, setGlobalConfirm] = useState(false);
  const [resettingAll, setResettingAll] = useState(false);
  const [resetAllResult, setResetAllResult] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [allClients, setAllClients] = useState<Client[]>([]);
  const [loadingClients, setLoadingClients] = useState(true);
  const [resetedIds, setResetedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    ClientService.listAllIncludingInactive().then(clients => {
      setAllClients(clients);
      setLoadingClients(false);
    });
  }, []);

  const searchResults = search.trim()
    ? allClients.filter(c =>
        c.nome?.toLowerCase().includes(search.toLowerCase()) ||
        c.telefone?.includes(search)
      ).slice(0, 20)
    : [];

  const handleSaveAlpha = async () => {
    setSavingAlpha(true);
    await ConfigService.updateConfig({ ...config, EWMA_ALPHA: ewmaAlpha });
    setSavingAlpha(false);
    setSavedAlpha(true);
    setTimeout(() => setSavedAlpha(false), 2000);
  };

  const handleResetAll = async () => {
    setResettingAll(true);
    setResetAllResult(null);
    try {
      const count = await ClientService.resetTempoMedioAll();
      setResetAllResult(`${count} cliente${count !== 1 ? 's' : ''} atualizado${count !== 1 ? 's' : ''} com sucesso.`);
      setGlobalConfirm(false);
    } catch {
      setResetAllResult('Erro ao resetar. Tente novamente.');
    } finally {
      setResettingAll(false);
    }
  };

  const handleResetOne = async (client: Client) => {
    await ClientService.resetTempoMedioById(client.id);
    setResetedIds(prev => new Set(prev).add(client.id));
    setSearchResults(prev => prev.map(c => c.id === client.id ? { ...c, tempoMedio: 0 } : c));
  };

  return (
    <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-1">

      {/* Seção 1: Sensibilidade EWMA */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold uppercase tracking-widest text-[#64748B]">Sensibilidade das Estimativas (α)</h3>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#64748B]">Reage devagar</span>
            <span className="text-sm font-bold text-brand tabular-nums">{ewmaAlpha.toFixed(2)}</span>
            <span className="text-xs text-[#64748B]">Reage rápido</span>
          </div>
          <input
            type="range"
            min={0.05}
            max={0.95}
            step={0.05}
            value={ewmaAlpha}
            onChange={e => setEwmaAlpha(parseFloat(e.target.value))}
            className="w-full accent-brand"
          />
          <p className="text-xs text-[#64748B]">
            Valor atual: <span className="font-mono text-[#F1F5F9]">{ewmaAlpha.toFixed(2)}</span>
            {ewmaAlpha !== config.EWMA_ALPHA && <span className="text-[#F59E0B] ml-2">(não salvo)</span>}
          </p>
        </div>
        <Button
          onClick={handleSaveAlpha}
          loading={savingAlpha}
          disabled={ewmaAlpha === config.EWMA_ALPHA}
          className="w-full"
        >
          {savedAlpha ? 'Salvo!' : 'Salvar Sensibilidade'}
        </Button>
      </div>

      <div className="border-t border-[#1E1E1E]" />

      {/* Seção 2: Reset global */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold uppercase tracking-widest text-[#64748B]">Resetar Todos os Clientes</h3>
        <div className="p-3 rounded-xl bg-[#F59E0B]/10 border border-[#F59E0B]/20 flex items-start gap-3">
          <AlertTriangle className="h-4 w-4 text-[#F59E0B] shrink-0 mt-0.5" />
          <p className="text-xs text-[#F59E0B]">
            Isso zerará o histórico de tempo de <strong>todos os clientes</strong>. Eles voltarão ao tempo padrão de cada serviço até acumularem novos atendimentos.
          </p>
        </div>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={globalConfirm}
            onChange={e => setGlobalConfirm(e.target.checked)}
            className="accent-[#EF4444] w-4 h-4"
          />
          <span className="text-sm text-[#F1F5F9]">Entendo que isso afeta todos os clientes</span>
        </label>
        {resetAllResult && (
          <p className="text-sm text-brand">{resetAllResult}</p>
        )}
        <Button
          variant="danger"
          onClick={handleResetAll}
          loading={resettingAll}
          disabled={!globalConfirm}
          className="w-full"
        >
          <RotateCcw className="mr-2 h-4 w-4" /> Resetar Todos
        </Button>
      </div>

      <div className="border-t border-[#1E1E1E]" />

      {/* Seção 3: Reset individual */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold uppercase tracking-widest text-[#64748B]">Resetar Cliente Específico</h3>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#64748B]" />
          <input
            type="text"
            placeholder="Buscar por nome ou telefone..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full h-11 pl-9 pr-4 rounded-xl border border-[#1E1E1E] bg-[#0A0A0A] text-[#F1F5F9] placeholder:text-[#64748B] text-sm focus:outline-none focus:border-brand transition-all"
          />
        </div>

        {loadingClients && (
          <p className="text-xs text-[#64748B] text-center py-2">Carregando clientes...</p>
        )}

        {!loadingClients && searchResults.length > 0 && (
          <div className="space-y-2">
            {searchResults.map(client => {
              const reseted = resetedIds.has(client.id);
              return (
                <div key={client.id} className="flex items-center justify-between p-3 rounded-xl bg-[#111111] border border-[#1E1E1E]">
                  <div>
                    <p className="text-sm font-medium text-[#F1F5F9]">{client.nome}</p>
                    <p className="text-xs text-[#64748B]">{client.telefone}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-[#64748B]">
                      {client.tempoMedio > 0 ? `~${client.tempoMedio}min` : 'Padrão'}
                    </span>
                    <button
                      onClick={() => handleResetOne(client)}
                      disabled={reseted || client.tempoMedio === 0}
                      title="Resetar estimativa"
                      className="p-1.5 rounded-lg hover:bg-[#EF4444]/10 text-[#64748B] hover:text-[#EF4444] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!loadingClients && search.trim() && searchResults.length === 0 && (
          <p className="text-xs text-[#64748B] text-center py-2">Nenhum cliente encontrado.</p>
        )}
      </div>
    </div>
  );
}
