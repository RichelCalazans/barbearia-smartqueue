import { motion } from 'motion/react';
import { LayoutDashboard, BarChart3, UserSearch } from 'lucide-react';
import { cn } from '../utils';

export type AdminTab = 'FILA' | 'METRICAS' | 'CLIENTES';

interface BottomNavigationProps {
  activeTab: AdminTab;
  onTabChange: (tab: AdminTab) => void;
}

export function BottomNavigation({ activeTab, onTabChange }: BottomNavigationProps) {
  const tabs = [
    { id: 'FILA', label: 'Fila', icon: LayoutDashboard },
    { id: 'METRICAS', label: 'Métricas', icon: BarChart3 },
    { id: 'CLIENTES', label: 'Clientes', icon: UserSearch },
  ] as const;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-[#1E1E1E] bg-[#0A0A0A]/85 px-3 pt-2 pb-[calc(env(safe-area-inset-bottom)+0.65rem)] backdrop-blur-xl sm:px-6 sm:py-3">
      <div className="mx-auto grid w-full max-w-3xl grid-cols-3 gap-1 sm:gap-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                'relative flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl px-2 py-1.5 transition-all duration-300',
                isActive ? 'text-brand' : 'text-[#64748B] hover:text-[#F1F5F9]'
              )}
            >
              <Icon className={cn('h-5 w-5', isActive && 'animate-pulse')} />
              <span className="text-[10px] font-bold uppercase tracking-widest">
                {tab.label}
              </span>
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute top-0 h-1 w-8 rounded-full bg-brand"
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
