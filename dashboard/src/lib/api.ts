import axios from 'axios';
import { getMockDevices, getMockFields, getMockHistory, mockState } from './mock';

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

export const fetchStatus = () =>
  IS_MOCK_MODE ? Promise.resolve(mockState) : api.get<AllState>('/status').then((r) => r.data);

export const fetchDevices = () =>
  IS_MOCK_MODE ? Promise.resolve(getMockDevices()) : api.get<string[]>('/devices').then((r) => r.data);

export const fetchFields = (device: string) =>
  IS_MOCK_MODE ? Promise.resolve(getMockFields(device)) : api.get<string[]>(`/fields/${device}`).then((r) => r.data);

export const fetchDevice = (device: string) =>
  IS_MOCK_MODE ? Promise.resolve(mockState[device] ?? {}) : api.get<DeviceState>(`/status/${device}`).then((r) => r.data);

export const fetchHistory = (device: string, field: string, limit = 500) =>
  IS_MOCK_MODE
    ? Promise.resolve(getMockHistory(field, limit))
    : api.get<HistoryPoint[]>(`/history/${device}/${field}`, { params: { limit } }).then((r) => r.data);
