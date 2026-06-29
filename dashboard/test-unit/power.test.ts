import { describe, expect, test } from 'bun:test';
import { getCurrentInputWatts, getCurrentSolarInputWatts } from '../src/lib/power';

describe('power helpers', () => {
  test('separates total input from solar-only input', () => {
    const state = {
      ac_input_power: { value: '500', ts: '2026-06-16T12:00:00.000Z' },
      dc_input_1_power: { value: '300', ts: '2026-06-16T12:00:00.000Z' },
      dc_input_2_power: { value: '250', ts: '2026-06-16T12:00:00.000Z' },
    };

    expect(getCurrentInputWatts(state)).toBe(1050);
    expect(getCurrentSolarInputWatts(state)).toBe(550);
  });
});
