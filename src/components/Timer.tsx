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
  const estimatedSeconds = estimatedMinutes * 60;
  
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  const progress = Math.min(elapsed / estimatedSeconds, 1);
  const isOvertime = elapsed > estimatedSeconds;
  const isUrgent = progress > 0.75 && !isOvertime;

  const circumference = 2 * Math.PI * 82; // r=82
  const offset = circumference * (1 - progress);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(Math.abs(seconds) / 60);
    const secs = Math.abs(seconds) % 60;
    return `${seconds < 0 ? '-' : ''}${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={cn('flex flex-col items-center justify-center space-y-6', className)}>
      <div className="relative h-32 w-32 md:h-48 md:w-48">
        {/* Background Circle */}
        <svg className="h-full w-full -rotate-90 transform">
          <circle
            cx="96"
            cy="96"
            r="82"
            fill="transparent"
            stroke="#1E1E1E"
            strokeWidth="8"
          />
          {/* Progress Circle */}
          <motion.circle
            cx="96"
            cy="96"
            r="82"
            fill="transparent"
            stroke={isOvertime ? '#EF4444' : isUrgent ? '#EAB308' : 'var(--color-primary)'}
            strokeWidth="8"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1, ease: 'linear' }}
            strokeLinecap="round"
          />
        </svg>

        {/* Time Display */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn(
            "text-2xl md:text-4xl font-bold tracking-tighter",
            isOvertime ? "text-[#EF4444] animate-pulse" : "text-[#F1F5F9]"
          )}>
            {formatTime(elapsed)}
          </span>
          <span className="text-xs font-medium text-[#94A3B8] uppercase tracking-widest mt-1">
            {isOvertime ? 'Atrasado' : 'Em curso'}
          </span>
        </div>
      </div>

      <div className="text-center">
        <p className="text-sm font-medium text-[#94A3B8]">
          Estimativa: <span className="text-[#F1F5F9]">{estimatedMinutes} min</span>
        </p>
      </div>
    </div>
  );
}
