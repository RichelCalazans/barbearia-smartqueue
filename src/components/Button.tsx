import React, { ReactNode } from 'react';
import { cn } from '../utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  children: ReactNode;
  loading?: boolean;
  className?: string;
  onClick?: any;
  type?: any;
  disabled?: boolean;
  key?: React.Key;
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  children,
  loading,
  disabled,
  ...props
}: ButtonProps) {
  const variants = {
    primary: 'bg-brand text-black hover:bg-brand/90',
    secondary: 'bg-[#111111] text-[#F1F5F9] border border-[#1E1E1E] hover:bg-[#1A1A1A]',
    danger: 'bg-[#EF4444] text-white hover:bg-[#EF4444]/90',
    ghost: 'bg-transparent text-[#F1F5F9] hover:bg-[#1A1A1A]',
    outline: 'bg-transparent text-[#F1F5F9] border border-[#1E1E1E] hover:bg-[#1A1A1A]',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2.5 text-base',
    lg: 'px-6 py-3 text-lg',
    icon: 'p-2.5 md:p-2 min-h-10 min-w-10 md:min-h-auto md:min-w-auto',
  };

  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2 focus:ring-offset-[#0A0A0A]',
        variants[variant],
        sizes[size],
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : null}
      {children}
    </button>
  );
}
