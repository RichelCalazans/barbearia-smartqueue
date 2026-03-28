import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { AppConfig, DaySchedule } from './types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Gets the day of week (0-6) from a date string (YYYY-MM-DD)
 */
export function getDayOfWeek(dateString: string): number {
  const date = new Date(dateString + 'T12:00:00');
  return date.getDay();
}

/**
 * Checks if a date is enabled based on the weekly schedule
 * Returns true by default if WEEKLY_SCHEDULE is not configured (allow all days)
 */
export function isDateEnabled(dateString: string, config: AppConfig): boolean {
  // If no weekly schedule is configured, default to allowing all weekdays (Mon-Sat)
  if (!config.WEEKLY_SCHEDULE || config.WEEKLY_SCHEDULE.length === 0) {
    const dayOfWeek = getDayOfWeek(dateString);
    // Default: enabled Monday (1) through Saturday (6), disabled Sunday (0)
    return dayOfWeek >= 1 && dayOfWeek <= 6;
  }

  const dayOfWeek = getDayOfWeek(dateString);
  const schedule = config.WEEKLY_SCHEDULE.find(s => s.day === dayOfWeek);

  return schedule?.enabled ?? false;
}

/**
 * Formats a date string to a friendly display format
 */
export function formatDateDisplay(dateString: string): string {
  const date = new Date(dateString + 'T12:00:00');
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  if (dateString === today.toISOString().split('T')[0]) {
    return 'Hoje';
  }
  if (dateString === tomorrow.toISOString().split('T')[0]) {
    return 'Amanhã';
  }
  
  return date.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'short' });
}

/**
 * Generates a list of available dates for the next N days
 * Starts from tomorrow (day 1) since today has its own button
 */
export function getAvailableDates(config: AppConfig, maxDays: number = 14): { date: string; label: string; disabled: boolean }[] {
  const dates: { date: string; label: string; disabled: boolean }[] = [];
  const today = new Date();

  // Start from tomorrow (i = 1) since "Hoje" has its own button
  for (let i = 1; i <= maxDays; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    const dateString = date.toISOString().split('T')[0];

    // If WEEKLY_SCHEDULE is not configured, allow all dates
    const enabled = config.WEEKLY_SCHEDULE ? isDateEnabled(dateString, config) : true;

    dates.push({
      date: dateString,
      label: formatDateDisplay(dateString),
      disabled: !enabled,
    });
  }

  return dates;
}

/**
 * Gets the schedule for a specific date
 */
export function getScheduleForDate(dateString: string, config: AppConfig): DaySchedule | undefined {
  if (!config.WEEKLY_SCHEDULE) return undefined;
  
  const dayOfWeek = getDayOfWeek(dateString);
  return config.WEEKLY_SCHEDULE.find(s => s.day === dayOfWeek);
}
