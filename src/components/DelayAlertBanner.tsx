import { motion } from 'motion/react';
import { AlertTriangle, TimerReset, Clock, SkipForward } from 'lucide-react';
import { Button } from './Button';

interface Props {
  delayMinutes: number;
  submitting: boolean;
  callNextDisabled: boolean;
  onContinue: () => void;
  onCallNext: () => void;
}

export function DelayAlertBanner({
  delayMinutes,
  submitting,
  callNextDisabled,
  onContinue,
  onCallNext,
}: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4"
    >
      <div className="flex items-center gap-3">
        <AlertTriangle className="h-5 w-5 shrink-0 animate-pulse text-red-400" />
        <div className="flex-1">
          <p className="text-sm font-bold text-red-400">Atendimento atrasado!</p>
          <p className="text-xs text-red-300">Cronômetro: {delayMinutes} min atrasado</p>
        </div>
        <TimerReset className="h-5 w-5 shrink-0 animate-pulse text-red-400" />
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Button variant="ghost" size="sm" onClick={onContinue} className="min-h-11 w-full text-xs">
          <Clock className="mr-2 h-4 w-4" /> Continuar
        </Button>
        <Button
          haptic="heavy"
          variant="danger"
          size="sm"
          onClick={onCallNext}
          disabled={callNextDisabled}
          loading={submitting}
          className="min-h-11 w-full text-xs"
        >
          <SkipForward className="mr-2 h-4 w-4" /> Chamar Próximo
        </Button>
      </div>
    </motion.div>
  );
}
