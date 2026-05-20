import axios from 'axios';

export const API_BASE = import.meta.env.VITE_API_URL ?? '/api';
export const WS_URL =
  import.meta.env.VITE_WS_URL
  ?? `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/ws`;
export const IS_MOCK_MODE =
  import.meta.env.VITE_MOCK_DATA === '1'
  || new URLSearchParams(window.location.search).get('mock') === '1';

const api = axios.create({ baseURL: API_BASE });

export interface FieldValue {
  value: string;
  ts: string;
}

export type DeviceState = Record<string, FieldValue>;
export type AllState = Record<string, DeviceState>;

export interface HistoryPoint {
  value: string;
  ts: string;
}

export interface FetchHistoryOptions {
  limit?: number;
  since?: string;
}

const now = Date.now();

function isoOffset(minutesAgo: number) {
  return new Date(now - minutesAgo * 60_000).toISOString();
}

function round(value: number, digits = 0) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

const mockRows = Array.from({ length: 288 }, (_, index) => {
  const minutesAgo = (287 - index) * 5;
  const progress = index / 287;
  const daylight = Math.max(0, Math.sin(progress * Math.PI));
  const solar = round(70 + daylight * 760 + Math.sin(progress * Math.PI * 9) * 38);
  const grid = progress > 0.78 ? round(90 + Math.sin(progress * Math.PI * 18) * 20) : 0;
  const acLoad = round(180 + progress * 120 + Math.sin(progress * Math.PI * 6) * 46);
  const dcLoad = round(Math.max(0, 22 + Math.cos(progress * Math.PI * 5) * 14));
  const net = solar + grid - acLoad - dcLoad;
  const battery = round(71 + progress * 22 + net / 650, 1);

  return {
    ts: isoOffset(minutesAgo),
    dc_input_power: solar,
    ac_input_power: grid,
    ac_output_power: acLoad,
    dc_output_power: dcLoad,
    total_battery_percent: Math.min(100, Math.max(0, battery)),
    total_battery_voltage: round(50.8 + battery * 0.03, 1),
    internal_ac_voltage: round(120 + Math.sin(progress * Math.PI * 12) * 1.4, 1),
    internal_power_one: round(acLoad * 0.54),
    internal_power_two: round(acLoad * 0.46),
    internal_dc_input_power: Math.max(0, solar - 24),
    power_generation: round(238 + progress * 10.2, 2),
    pack_voltage: round(50.6 + battery * 0.028, 1),
  };
});

export const mockState: AllState = {
  'AC500-2237000003358': {
    device_type: { value: 'AC500', ts: isoOffset(0) },
    serial_number: { value: '2237000003358', ts: isoOffset(0) },
    dc_input_power: { value: String(mockRows.at(-1)?.dc_input_power ?? 0), ts: isoOffset(0) },
    ac_input_power: { value: String(mockRows.at(-1)?.ac_input_power ?? 0), ts: isoOffset(0) },
    ac_output_power: { value: String(mockRows.at(-1)?.ac_output_power ?? 0), ts: isoOffset(0) },
    dc_output_power: { value: String(mockRows.at(-1)?.dc_output_power ?? 0), ts: isoOffset(0) },
    total_battery_percent: { value: String(mockRows.at(-1)?.total_battery_percent ?? 0), ts: isoOffset(0) },
    total_battery_voltage: { value: String(mockRows.at(-1)?.total_battery_voltage ?? 0), ts: isoOffset(0) },
    internal_ac_voltage: { value: String(mockRows.at(-1)?.internal_ac_voltage ?? 0), ts: isoOffset(0) },
    internal_power_one: { value: String(mockRows.at(-1)?.internal_power_one ?? 0), ts: isoOffset(0) },
    internal_power_two: { value: String(mockRows.at(-1)?.internal_power_two ?? 0), ts: isoOffset(0) },
    internal_dc_input_power: { value: String(mockRows.at(-1)?.internal_dc_input_power ?? 0), ts: isoOffset(0) },
    power_generation: { value: String(mockRows.at(-1)?.power_generation ?? 0), ts: isoOffset(0) },
    ac_output_on: { value: 'ON', ts: isoOffset(0) },
    dc_output_on: { value: 'OFF', ts: isoOffset(0) },
    ups_mode: { value: 'CUSTOMIZED', ts: isoOffset(0) },
  },
};

function mockHistoryFor(field: string, options: FetchHistoryOptions = {}) {
  const sinceTs = options.since ? Date.parse(options.since) : null;
  const limit = options.limit ?? 500;

  return mockRows
    .map((row) => ({ value: String(row[field as keyof typeof row] ?? ''), ts: row.ts }))
    .filter((point) => point.value !== '')
    .filter((point) => sinceTs === null || Date.parse(point.ts) >= sinceTs)
    .sort((left, right) => Date.parse(right.ts) - Date.parse(left.ts))
    .slice(0, limit);
}

export async function fetchStatus() {
  return IS_MOCK_MODE ? mockState : api.get<AllState>('/status').then((response) => response.data);
}

export async function fetchDevices() {
  return IS_MOCK_MODE ? Object.keys(mockState) : api.get<string[]>('/devices').then((response) => response.data);
}

export async function fetchFields(device: string) {
  return IS_MOCK_MODE
    ? Object.keys(mockState[device] ?? {})
    : api.get<string[]>(`/fields/${device}`).then((response) => response.data);
}

export async function fetchHistoryBundle(
  device: string,
  fields: string[],
  options: FetchHistoryOptions = {},
) {
  const uniqueFields = [...new Set(fields)].filter(Boolean);

  if (IS_MOCK_MODE) {
    return Object.fromEntries(uniqueFields.map((field) => [field, mockHistoryFor(field, options)]));
  }

  return api.get<Record<string, HistoryPoint[]>>(`/history/${device}`, {
    params: {
      ...options,
      fields: uniqueFields.join(','),
    },
  }).then((response) => response.data);
}

export interface LiveUpdate {
  device: string;
  field: string;
  value: string;
  ts: string;
}

export type SnapshotMessage = { type: 'snapshot'; data: AllState };
export type WsMessage = SnapshotMessage | LiveUpdate;
