import { describe, expect, test } from 'bun:test';
import {
  buildStatusNotification,
  buildNtfyUrl,
  getCurrentInputWatts,
  getCurrentOutputWatts,
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

  test('builds ntfy topic URLs from server and topic settings', () => {
    expect(buildNtfyUrl('https://ntfy.sh/', 'bluetti alerts')).toBe('https://ntfy.sh/bluetti%20alerts');
    expect(buildNtfyUrl('https://ntfy.sh////', '/bluetti/')).toBe('https://ntfy.sh/bluetti');
    expect(buildNtfyUrl('', 'bluetti')).toBeNull();
    expect(buildNtfyUrl('https://ntfy.sh', '')).toBeNull();
  });

  test('summarizes current input and output power without double-counting split solar fields', () => {
    const state = {
      ac_input_power: { value: '40', ts: '2026-04-14T01:00:00.000Z' },
      dc_input_power: { value: '500', ts: '2026-04-14T01:00:00.000Z' },
      pv1_power: { value: '300', ts: '2026-04-14T01:00:00.000Z' },
      pv2_power: { value: '250', ts: '2026-04-14T01:00:00.000Z' },
      ac_output_power: { value: '200', ts: '2026-04-14T01:00:00.000Z' },
      dc_output_power: { value: '30', ts: '2026-04-14T01:00:00.000Z' },
    };

    expect(getCurrentInputWatts(state)).toBe(590);
    expect(getCurrentOutputWatts(state)).toBe(230);
  });

  test('builds recurring status notification text with input, output, and SOC', () => {
    const payload = buildStatusNotification('AC500-test', {
      dc_input_power: { value: '412', ts: '2026-04-14T01:00:00.000Z' },
      ac_output_power: { value: '211', ts: '2026-04-14T01:00:00.000Z' },
      total_battery_percent: { value: '67.4', ts: '2026-04-14T01:00:00.000Z' },
    });

    expect(payload?.title).toBe('AC500-test power status');
    expect(payload?.body).toBe('Input 412 W - Output 211 W - SOC 67%');
  });
});
