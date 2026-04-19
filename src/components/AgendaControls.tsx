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
    ? `Pausada ${
        timeRemaining > 0
          ? `- Retomando em ${Math.floor(timeRemaining / 60)}m ${timeRemaining % 60}s`
          : 'Nenhum novo cliente pode entrar.'
      }`
    : agendaAberta
    ? 'A agenda está aberta e recebendo novos clientes.'
    : 'A agenda está fechada. Clientes não podem entrar na fila.';

  return (
    <section className="border-t border-[#1E1E1E] pt-6 sm:pt-8">
      <Card className="bg-gradient-to-br from-[#111111] to-[#0A0A0A] border-brand/10">
        <div className="flex flex-col gap-4">
          <div className="flex-1 space-y-1 text-left">
            <h3 className="text-lg font-bold text-[#F1F5F9]">Controle da Agenda</h3>
            <p className="text-sm text-[#64748B]">{statusText}</p>
          </div>
          <div className="grid gap-2 sm:flex sm:flex-wrap sm:justify-start">
            {!agendaAberta && (
              <Button variant="primary" className="h-12 w-full px-6 font-bold sm:w-auto" onClick={onOpen}>
                <Unlock className="mr-2 h-4 w-4" /> Abrir
              </Button>
            )}
            {agendaAberta && (
              <>
                <Button variant="outline" className="h-12 w-full px-6 font-bold sm:w-auto" onClick={onPauseToggle}>
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
                <Button variant="danger" className="h-12 w-full px-6 font-bold sm:w-auto" onClick={onClose}>
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
