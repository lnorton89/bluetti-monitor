export const DAILY_INPUT_PEAK_START_HOUR = 6;
export const DAILY_INPUT_PEAK_END_HOUR = 18;

export interface DailyInputPeakWindow {
  since: string;
  until: string;
  hasStarted: boolean;
  containsNow: boolean;
}

export function getDailyInputPeakWindow(now = new Date()): DailyInputPeakWindow {
  const start = new Date(now);
  start.setHours(DAILY_INPUT_PEAK_START_HOUR, 0, 0, 0);

  const end = new Date(now);
  end.setHours(DAILY_INPUT_PEAK_END_HOUR, 0, 0, 0);

  return {
    since: start.toISOString(),
    until: end.toISOString(),
    hasStarted: now >= start,
    containsNow: now >= start && now < end,
  };
}

export function resolveDailyInputPeakValue(
  historyPeak: number | null | undefined,
  liveInput: number,
  containsNow: boolean,
) {
  if (historyPeak === undefined) {
    return null;
  }

  if (containsNow) {
    return Math.max(historyPeak ?? 0, liveInput);
  }

  return historyPeak;
}

export function accumulateLiveInputPeak(
  previousPeak: number | null,
  liveInput: number,
  containsNow: boolean,
) {
  if (!containsNow || !Number.isFinite(liveInput)) {
    return previousPeak;
  }

  return Math.max(previousPeak ?? 0, liveInput);
}
