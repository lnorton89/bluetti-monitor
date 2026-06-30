import axios from 'axios';
import { getMockDevices, getMockFields, getMockHistory, mockState } from './mock';
import {
  getCurrentSolarInputWatts,
  PV1_INPUT_FIELDS,
  PV2_INPUT_FIELDS,
  TOTAL_SOLAR_INPUT_FIELDS,
} from './power';

export const API_BASE = import.meta.env.VITE_API_URL ?? '/api';
export const WS_URL =
  import.meta.env.VITE_WS_URL
  ?? `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/ws`;
export const IS_MOCK_MODE =
  import.meta.env.VITE_MOCK_DATA === '1' ||
  new URLSearchParams(window.location.search).get('mock') === '1';

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
  until?: string;
}

export const fetchStatus = () =>
  IS_MOCK_MODE ? Promise.resolve(mockState) : api.get<AllState>('/status').then((r) => r.data);

export const fetchDevices = () =>
  IS_MOCK_MODE ? Promise.resolve(getMockDevices()) : api.get<string[]>('/devices').then((r) => r.data);

export const fetchFields = (device: string) =>
  IS_MOCK_MODE ? Promise.resolve(getMockFields(device)) : api.get<string[]>(`/fields/${device}`).then((r) => r.data);

export const fetchDevice = (device: string) =>
  IS_MOCK_MODE ? Promise.resolve(mockState[device] ?? {}) : api.get<DeviceState>(`/status/${device}`).then((r) => r.data);

export const fetchHistory = (
  device: string,
  field: string,
  options: number | FetchHistoryOptions = 500,
) => {
  const resolved = typeof options === 'number' ? { limit: options } : options;

  return IS_MOCK_MODE
    ? Promise.resolve(getMockHistory(field, resolved))
    : api.get<HistoryPoint[]>(`/history/${device}/${field}`, { params: resolved }).then((r) => r.data);
};

export const fetchHistoryBundle = (
  device: string,
  fields: string[],
  options: FetchHistoryOptions = {},
) => {
  const uniqueFields = [...new Set(fields)].filter(Boolean);

  return IS_MOCK_MODE
    ? Promise.resolve(Object.fromEntries(uniqueFields.map((field) => [field, getMockHistory(field, options)])))
    : api.get<Record<string, HistoryPoint[]>>(`/history/${device}`, {
        params: {
          ...options,
          fields: uniqueFields.join(','),
        },
      }).then((r) => r.data);
};

export const fetchInputMax = (device: string, options: Pick<FetchHistoryOptions, 'since' | 'until'> = {}) => {
  if (IS_MOCK_MODE) {
    const fields = [
      ...TOTAL_SOLAR_INPUT_FIELDS,
      ...PV1_INPUT_FIELDS,
      ...PV2_INPUT_FIELDS,
    ];
    const history = Object.fromEntries(
      fields.map((field) => [field, getMockHistory(field, { limit: 100_000, since: options.since, until: options.until })]),
    );
    const events = Object.entries(history)
      .flatMap(([field, points]) => points.map((point) => ({
        field,
        ts: Date.parse(point.ts),
        value: Number.parseFloat(point.value),
      })))
      .filter((event) => Number.isFinite(event.ts) && Number.isFinite(event.value))
      .sort((left, right) => left.ts - right.ts);
    const state: DeviceState = {};
    const buckets = new Map<number, number[]>();

    for (const event of events) {
      state[event.field] = { value: String(event.value), ts: new Date(event.ts).toISOString() };
      const total = getCurrentSolarInputWatts(state);
      const bucket = Math.floor(event.ts / 60_000);
      buckets.set(bucket, [...(buckets.get(bucket) ?? []), total]);
    }

    const averages = [...buckets.values()]
      .filter((values) => values.length > 0)
      .map((values) => values.reduce((sum, value) => sum + value, 0) / values.length);
    const peak = averages.length > 0 ? Math.max(...averages) : null;

    return Promise.resolve({ value: peak });
  }

  return api.get<{ value: number | null }>(`/stats/${device}/input-max`, {
    params: {
      ...options,
      bucket_seconds: 60,
    },
  }).then((r) => r.data);
};

export const fetchOutputMax = async (
  device: string,
  options: Pick<FetchHistoryOptions, 'since' | 'until'> = {},
) => {
  const history = await fetchHistoryBundle(device, ['ac_output_power', 'dc_output_power'], {
    limit: 100_000,
    ...options,
  });

  const maxForField = (field: string) => {
    const values = (history[field] ?? [])
      .map((point) => Number.parseFloat(point.value))
      .filter((value) => Number.isFinite(value));

    return values.length > 0 ? Math.max(...values) : null;
  };

  return {
    ac: maxForField('ac_output_power'),
    dc: maxForField('dc_output_power'),
  };
};
