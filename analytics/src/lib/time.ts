import { format, formatDistanceToNowStrict } from 'date-fns';

export function formatAxisTime(timestamp: number) {
  return format(new Date(timestamp), 'MMM d HH:mm');
}

export function formatShortTime(timestamp: number) {
  return format(new Date(timestamp), 'HH:mm');
}

export function formatFreshness(ts: string | null) {
  if (!ts) {
    return 'No live sample';
  }

  return `${formatDistanceToNowStrict(new Date(ts), { addSuffix: true })}`;
}

