import { Card } from './Card';
import { Button } from './Button';
import { Unlock, Lock, Play, Pause } from 'lucide-react';

interface Props {
  agendaAberta: boolean;
  agendaPausada: boolean;
  timeRemaining: number;
  onOpen: () => void;
  onPauseToggle: () => void;
  onClose: () => void;
}

export function AgendaControls({
  agendaAberta,
  agendaPausada,
  timeRemaining,
  onOpen,
  onPauseToggle,
  onClose,
}: Props) {
  const statusText = agendaPausada
    ? `⏸️ Pausada ${
        timeRemaining > 0
          ? `- Retomando em ${Math.floor(timeRemaining / 60)}m ${timeRemaining % 60}s`
          : 'Nenhum novo cliente pode entrar.'
      }`
    : agendaAberta
    ? '✅ A agenda está aberta e recebendo novos clientes.'
    : '❌ A agenda está fechada. Clientes não podem entrar na fila.';

  return (
    <section className="pt-8 border-t border-[#1E1E1E]">
      <Card className="bg-gradient-to-br from-[#111111] to-[#0A0A0A] border-brand/10">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-center md:text-left flex-1">
            <h3 className="text-lg font-bold text-[#F1F5F9]">Controle da Agenda</h3>
            <p className="text-sm text-[#64748B]">{statusText}</p>
          </div>
          <div className="flex gap-2 flex-wrap md:flex-nowrap justify-center md:justify-end">
            {!agendaAberta && (
              <Button variant="primary" className="h-12 px-6 font-bold" onClick={onOpen}>
                <Unlock className="mr-2 h-4 w-4" /> Abrir
              </Button>
            )}
            {agendaAberta && (
              <>
                <Button variant="outline" className="h-12 px-6 font-bold" onClick={onPauseToggle}>
                  {agendaPausada ? (
                    <>
                      <Play className="mr-2 h-4 w-4" /> Retomar
                    </>
                  ) : (
                    <>
                      <Pause className="mr-2 h-4 w-4" /> Pausar
                    </>
                  )}
                </Button>
                <Button variant="danger" className="h-12 px-6 font-bold" onClick={onClose}>
                  <Lock className="mr-2 h-4 w-4" /> Fechar
                </Button>
              </>
            )}
          </div>
        </div>
      </Card>
    </section>
  );
}
