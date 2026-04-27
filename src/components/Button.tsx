import React, { ReactNode } from 'react';
import { cn, haptic } from '../utils';

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
  /** Dispara navigator.vibrate ao clicar — use em ações críticas (chamar próximo, finalizar). */
  haptic?: 'light' | 'medium' | 'heavy';
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  children,
  loading,
  disabled,
  haptic: hapticIntensity,
  onClick,
  ...props
}: ButtonProps) {
  const variants = {
    primary: 'bg-brand text-black hover:bg-brand/90',
    secondary: 'bg-[#111111] text-[#F1F5F9] border border-[#1E1E1E] hover:bg-[#1A1A1A]',
    danger: 'bg-[#EF4444] text-white hover:bg-[#EF4444]/90',
    ghost: 'bg-transparent text-[#F1F5F9] hover:bg-[#1A1A1A]',
    outline: 'bg-transparent text-[#F1F5F9] border border-[#1E1E1E] hover:bg-[#1A1A1A]',
  };

  // Tamanhos seguem Apple HIG / Material Design (44–48px mínimo)
  const sizes = {
    sm: 'min-h-11 px-3.5 py-2 text-sm',
    md: 'min-h-12 px-4 py-2.5 text-sm sm:text-base',
    lg: 'min-h-[52px] px-6 py-3 text-base sm:text-lg',
    icon: 'h-11 w-11 p-0',
  };

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (hapticIntensity) haptic(hapticIntensity);
    if (onClick) onClick(e);
  };

  return (
    <button
      onClick={handleClick}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-[colors,transform,opacity] touch-manipulation select-none disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2 focus:ring-offset-[#0A0A0A] active:scale-[0.97] active:opacity-90 disabled:active:scale-100',
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
