import React from 'react';
import { motion } from 'motion/react';
import { Scissors, Pause, DoorClosed, Clock, AlertTriangle } from 'lucide-react';
import { BarberStatus } from '../types';

interface BarberStatusBannerProps {
  status: BarberStatus;
  delayMinutes?: number;
}

const STATUS_CONFIG: Record<BarberStatus, {
  label: string;
  icon: React.ReactNode;
  bgColor: string;
  borderColor: string;
  textColor: string;
  pulse?: boolean;
}> = {
  EM_CORTE: {
    label: 'Cortando',
    icon: <Scissors className="h-4 w-4" />,
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/30',
    textColor: 'text-emerald-400',
  },
  EM_PAUSA: {
    label: 'Pausado',
    icon: <Pause className="h-4 w-4" />,
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
    textColor: 'text-amber-400',
  },
  FILA_FECHADA: {
    label: 'Fechado',
    icon: <DoorClosed className="h-4 w-4" />,
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/30',
    textColor: 'text-red-400',
  },
  AGUARDANDO_CLIENTE: {
    label: 'Barbeiro está aguardando',
    icon: <Clock className="h-4 w-4" />,
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
    textColor: 'text-blue-400',
  },
};

export function BarberStatusBanner({ status, delayMinutes = 0 }: BarberStatusBannerProps) {
  const config = STATUS_CONFIG[status];
  const isDelayed = delayMinutes > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative p-4 rounded-xl border ${config.bgColor} ${config.borderColor}`}
    >
      <div className="flex items-center gap-3">
        <div className={`${config.textColor} ${isDelayed ? 'animate-pulse' : ''}`}>
          {config.icon}
        </div>
        <div className="flex-1">
          <p className={`text-sm font-bold ${config.textColor}`}>
            {config.label}
          </p>
          {isDelayed && (
            <div className="flex items-center gap-2 mt-1">
              <AlertTriangle className="h-3 w-3 text-red-400" />
              <p className="text-xs text-red-400">
                Atraso de {delayMinutes} min
              </p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
