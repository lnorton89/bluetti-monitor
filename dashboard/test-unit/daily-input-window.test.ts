import { describe, expect, test } from 'bun:test';
import {
  accumulateLiveInputPeak,
  getDailyInputPeakWindow,
  resolveDailyInputPeakValue,
} from '../src/lib/daily-input-window';

describe('daily input peak window', () => {
  test('uses the local 6 AM to 6 PM daylight window for the current day', () => {
    const window = getDailyInputPeakWindow(new Date(2026, 5, 16, 12, 30, 0, 0));

    expect(window.since).toBe(new Date(2026, 5, 16, 6, 0, 0, 0).toISOString());
    expect(window.until).toBe(new Date(2026, 5, 16, 18, 0, 0, 0).toISOString());
    expect(window.hasStarted).toBe(true);
    expect(window.containsNow).toBe(true);
  });

  test('does not mark the daily window as started before 6 AM', () => {
    const window = getDailyInputPeakWindow(new Date(2026, 5, 16, 5, 59, 59, 999));

    expect(window.hasStarted).toBe(false);
    expect(window.containsNow).toBe(false);
  });

  test('treats 6 PM as outside the peak window', () => {
    const window = getDailyInputPeakWindow(new Date(2026, 5, 16, 18, 0, 0, 0));

    expect(window.containsNow).toBe(false);
  });

  test('only merges live input while the current time is inside the daylight window', () => {
    expect(resolveDailyInputPeakValue(700, 900, true)).toBe(900);
    expect(resolveDailyInputPeakValue(700, 900, false)).toBe(700);
    expect(resolveDailyInputPeakValue(null, 900, false)).toBeNull();
  });

  test('does not display live input as the peak before history has loaded', () => {
    expect(resolveDailyInputPeakValue(undefined, 1405, true)).toBeNull();
  });

  test('retains a live peak after the instantaneous input falls', () => {
    let livePeak: number | null = null;
    livePeak = accumulateLiveInputPeak(livePeak, 1603, true);
    livePeak = accumulateLiveInputPeak(livePeak, 1965, true);
    livePeak = accumulateLiveInputPeak(livePeak, 1200, true);

    expect(livePeak).toBe(1965);
    expect(resolveDailyInputPeakValue(1500, livePeak, true)).toBe(1965);
  });

  test('does not accumulate live input outside the daylight window', () => {
    expect(accumulateLiveInputPeak(900, 1400, false)).toBe(900);
  });
});
