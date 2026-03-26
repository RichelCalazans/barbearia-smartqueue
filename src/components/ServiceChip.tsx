import React from 'react';
import { cn } from '../utils';

interface ServiceChipProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  selected?: boolean;
  className?: string;
  onClick?: any;
  key?: React.Key;
}

export function ServiceChip({ label, selected, className, ...props }: ServiceChipProps) {
  return (
    <button
      type="button"
      className={cn(
        'inline-flex items-center justify-center px-4 py-2 rounded-full text-sm font-medium border transition-all',
        selected
          ? 'bg-[#00D4A5]/10 border-[#00D4A5] text-[#00D4A5]'
          : 'bg-[#111111] border-[#1E1E1E] text-[#64748B] hover:border-[#64748B]/50',
        className
      )}
      {...props}
    >
      {label}
    </button>
  );
}
