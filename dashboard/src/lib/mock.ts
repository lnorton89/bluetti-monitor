import type { AllState, HistoryPoint } from './api';

const now = Date.now();

function isoOffset(minutesAgo: number) {
  return new Date(now - minutesAgo * 60_000).toISOString();
}

export const mockState: AllState = {
  AC5002237000003358: {
    dc_input_power: { value: '742', ts: isoOffset(0) },
    ac_input_power: { value: '0', ts: isoOffset(0) },
    ac_output_power: { value: '486', ts: isoOffset(0) },
    dc_output_power: { value: '92', ts: isoOffset(0) },
    total_battery_percent: { value: '67', ts: isoOffset(0) },
    total_battery_voltage: { value: '54.1', ts: isoOffset(0) },
    total_battery_current: { value: '11.6', ts: isoOffset(0) },
    ac_output_on: { value: 'True', ts: isoOffset(0) },
    dc_output_on: { value: 'True', ts: isoOffset(0) },
    grid_charge_on: { value: 'False', ts: isoOffset(0) },
    ups_mode: { value: 'True', ts: isoOffset(0) },
    internal_temp: { value: '32', ts: isoOffset(1) },
    fan_speed: { value: '1180', ts: isoOffset(1) },
    pv1_voltage: { value: '63.8', ts: isoOffset(0) },
    pv2_voltage: { value: '61.1', ts: isoOffset(0) },
    pack_details1: { value: '{"percent":67,"voltage":54.1}', ts: isoOffset(0) },
  },
};

export const mockHistory: Record<string, HistoryPoint[]> = {
  ac_output_power: Array.from({ length: 24 }, (_, index) => ({
    value: String(380 + ((index * 17) % 140)),
    ts: isoOffset(23 - index),
  })),
  dc_input_power: Array.from({ length: 24 }, (_, index) => ({
    value: String(520 + ((index * 29) % 260)),
    ts: isoOffset(23 - index),
  })),
  total_battery_percent: Array.from({ length: 24 }, (_, index) => ({
    value: String(58 + Math.round(index * 0.4)),
    ts: isoOffset(23 - index),
  })),
};

export function getMockDevices() {
  return Object.keys(mockState);
}

export function getMockFields(device: string) {
  return Object.keys(mockState[device] ?? {});
}

export function getMockHistory(field: string, limit = 500) {
  return (mockHistory[field] ?? []).slice(-limit);
}
