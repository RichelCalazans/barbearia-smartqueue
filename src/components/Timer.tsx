import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { cn } from '../utils';

interface TimerProps {
  startTime: number; // timestamp
  estimatedMinutes: number;
  className?: string;
}

export function Timer({ startTime, estimatedMinutes, className }: TimerProps) {
  const [elapsed, setElapsed] = useState(0);
  const estimatedSeconds = Math.max(estimatedMinutes * 60, 1);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  const progress = Math.min(Math.max(elapsed / estimatedSeconds, 0), 1);
  const isOvertime = elapsed > estimatedSeconds;
  const isUrgent = progress > 0.75 && !isOvertime;

  const radius = 72;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - progress);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(Math.abs(seconds) / 60);
    const secs = Math.abs(seconds) % 60;
    return `${seconds < 0 ? '-' : ''}${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={cn('flex flex-col items-center justify-center space-y-4', className)}>
      <div className="relative h-36 w-36 sm:h-44 sm:w-44">
        {/* Background Circle */}
        <svg className="h-full w-full -rotate-90 transform" viewBox="0 0 176 176">
          <circle
            cx="88"
            cy="88"
            r={radius}
            fill="transparent"
            stroke="#1E1E1E"
            strokeWidth="8"
          />
          {/* Progress Circle */}
          <motion.circle
            cx="88"
            cy="88"
            r={radius}
            fill="transparent"
            stroke={isOvertime ? '#EF4444' : isUrgent ? '#EAB308' : 'var(--color-primary)'}
            strokeWidth="8"
            strokeDasharray={`${circumference} ${circumference}`}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1, ease: 'linear' }}
            strokeLinecap="round"
          />
        </svg>

        {/* Time Display */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn(
            'text-xl sm:text-3xl font-bold tracking-tight',
            isOvertime ? "text-[#EF4444] animate-pulse" : "text-[#F1F5F9]"
          )}>
            {formatTime(elapsed)}
          </span>
          <span className="mt-1 text-[10px] sm:text-xs font-medium uppercase tracking-[0.18em] text-[#94A3B8]">
            {isOvertime ? 'Atrasado' : 'Em curso'}
          </span>
        </div>
      </div>

      <div className="text-center">
        <p className="text-sm sm:text-base font-medium text-[#94A3B8]">
          Estimativa: <span className="text-[#F1F5F9]">{estimatedMinutes} min</span>
        </p>
      </div>
    </div>
  );
}
