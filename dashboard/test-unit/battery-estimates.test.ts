import { describe, expect, test } from 'bun:test';
import {
  estimateChargeTimeMinutes,
  estimateRuntimeMinutes,
  formatDuration,
  isBatteryFull,
} from '../src/lib/battery-estimates';

const ts = '2026-04-27T12:00:00.000Z';

function state(fields: Record<string, string>) {
  return Object.fromEntries(
    Object.entries(fields).map(([field, value]) => [field, { value, ts }]),
  );
}

describe('battery estimate counters', () => {
  test('estimates runtime from net discharge instead of raw output', () => {
    expect(estimateRuntimeMinutes(state({
      total_battery_percent: '50',
      battery_capacity: '6000',
      ac_output_power: '700',
      dc_output_power: '100',
      dc_input_power: '200',
    }))).toBe(300);
  });

  test('does not estimate runtime while input covers the load', () => {
    expect(estimateRuntimeMinutes(state({
      total_battery_percent: '50',
      battery_capacity: '6000',
      ac_output_power: '500',
      dc_input_power: '490',
    }))).toBeNull();
  });

  test('estimates charge time to the configured charge ceiling from net charge', () => {
    expect(estimateChargeTimeMinutes(state({
      total_battery_percent: '50',
      battery_capacity: '6000',
      battery_range_end: '80',
      ac_input_power: '900',
      ac_output_power: '300',
    }))).toBe(180);
  });

  test('reports zero charge time when the battery is already at the configured ceiling', () => {
    expect(estimateChargeTimeMinutes(state({
      total_battery_percent: '80',
      battery_capacity: '6000',
      battery_range_end: '80',
      ac_input_power: '900',
    }))).toBe(0);
  });

  test('treats the configured charge ceiling as full for dashboard status', () => {
    expect(isBatteryFull(state({
      total_battery_percent: '80',
      battery_range_end: '80',
    }))).toBe(true);
  });

  test('formats unavailable or zero durations with the dashboard placeholder', () => {
    expect(formatDuration(null)).toBe('--');
    expect(formatDuration(0)).toBe('--');
  });

  test('prefers direct device counters when they are published', () => {
    expect(estimateRuntimeMinutes(state({
      battery_range_to_empty: '42',
      total_battery_percent: '50',
      battery_capacity: '6000',
      ac_output_power: '900',
    }))).toBe(42);

    expect(estimateChargeTimeMinutes(state({
      battery_range_to_full: '37',
      total_battery_percent: '50',
      battery_capacity: '6000',
      ac_input_power: '900',
    }))).toBe(37);
  });
});
