import { describe, expect, test } from 'bun:test';
import {
  buildBatteryEstimate,
  estimateChargeTimeMinutes,
  estimateRuntimeMinutes,
  formatDuration,
  isBatteryFull,
} from '../src/lib/battery-estimates';

const ts = '2026-04-27T12:00:00.000Z';
const CAPACITY = 6000;

function state(fields: Record<string, string>) {
  return Object.fromEntries(
    Object.entries(fields).map(([field, value]) => [field, { value, ts }]),
  );
}

describe('battery estimate counters', () => {
  test('estimates runtime from net discharge instead of raw output', () => {
    expect(estimateRuntimeMinutes(state({
      total_battery_percent: '50',
      ac_output_power: '700',
      dc_output_power: '100',
      dc_input_power: '200',
    }), CAPACITY)).toBe(300);
  });

  test('does not estimate runtime while input covers the load', () => {
    expect(estimateRuntimeMinutes(state({
      total_battery_percent: '50',
      ac_output_power: '500',
      dc_input_power: '490',
    }), CAPACITY)).toBeNull();
  });

  test('estimates charge time to the configured charge ceiling from net charge', () => {
    expect(estimateChargeTimeMinutes(state({
      total_battery_percent: '50',
      battery_range_end: '80',
      ac_input_power: '900',
      ac_output_power: '300',
    }), CAPACITY)).toBe(180);
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
      ac_output_power: '900',
    }), CAPACITY)).toBe(42);

    expect(estimateChargeTimeMinutes(state({
      battery_range_to_full: '37',
      total_battery_percent: '50',
      ac_input_power: '900',
    }), CAPACITY)).toBe(37);
  });

  test('returns structured confidence and source details for live power estimates', () => {
    const estimate = buildBatteryEstimate('runtime', state({
      total_battery_percent: '50',
      ac_output_power: '700',
      dc_output_power: '100',
      dc_input_power: '200',
    }), {}, CAPACITY);

    expect(estimate.minutes).toBe(300);
    expect(estimate.source).toBe('instant');
    expect(estimate.confidence).toBe('medium');
    expect(estimate.inputs.some((input) => input.includes('net discharge'))).toBe(true);
  });

  test('uses pack_num * 3072 when pack_num is available and battery_capacity is not', () => {
    const result = buildBatteryEstimate('runtime', state({
      total_battery_percent: '50',
      pack_num: '1',
      ac_output_power: '800',
      dc_input_power: '200',
    }));

    expect(result.source).toBe('instant');
    expect(result.minutes).toBeCloseTo(153.6, 1);
  });

  test('pack_num derivation beats configured capacity when both exist', () => {
    const result = buildBatteryEstimate('runtime', state({
      total_battery_percent: '50',
      pack_num: '1',
      ac_output_power: '800',
      dc_input_power: '200',
    }), {}, 99999);

    expect(result.source).toBe('instant');
    expect(result.minutes).toBeCloseTo(153.6, 1);
  });

  test('uses configured capacity fallback when live and historical capacity are missing', () => {
    const estimate = buildBatteryEstimate('runtime', state({
      total_battery_percent: '50',
      ac_output_power: '800',
      dc_input_power: '200',
    }), {}, CAPACITY);

    expect(estimate.source).toBe('instant');
    expect(estimate.minutes).toBe(300);
    expect(estimate.confidence).toBe('medium');
  });

  test('prefers historical calibration over configured capacity fallback', () => {
    const estimate = buildBatteryEstimate('runtime', state({
      total_battery_percent: '50',
      ac_output_power: '1000',
    }), {
      batteryPercent: [
        { value: '60', ts: '2026-04-27T09:00:00.000Z' },
        { value: '55', ts: '2026-04-27T10:00:00.000Z' },
        { value: '50', ts: '2026-04-27T11:00:00.000Z' },
      ],
      acOutput: [
        { value: '600', ts: '2026-04-27T09:00:00.000Z' },
        { value: '600', ts: '2026-04-27T10:00:00.000Z' },
        { value: '600', ts: '2026-04-27T11:00:00.000Z' },
      ],
    }, CAPACITY);

    expect(estimate.source).toBe('historical-calibration');
    expect(estimate.confidence).toBe('medium');
  });

  test('can use historical calibration when live capacity is missing', () => {
    const estimate = buildBatteryEstimate('runtime', state({
      total_battery_percent: '50',
      ac_output_power: '1000',
    }), {
      batteryPercent: [
        { value: '60', ts: '2026-04-27T09:00:00.000Z' },
        { value: '55', ts: '2026-04-27T10:00:00.000Z' },
        { value: '50', ts: '2026-04-27T11:00:00.000Z' },
      ],
      acOutput: [
        { value: '600', ts: '2026-04-27T09:00:00.000Z' },
        { value: '600', ts: '2026-04-27T10:00:00.000Z' },
        { value: '600', ts: '2026-04-27T11:00:00.000Z' },
      ],
    });

    expect(estimate.source).toBe('historical-calibration');
    expect(Math.round(estimate.minutes ?? 0)).toBe(360);
    expect(estimate.confidence).toBe('medium');
  });

  test('keeps charge trend usable across coarse SOC plateaus', () => {
    const estimate = buildBatteryEstimate('charge', state({
      total_battery_percent: '76',
      battery_range_end: '100',
      ac_input_power: '1700',
      ac_output_power: '300',
    }), {
      batteryPercent: [
        { value: '75', ts: '2026-04-27T10:00:00.000Z' },
        { value: '75', ts: '2026-04-27T10:20:00.000Z' },
        { value: '76', ts: '2026-04-27T10:21:00.000Z' },
        { value: '76', ts: '2026-04-27T10:35:00.000Z' },
      ],
    });

    expect(estimate.source).toBe('recent-trend');
    expect(estimate.minutes).not.toBeNull();
  });

  test('uses charge trend from dense polling history when the window spans enough time', () => {
    const start = Date.parse('2026-04-27T10:00:00.000Z');
    const batteryPercent = Array.from({ length: 181 }, (_, index) => {
      const value = index < 60 ? '75' : index < 120 ? '76' : '77';
      return { value, ts: new Date(start + index * 60_000).toISOString() };
    });
    const estimate = buildBatteryEstimate('charge', state({
      total_battery_percent: '77',
      battery_range_end: '100',
      ac_input_power: '1700',
      ac_output_power: '300',
    }), { batteryPercent });

    expect(estimate.source).toBe('recent-trend');
    expect(estimate.minutes).not.toBeNull();
  });
});
