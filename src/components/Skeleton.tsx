import { cn } from '../utils';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'rect' | 'circle';
}

export function Skeleton({ className, variant = 'rect' }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse bg-[#1E1E1E]',
        variant === 'text' && 'h-4 w-full rounded',
        variant === 'rect' && 'rounded-xl',
        variant === 'circle' && 'rounded-full',
        className
      )}
    />
  );
}
