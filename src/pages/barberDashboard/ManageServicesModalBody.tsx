import type React from 'react';
import { AlertCircle, Clock, Pencil, Plus, Trash2 } from 'lucide-react';
import { Button } from '../../components/Button';
import type { Service } from '../../types';
import { cn } from '../../utils';
import type { ServiceForm } from './types';

interface ManageServicesModalBodyProps {
  services: Service[];
  serviceError: string | null;
  editingService: Service | null;
  showAddServiceForm: boolean;
  newService: ServiceForm;
  submitting: boolean;
  onEditingServiceChange: React.Dispatch<React.SetStateAction<Service | null>>;
  onNewServiceChange: React.Dispatch<React.SetStateAction<ServiceForm>>;
  onCancelEditService: () => void;
  onCancelAddService: () => void;
  onAddService: () => void | Promise<void>;
  onUpdateService: () => void | Promise<void>;
  onToggleServiceActive: (service: Service) => void | Promise<void>;
  onDeleteService: (id: string) => void | Promise<void>;
  onStartAddService: () => void;
}

export function ManageServicesModalBody({
  services,
  serviceError,
  editingService,
  showAddServiceForm,
  newService,
  submitting,
  onEditingServiceChange,
  onNewServiceChange,
  onCancelEditService,
  onCancelAddService,
  onAddService,
  onUpdateService,
  onToggleServiceActive,
  onDeleteService,
  onStartAddService,
}: ManageServicesModalBodyProps) {
  return (
    <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
      {serviceError && (
        <div className="p-3 rounded-xl bg-[#EF4444]/10 border border-[#EF4444]/20 text-[#EF4444] text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {serviceError}
        </div>
      )}

      {editingService ? (
        <div className="space-y-3 p-4 rounded-xl bg-[#111111] border border-brand/20">
          <p className="text-xs font-bold uppercase tracking-widest text-[#64748B]">Editando Serviço</p>
          <input
            type="text"
            placeholder="Nome do serviço"
            value={editingService.nome}
            onChange={e => onEditingServiceChange(p => p ? { ...p, nome: e.target.value } : p)}
            className="flex h-11 w-full rounded-xl border border-[#1E1E1E] bg-[#0A0A0A] px-4 text-sm text-[#F1F5F9] placeholder:text-[#64748B] focus:outline-none focus:border-brand transition-all"
          />
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-widest text-[#64748B] font-bold">Tempo (min)</label>
              <input
                type="number"
                value={editingService.tempoBase}
                onChange={e => onEditingServiceChange(p => p ? { ...p, tempoBase: parseInt(e.target.value) || 0 } : p)}
                className="flex h-11 w-full rounded-xl border border-[#1E1E1E] bg-[#0A0A0A] px-4 text-sm text-[#F1F5F9] placeholder:text-[#64748B] focus:outline-none focus:border-brand transition-all"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-widest text-[#64748B] font-bold">Preço (R$)</label>
              <input
                type="number"
                value={editingService.preco}
                onChange={e => onEditingServiceChange(p => p ? { ...p, preco: parseFloat(e.target.value) || 0 } : p)}
                className="flex h-11 w-full rounded-xl border border-[#1E1E1E] bg-[#0A0A0A] px-4 text-sm text-[#F1F5F9] placeholder:text-[#64748B] focus:outline-none focus:border-brand transition-all"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={onCancelEditService} className="flex-1">
              Cancelar
            </Button>
            <Button size="sm" onClick={onUpdateService} loading={submitting} className="flex-1">
              Salvar
            </Button>
          </div>
        </div>
      ) : showAddServiceForm ? (
        <div className="space-y-3 p-4 rounded-xl bg-[#111111] border border-brand/20">
          <p className="text-xs font-bold uppercase tracking-widest text-[#64748B]">Novo Serviço</p>
          <input
            type="text"
            placeholder="Nome do serviço"
            value={newService.nome}
            onChange={e => onNewServiceChange(p => ({ ...p, nome: e.target.value }))}
            className="flex h-11 w-full rounded-xl border border-[#1E1E1E] bg-[#0A0A0A] px-4 text-sm text-[#F1F5F9] placeholder:text-[#64748B] focus:outline-none focus:border-brand transition-all"
          />
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-widest text-[#64748B] font-bold">Tempo (min)</label>
              <input
                type="number"
                value={newService.tempoBase}
                onChange={e => onNewServiceChange(p => ({ ...p, tempoBase: parseInt(e.target.value) || 0 }))}
                className="flex h-11 w-full rounded-xl border border-[#1E1E1E] bg-[#0A0A0A] px-4 text-sm text-[#F1F5F9] placeholder:text-[#64748B] focus:outline-none focus:border-brand transition-all"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-widest text-[#64748B] font-bold">Preço (R$)</label>
              <input
                type="number"
                value={newService.preco}
                onChange={e => onNewServiceChange(p => ({ ...p, preco: parseFloat(e.target.value) || 0 }))}
                className="flex h-11 w-full rounded-xl border border-[#1E1E1E] bg-[#0A0A0A] px-4 text-sm text-[#F1F5F9] placeholder:text-[#64748B] focus:outline-none focus:border-brand transition-all"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={onCancelAddService} className="flex-1">
              Cancelar
            </Button>
            <Button size="sm" onClick={onAddService} loading={submitting} className="flex-1">
              Criar Serviço
            </Button>
          </div>
        </div>
      ) : (
        <Button
          variant="outline"
          className="w-full"
          onClick={onStartAddService}
        >
          <Plus className="mr-2 h-4 w-4" /> Adicionar Serviço
        </Button>
      )}

      <div className="space-y-2">
        {services.length === 0 && !showAddServiceForm && (
          <p className="text-sm text-[#64748B] text-center py-4">Nenhum serviço cadastrado ainda.</p>
        )}
        {services.map(s => (
          <div key={s.id} className="flex items-center justify-between p-3 rounded-xl bg-[#1A1A1A] border border-[#1E1E1E]">
            <div className="space-y-0.5">
              <p className="text-sm font-bold text-[#F1F5F9]">{s.nome}</p>
              <p className="text-xs text-[#64748B] flex items-center gap-2">
                <Clock className="h-3 w-3" />{s.tempoBase}min
                <span className="text-brand">R$ {s.preco.toFixed(2)}</span>
              </p>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => onToggleServiceActive(s)}
                className={cn(
                  'px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors',
                  s.ativo ? 'bg-brand/10 text-brand' : 'bg-[#334155]/20 text-[#64748B]'
                )}
              >
                {s.ativo ? 'Ativo' : 'Inativo'}
              </button>
              <button
                onClick={() => onEditingServiceChange(s)}
                className="p-2 rounded-lg text-[#64748B] hover:text-[#F1F5F9] hover:bg-[#1A1A1A]"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                onClick={() => onDeleteService(s.id)}
                className="p-2 rounded-lg text-[#64748B] hover:text-[#EF4444] hover:bg-[#EF4444]/10"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
