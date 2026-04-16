import { Card } from './Card';
import { Clock, Scissors, Pause, DoorClosed } from 'lucide-react';
import { BarberStatus } from '../types';

interface Props {
  currentStatus: BarberStatus | undefined;
  onChange: (status: BarberStatus) => void;
}

const OPTIONS: Array<{
  status: BarberStatus;
  label: string;
  icon: typeof Clock;
  activeClasses: string;
  hoverBorder: string;
}> = [
  {
    status: 'AGUARDANDO_CLIENTE',
    label: 'Aguardando',
    icon: Clock,
    activeClasses: 'bg-blue-500/20 border-blue-500 text-blue-400',
    hoverBorder: 'hover:border-blue-500/50',
  },
  {
    status: 'EM_CORTE',
    label: 'Cortando',
    icon: Scissors,
    activeClasses: 'bg-emerald-500/20 border-emerald-500 text-emerald-400',
    hoverBorder: 'hover:border-emerald-500/50',
  },
  {
    status: 'EM_PAUSA',
    label: 'Pausa',
    icon: Pause,
    activeClasses: 'bg-amber-500/20 border-amber-500 text-amber-400',
    hoverBorder: 'hover:border-amber-500/50',
  },
  {
    status: 'FILA_FECHADA',
    label: 'Fechada',
    icon: DoorClosed,
    activeClasses: 'bg-red-500/20 border-red-500 text-red-400',
    hoverBorder: 'hover:border-red-500/50',
  },
];

export function BarberStatusControls({ currentStatus, onChange }: Props) {
  return (
    <section className="pt-4">
      <Card className="bg-gradient-to-br from-[#111111] to-[#0A0A0A] border-[#1E1E1E]">
        <div className="space-y-4">
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-[#F1F5F9]">Status do Barbeiro</h3>
            <p className="text-sm text-[#64748B]">Este status é visível para os clientes na fila</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {OPTIONS.map(({ status, label, icon: Icon, activeClasses, hoverBorder }) => {
              const isActive = currentStatus === status;
              return (
                <button
                  key={status}
                  onClick={() => onChange(status)}
                  className={`p-3 rounded-xl border-2 transition-all text-center ${
                    isActive
                      ? activeClasses
                      : `bg-[#1A1A1A] border-[#1E1E1E] text-[#64748B] ${hoverBorder}`
                  }`}
                >
                  <Icon className="h-5 w-5 mx-auto mb-2" />
                  <p className="text-xs font-bold">{label}</p>
                </button>
              );
            })}
          </div>
        </div>
      </Card>
    </section>
  );
}
