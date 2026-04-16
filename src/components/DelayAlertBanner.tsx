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
      className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 space-y-3"
    >
      <div className="flex items-center gap-3">
        <AlertTriangle className="h-5 w-5 text-red-400 animate-pulse" />
        <div className="flex-1">
          <p className="text-sm font-bold text-red-400">Atendimento atrasado!</p>
          <p className="text-xs text-red-300">Cronômetro: {delayMinutes} min atrasado</p>
        </div>
        <TimerReset className="h-5 w-5 text-red-400 animate-pulse" />
      </div>
      <div className="flex gap-2">
        <Button variant="ghost" size="sm" onClick={onContinue} className="flex-1 text-xs h-9">
          <Clock className="mr-2 h-4 w-4" /> Continuar
        </Button>
        <Button
          variant="danger"
          size="sm"
          onClick={onCallNext}
          disabled={callNextDisabled}
          loading={submitting}
          className="flex-1 text-xs h-9"
        >
          <SkipForward className="mr-2 h-4 w-4" /> Chamar Próximo
        </Button>
      </div>
    </motion.div>
  );
}
