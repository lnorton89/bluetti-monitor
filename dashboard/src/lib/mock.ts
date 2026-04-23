import type { AllState, FetchHistoryOptions, HistoryPoint } from './api';

const now = Date.now();

function isoOffset(minutesAgo: number) {
  return new Date(now - minutesAgo * 60_000).toISOString();
}

function round(value: number, digits = 0) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

const historyIntervals = Array.from({ length: 96 }, (_, index) => 1_425 - index * 15);
const mockHistoryRows = historyIntervals.map((minutesAgo, index, all) => {
  const progress = index / Math.max(1, all.length - 1);
  const daylight = Math.max(0, Math.sin(progress * Math.PI));
  const cloudCover = Math.sin(progress * Math.PI * 4) * 0.14;
  const solarInput = round(160 + daylight * 690 + cloudCover * 120);
  const splitBias = Math.sin(progress * Math.PI * 2.4) * 0.09;
  const pv1Power = round(Math.max(0, solarInput * (0.52 + splitBias)));
  const pv2Power = round(Math.max(0, solarInput - pv1Power));
  const gridInput = round(progress > 0.72 ? 80 + Math.sin(progress * Math.PI * 10) * 22 : 0);
  const acOutput = round(360 + progress * 210 + Math.sin(progress * Math.PI * 3.6) * 92);
  const dcOutput = round(58 + Math.cos(progress * Math.PI * 5) * 14);
  const net = solarInput + gridInput - acOutput - dcOutput;
  const batteryPercent = round(61 + progress * 9 + net / 420, 1);
  const batteryVoltage = round(52.4 + batteryPercent * 0.028 + Math.sin(progress * Math.PI * 2) * 0.3, 1);
  const pv1Voltage = round(63.6 + daylight * 4.4 + Math.sin(progress * Math.PI * 5) * 1.2, 1);
  const pv2Voltage = round(61.2 + daylight * 3.9 + Math.cos(progress * Math.PI * 4.4) * 1.1, 1);
  const pv1Current = round(pv1Voltage > 0 ? pv1Power / pv1Voltage : 0, 1);
  const pv2Current = round(pv2Voltage > 0 ? pv2Power / pv2Voltage : 0, 1);
  const internalTemp = round(28 + (acOutput / 520) * 9 + daylight * 3.5, 1);
  const fanSpeed = round(Math.max(680, 820 + internalTemp * 12 + Math.max(net * -1, 0) / 6));
  const batteryToFull = round(Math.max(0, ((100 - batteryPercent) / Math.max(0.45, 0.7 + daylight * 1.15)) * 60));

  return {
    ts: isoOffset(minutesAgo),
    solarInput,
    pv1Power,
    pv2Power,
    pv1Voltage,
    pv2Voltage,
    pv1Current,
    pv2Current,
    gridInput,
    acOutput,
    dcOutput,
    batteryPercent,
    batteryVoltage,
    batteryToFull,
    internalTemp,
    fanSpeed,
  };
});

export const mockState: AllState = {
  AC5002237000003358: {
    device_type: { value: 'AC500', ts: isoOffset(0) },
    serial_number: { value: '2237000003358', ts: isoOffset(0) },
    dc_input_power: { value: '742', ts: isoOffset(0) },
    ac_input_power: { value: '0', ts: isoOffset(0) },
    ac_output_power: { value: '486', ts: isoOffset(0) },
    dc_output_power: { value: '92', ts: isoOffset(0) },
    total_battery_percent: { value: '67', ts: isoOffset(0) },
    total_battery_voltage: { value: '54.1', ts: isoOffset(0) },
    total_battery_current: { value: '11.6', ts: isoOffset(0) },
    battery_range_to_empty: { value: '256', ts: isoOffset(0) },
    battery_range_to_full: { value: '184', ts: isoOffset(0) },
    battery_range_end: { value: '100', ts: isoOffset(0) },
    ac_output_on: { value: 'True', ts: isoOffset(0) },
    dc_output_on: { value: 'True', ts: isoOffset(0) },
    grid_charge_on: { value: 'False', ts: isoOffset(0) },
    ups_mode: { value: 'True', ts: isoOffset(0) },
    internal_temp: { value: '32', ts: isoOffset(1) },
    fan_speed: { value: '1180', ts: isoOffset(1) },
    pv1_power: { value: '402', ts: isoOffset(0) },
    pv2_power: { value: '340', ts: isoOffset(0) },
    pv1_voltage: { value: '63.8', ts: isoOffset(0) },
    pv2_voltage: { value: '61.1', ts: isoOffset(0) },
    pv1_current: { value: '6.3', ts: isoOffset(0) },
    pv2_current: { value: '5.6', ts: isoOffset(0) },
    pack_details1: { value: '{"percent":67,"voltage":54.1}', ts: isoOffset(0) },
  },
};

export const mockHistory: Record<string, HistoryPoint[]> = {
  dc_input_power: mockHistoryRows.map((point) => ({ value: String(point.solarInput), ts: point.ts })),
  pv1_power: mockHistoryRows.map((point) => ({ value: String(point.pv1Power), ts: point.ts })),
  pv2_power: mockHistoryRows.map((point) => ({ value: String(point.pv2Power), ts: point.ts })),
  pv1_voltage: mockHistoryRows.map((point) => ({ value: String(point.pv1Voltage), ts: point.ts })),
  pv2_voltage: mockHistoryRows.map((point) => ({ value: String(point.pv2Voltage), ts: point.ts })),
  pv1_current: mockHistoryRows.map((point) => ({ value: String(point.pv1Current), ts: point.ts })),
  pv2_current: mockHistoryRows.map((point) => ({ value: String(point.pv2Current), ts: point.ts })),
  ac_input_power: mockHistoryRows.map((point) => ({ value: String(point.gridInput), ts: point.ts })),
  ac_output_power: mockHistoryRows.map((point) => ({ value: String(point.acOutput), ts: point.ts })),
  dc_output_power: mockHistoryRows.map((point) => ({ value: String(point.dcOutput), ts: point.ts })),
  total_battery_percent: mockHistoryRows.map((point) => ({ value: String(point.batteryPercent), ts: point.ts })),
  total_battery_voltage: mockHistoryRows.map((point) => ({ value: String(point.batteryVoltage), ts: point.ts })),
  battery_range_to_full: mockHistoryRows.map((point) => ({ value: String(point.batteryToFull), ts: point.ts })),
  internal_temp: mockHistoryRows.map((point) => ({ value: String(point.internalTemp), ts: point.ts })),
  fan_speed: mockHistoryRows.map((point) => ({ value: String(point.fanSpeed), ts: point.ts })),
  device_type: [{ value: 'AC500', ts: isoOffset(0) }],
  serial_number: [{ value: '2237000003358', ts: isoOffset(0) }],
};

export function getMockDevices() {
  return Object.keys(mockState);
}

export function getMockFields(device: string) {
  return Object.keys(mockState[device] ?? {});
}

export function getMockHistory(field: string, options: number | FetchHistoryOptions = 500) {
  const resolved = typeof options === 'number' ? { limit: options } : options;
  const limit = resolved.limit ?? 500;
  const sinceTs = resolved.since ? Date.parse(resolved.since) : null;
  const filtered = (mockHistory[field] ?? [])
    .filter((point) => sinceTs === null || Date.parse(point.ts) >= sinceTs)
    .toSorted((left, right) => Date.parse(right.ts) - Date.parse(left.ts));

  return filtered.slice(0, limit);
}
