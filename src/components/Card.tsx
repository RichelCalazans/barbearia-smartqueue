import React, { ReactNode, MouseEventHandler } from 'react';
import { cn } from '../utils';

interface CardProps {
  children: ReactNode;
  variant?: 'default' | 'outline' | 'ghost';
  className?: string;
  key?: React.Key;
  onClick?: MouseEventHandler<HTMLDivElement>;
}

export function Card({ children, className, variant = 'default', ...props }: CardProps) {
  const variants = {
    default: 'bg-[#111111] border border-[#1E1E1E]',
    outline: 'bg-transparent border border-[#1E1E1E]',
    ghost: 'bg-transparent border-none',
  };

  return (
    <div className={cn('rounded-2xl p-4 sm:p-6', variants[variant], className)} {...props}>
      {children}
    </div>
  );
}
