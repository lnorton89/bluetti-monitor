/**
 * useTelemetryState - Centralized hook for telemetry state classification
 * 
 * Classifies the current telemetry state into meaningful categories that inform
 * the UI about what's happening with the data connection:
 * - isLoading: Never connected, waiting for initial data
 * - isConnected: WebSocket connected with active data
 * - isStale: Connected but data is getting old
 * - isOffline: Was connected, now disconnected
 * - isPartial: Some fields missing from expected data
 */

import { useWsStore } from '../store/ws';

const STALE_THRESHOLD_MS = 30000; // 30 seconds
const FRESH_THRESHOLD_MS = 10000;  // 10 seconds

export interface TelemetryState {
  // Classification flags
  isLoading: boolean;    // Never connected, empty state
  isConnected: boolean;  // WebSocket connected with data
  isStale: boolean;      // Connected but data is old
  isOffline: boolean;    // Was connected, now disconnected
  isPartial: boolean;    // Some fields missing

  // Raw data from store
  connected: boolean;
  lastUpdate: string | null;
  devices: string[];

  // Derived labels for UI
  stateLabel: string;        // "Loading...", "Live", "Stale", "Offline", "Reconnecting..."
  staleSeverity: 'fresh' | 'aging' | 'stale' | null;

  // Actions
  reconnect: () => void;
}

/**
 * Get the list of devices from the current state
 */
function getDevices(state: Record<string, Record<string, { value: string; ts: string }>>): string[] {
  return Object.keys(state);
}

/**
 * Calculate how stale the data is based on lastUpdate timestamp
 * Returns null if lastUpdate is null (never received data)
 */
function calculateStaleSeverity(lastUpdate: string | null): 'fresh' | 'aging' | 'stale' | null {
  if (!lastUpdate) return null;

  const age = Date.now() - new Date(lastUpdate).getTime();

  if (age < FRESH_THRESHOLD_MS) {
    return 'fresh';
  } else if (age < STALE_THRESHOLD_MS) {
    return 'aging';
  } else {
    return 'stale';
  }
}

/**
 * Get a human-readable label for the current telemetry state
 */
function getStateLabel(
  isLoading: boolean,
  connected: boolean,
  isStale: boolean,
  devices: string[]
): string {
  if (isLoading) {
    return 'Loading...';
  }

  if (!connected && devices.length > 0) {
    return 'Reconnecting...';
  }

  if (connected && isStale) {
    return 'Stale';
  }

  if (connected) {
    return 'Live';
  }

  return 'Offline';
}

export function useTelemetryState(): TelemetryState {
  const { connected, lastUpdate, state, connect } = useWsStore();

  // Get list of devices from current state
  const devices = getDevices(state);

  // Calculate derived state flags
  const isLoading = !connected && devices.length === 0;
  const isConnected = connected && devices.length > 0;
  const staleSeverity = calculateStaleSeverity(lastUpdate);
  const isStale = connected && lastUpdate !== null && staleSeverity === 'stale';
  const isOffline = !connected && devices.length > 0;

  // For now, isPartial is simplified - could be enhanced to check for missing fields
  const isPartial = false;

  // Get human-readable label
  const stateLabel = getStateLabel(isLoading, connected, isStale, devices);

  return {
    // Classification flags
    isLoading,
    isConnected,
    isStale,
    isOffline,
    isPartial,

    // Raw data
    connected,
    lastUpdate,
    devices,

    // Derived labels
    stateLabel,
    staleSeverity,

    // Actions
    reconnect: connect,
  };
}
