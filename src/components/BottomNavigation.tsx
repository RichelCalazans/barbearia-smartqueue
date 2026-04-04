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
    <nav className="fixed bottom-0 left-0 right-0 bg-[#0A0A0A]/80 backdrop-blur-xl border-t border-[#1E1E1E] px-6 py-4 z-50">
      <div className="max-w-md mx-auto flex items-center justify-between">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                'relative flex flex-col items-center gap-1 transition-all duration-300',
                isActive ? 'text-brand' : 'text-[#64748B] hover:text-[#F1F5F9]'
              )}
            >
              <Icon className={cn('h-6 w-6', isActive && 'animate-pulse')} />
              <span className="text-[10px] font-bold uppercase tracking-wider">
                {tab.label}
              </span>
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute -top-4 h-1 w-8 bg-brand rounded-full"
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
