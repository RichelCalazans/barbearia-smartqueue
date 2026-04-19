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
        'inline-flex min-h-10 items-center justify-center rounded-full border px-3.5 py-2 text-sm font-medium transition-all',
        selected
          ? 'bg-brand/10 border-brand text-brand'
          : 'bg-[#111111] border-[#1E1E1E] text-[#64748B] hover:border-[#64748B]/50',
        className
      )}
      {...props}
    >
      {label}
    </button>
  );
}
