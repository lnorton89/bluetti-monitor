import { describe, expect, test } from 'bun:test';
import {
  getBatteryPercent,
  getChargeCeilingPercent,
  shouldNotifyBatteryFull,
} from '../src/lib/notifications';

describe('battery full notifications', () => {
  test('uses the reported battery ceiling when present', () => {
    expect(getChargeCeilingPercent({
      battery_range_end: { value: '85', ts: '2026-04-14T01:00:00.000Z' },
    })).toBe(85);
  });

  test('falls back to 100 percent when no ceiling is reported', () => {
    expect(getChargeCeilingPercent({})).toBe(100);
  });

  test('reads battery percent from the primary live battery field', () => {
    expect(getBatteryPercent({
      total_battery_percent: { value: '99.5', ts: '2026-04-14T01:00:00.000Z' },
    })).toBe(99.5);
  });

  test('only notifies when the battery crosses the configured ceiling', () => {
    expect(shouldNotifyBatteryFull(84, 85, 85)).toBe(true);
    expect(shouldNotifyBatteryFull(85, 85, 85)).toBe(false);
    expect(shouldNotifyBatteryFull(86, 84, 85)).toBe(false);
    expect(shouldNotifyBatteryFull(null, 85, 85)).toBe(false);
  });
});
