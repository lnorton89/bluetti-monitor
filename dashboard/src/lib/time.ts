import { format, formatDistanceToNow } from 'date-fns';

/**
 * Format a timestamp to HH:mm:ss format (24-hour clock)
 */
export function formatTime(ts: string | number | Date): string {
  return format(new Date(ts), 'HH:mm:ss');
}

/**
 * Format a timestamp to short time format HH:mm (for charts)
 */
export function formatTimeShort(ts: string | number | Date): string {
  return format(new Date(ts), 'HH:mm');
}

/**
 * Format a timestamp to relative time (e.g., "2 minutes ago")
 */
export function formatRelativeTime(ts: string | number | Date): string {
  return formatDistanceToNow(new Date(ts), { addSuffix: true });
}
