import { AppConfig } from '../types';
import { cn } from '../utils';

interface Props {
  tempConfig: AppConfig;
  onChange: (config: AppConfig) => void;
}

export function SettingsForm({ tempConfig, onChange }: Props) {
  const set = <K extends keyof AppConfig>(key: K, value: AppConfig[K]) =>
    onChange({ ...tempConfig, [key]: value });

  const updateScheduleDay = (dayIndex: number, patch: Record<string, unknown>) => {
    const schedule = [...(tempConfig.WEEKLY_SCHEDULE || [])];
    const idx = schedule.findIndex(s => s.day === dayIndex);
    if (idx >= 0) {
      schedule[idx] = { ...schedule[idx], ...patch };
    } else {
      schedule.push({ day: dayIndex, enabled: true, openTime: '09:00', closeTime: '19:00', ...patch });
    }
    onChange({ ...tempConfig, WEEKLY_SCHEDULE: schedule });
  };

  return (
    <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2">
      <p className="text-xs font-bold uppercase tracking-widest text-[#64748B]">Geral</p>

      <div className="space-y-2">
        <label className="text-xs text-[#64748B]">Nome da Barbearia</label>
        <input
          type="text"
          placeholder="Ex: Barbearia Premium"
          value={tempConfig.SHOP_NAME || ''}
          onChange={e => set('SHOP_NAME', e.target.value)}
          className="w-full bg-[#1A1A1A] border border-[#1E1E1E] rounded-xl px-4 py-3 text-sm text-[#F1F5F9] placeholder:text-[#64748B] focus:outline-none focus:border-brand"
        />
      </div>

      <p className="text-xs font-bold uppercase tracking-widest text-[#64748B]">Aparência</p>

      <div className="space-y-2">
        <label className="text-xs text-[#64748B]">URL do Logo</label>
        <input
          type="url"
          placeholder="https://exemplo.com/logo.png"
          value={tempConfig.LOGO_URL || ''}
          onChange={e => set('LOGO_URL', e.target.value)}
          className="w-full bg-[#1A1A1A] border border-[#1E1E1E] rounded-xl px-4 py-3 text-sm text-[#F1F5F9] placeholder:text-[#64748B] focus:outline-none focus:border-brand"
        />
        <p className="text-[10px] text-[#64748B]">Cole a URL de uma imagem (PNG, JPG)</p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {([
          { key: 'PRIMARY_COLOR' as const, label: 'Principal', fallback: '#00D4A5' },
          { key: 'SECONDARY_COLOR' as const, label: 'Fundo', fallback: '#1A1A1A' },
          { key: 'ACCENT_COLOR' as const, label: 'Destaque', fallback: '#0A0A0A' },
        ]).map(({ key, label, fallback }) => (
          <div key={key} className="space-y-2">
            <label className="text-[10px] uppercase tracking-widest text-[#64748B] font-bold">{label}</label>
            <input
              type="color"
              value={tempConfig[key] || fallback}
              onChange={e => set(key, e.target.value)}
              className="w-full h-12 rounded-xl cursor-pointer border-2 border-[#1E1E1E] hover:border-brand transition-colors"
            />
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between p-4 rounded-xl bg-[#1A1A1A] border border-[#1E1E1E]">
        <div className="space-y-1">
          <p className="text-sm font-bold text-[#F1F5F9]">Abertura Automática</p>
          <p className="text-xs text-[#64748B]">Abrir e fechar a fila baseado no horário</p>
        </div>
        <button
          onClick={() => set('AUTO_OPEN_CLOSE', !tempConfig.AUTO_OPEN_CLOSE)}
          className={cn(
            'w-12 h-6 rounded-full transition-colors relative',
            tempConfig.AUTO_OPEN_CLOSE ? 'bg-brand' : 'bg-[#334155]'
          )}
        >
          <div
            className={cn(
              'absolute top-1 w-4 h-4 rounded-full bg-white transition-all',
              tempConfig.AUTO_OPEN_CLOSE ? 'left-7' : 'left-1'
            )}
          />
        </button>
      </div>

      <div className="space-y-3">
        <p className="text-xs font-bold uppercase tracking-widest text-[#64748B] ml-1">Agenda Semanal</p>
        {['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'].map((dayName, index) => {
          const schedule = tempConfig.WEEKLY_SCHEDULE?.find(s => s.day === index) || {
            day: index,
            enabled: false,
            openTime: '09:00',
            closeTime: '19:00',
          };
          const today = new Date();
          const targetDate = new Date(today);
          targetDate.setDate(today.getDate() + ((index - today.getDay() + 7) % 7 || 7));
          const dateStr = targetDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });

          return (
            <div key={index} className="p-4 rounded-xl bg-[#111111] border border-[#1E1E1E] space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-[#F1F5F9]">{dayName}</p>
                  <p className="text-xs text-[#64748B]">{dateStr}</p>
                </div>
                <button
                  onClick={() => updateScheduleDay(index, { enabled: !schedule.enabled })}
                  className={cn(
                    'px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors',
                    schedule.enabled ? 'bg-brand/10 text-brand' : 'bg-[#334155]/20 text-[#64748B]'
                  )}
                >
                  {schedule.enabled ? 'Ativo' : 'Inativo'}
                </button>
              </div>
              {schedule.enabled && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-widest text-[#64748B] font-bold">Abertura</label>
                    <input
                      type="time"
                      value={schedule.openTime}
                      onChange={e => updateScheduleDay(index, { openTime: e.target.value })}
                      className="w-full bg-[#1A1A1A] border border-[#1E1E1E] rounded-lg px-3 py-2 text-sm text-[#F1F5F9] focus:outline-none focus:border-brand/50"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-widest text-[#64748B] font-bold">Fechamento</label>
                    <input
                      type="time"
                      value={schedule.closeTime}
                      onChange={e => updateScheduleDay(index, { closeTime: e.target.value })}
                      className="w-full bg-[#1A1A1A] border border-[#1E1E1E] rounded-lg px-3 py-2 text-sm text-[#F1F5F9] focus:outline-none focus:border-brand/50"
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
