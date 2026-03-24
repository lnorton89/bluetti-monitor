import axios from 'axios';

// In Docker: nginx proxies /api → FastAPI and /ws → FastAPI WS
// In dev:    vite.config.ts proxy does the same against localhost:8000
export const API_BASE = import.meta.env.VITE_API_URL ?? '/api';
export const WS_URL   = `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/ws`;

const api = axios.create({ baseURL: API_BASE });

export interface FieldValue {
  value: string;
  ts: string;
}

export type DeviceState = Record<string, FieldValue>;
export type AllState    = Record<string, DeviceState>;

export interface HistoryPoint {
  value: string;
  ts: string;
}

export const fetchStatus   = ()                                           => api.get<AllState>('/status').then(r => r.data);
export const fetchDevices  = ()                                           => api.get<string[]>('/devices').then(r => r.data);
export const fetchFields   = (device: string)                             => api.get<string[]>(`/fields/${device}`).then(r => r.data);
export const fetchDevice   = (device: string)                             => api.get<DeviceState>(`/status/${device}`).then(r => r.data);
export const fetchHistory  = (device: string, field: string, limit = 500) =>
  api.get<HistoryPoint[]>(`/history/${device}/${field}`, { params: { limit } }).then(r => r.data);
