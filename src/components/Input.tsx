import { InputHTMLAttributes, forwardRef } from 'react';
import { cn } from '../utils';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className, ...props }, ref) => {
    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label className="text-sm font-medium text-[#64748B] ml-1">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={cn(
            'flex h-12 w-full rounded-xl border border-[#1E1E1E] bg-[#0A0A0A] px-4 py-2 text-[#F1F5F9] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#00D4A5]/20 focus:border-[#00D4A5] transition-all disabled:opacity-50',
            error && 'border-[#EF4444] focus:ring-[#EF4444]/20 focus:border-[#EF4444]',
            className
          )}
          {...props}
        />
        {error && <p className="text-xs text-[#EF4444] ml-1">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
