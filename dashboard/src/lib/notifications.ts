import { useEffect, useRef, useState } from 'react';
import type { AllState, DeviceState } from './api';
import { isDesktopHostAvailable, sendToDesktopHost } from './desktop-host';
import { useAppSettingsStore } from '../store/settings';

export type BrowserNotificationPermissionState =
  | NotificationPermission
  | 'unsupported';

type BatterySnapshot = {
  ceiling: number;
  percent: number;
};

type BatteryFullNotificationPayload = {
  body: string;
  ceiling: number;
  deviceId: string;
  inputWatts: number;
  outputWatts: number;
  percent: number;
  silent: boolean;
  subtitle: string;
  title: string;
  type: 'battery-full';
};

type StatusNotificationPayload = {
  body: string;
  deviceId: string;
  inputWatts: number;
  outputWatts: number;
  percent: number;
  title: string;
};

function parseNumericValue(raw: string | undefined) {
  if (raw === undefined) {
    return null;
  }

  const parsed = Number.parseFloat(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function sumNumericFields(state: DeviceState, fields: string[]) {
  return fields.reduce((total, field) => total + (parseNumericValue(state[field]?.value) ?? 0), 0);
}

function getFirstNumericValue(state: DeviceState, fields: string[]) {
  for (const field of fields) {
    const value = parseNumericValue(state[field]?.value);
    if (value !== null) {
      return value;
    }
  }

  return null;
}

export function getCurrentInputWatts(state: DeviceState) {
  const gridInput = getFirstNumericValue(state, ['ac_input_power', 'grid_charge_power']) ?? 0;
  const splitSolarInput = sumNumericFields(state, ['pv1_power', 'pv2_power', 'dc_input_power1', 'dc_input_power2']);
  const totalSolarInput = getFirstNumericValue(state, ['dc_input_power', 'pv_input_power', 'solar_power']) ?? 0;

  return gridInput + (splitSolarInput > 0 ? splitSolarInput : totalSolarInput);
}

export function getCurrentOutputWatts(state: DeviceState) {
  return sumNumericFields(state, ['ac_output_power', 'dc_output_power']);
}

export function getBatteryPercent(state: DeviceState) {
  return (
    parseNumericValue(state.total_battery_percent?.value)
    ?? parseNumericValue(state.battery_percent?.value)
    ?? parseNumericValue(state.charge_level?.value)
    ?? parseNumericValue(state.soc?.value)
  );
}

export function getChargeCeilingPercent(state: DeviceState) {
  const configuredCeiling = parseNumericValue(state.battery_range_end?.value);

  if (configuredCeiling === null) {
    return 100;
  }

  return Math.max(0, Math.min(100, configuredCeiling));
}

export function shouldNotifyBatteryFull(
  previousPercent: number | null,
  currentPercent: number | null,
  ceiling: number,
) {
  if (previousPercent === null || currentPercent === null) {
    return false;
  }

  return previousPercent < ceiling && currentPercent >= ceiling;
}

function getBrowserNotificationPermission(): BrowserNotificationPermissionState {
  if (typeof window === 'undefined' || typeof window.Notification === 'undefined') {
    return 'unsupported';
  }

  return window.Notification.permission;
}

function buildBatteryFullNotification(
  deviceId: string,
  state: DeviceState,
  percent: number,
  ceiling: number,
): BatteryFullNotificationPayload {
  const roundedPercent = Math.round(percent);
  const roundedCeiling = Math.round(ceiling);
  const reachedConfiguredCeiling = roundedCeiling < 100;
  const inputWatts = getCurrentInputWatts(state);
  const outputWatts = getCurrentOutputWatts(state);
  const telemetryLine = `Input ${Math.round(inputWatts)} W - Output ${Math.round(outputWatts)} W - SOC ${roundedPercent}%`;

  return {
    type: 'battery-full',
    deviceId,
    inputWatts,
    outputWatts,
    percent,
    ceiling,
    silent: false,
    subtitle: 'Bluetti Monitor',
    title: reachedConfiguredCeiling
      ? `${deviceId} reached its charge ceiling`
      : `${deviceId} reached full charge`,
    body: reachedConfiguredCeiling
      ? `Battery reached the configured ${roundedCeiling}% state of charge. ${telemetryLine}.`
      : `Battery is now at ${roundedPercent}% state of charge. ${telemetryLine}.`,
  };
}

function showBrowserNotification(payload: BatteryFullNotificationPayload) {
  if (typeof window === 'undefined' || typeof window.Notification === 'undefined') {
    return;
  }

  if (window.Notification.permission !== 'granted') {
    return;
  }

  const notification = new window.Notification(payload.title, {
    body: payload.body,
    tag: `battery-full-${payload.deviceId}`,
  });

  window.setTimeout(() => notification.close(), 15_000);
}

function sendDesktopNotification(payload: BatteryFullNotificationPayload) {
  sendToDesktopHost(payload);
}

export function buildNtfyUrl(server: string, topic: string) {
  const trimmedServer = server.trim().replace(/\/+$/, '');
  const trimmedTopic = topic.trim().replace(/^\/+|\/+$/g, '');

  if (!trimmedServer || !trimmedTopic) {
    return null;
  }

  return `${trimmedServer}/${encodeURIComponent(trimmedTopic)}`;
}

export function buildStatusNotification(deviceId: string, state: DeviceState): StatusNotificationPayload | null {
  const percent = getBatteryPercent(state);

  if (percent === null) {
    return null;
  }

  const inputWatts = getCurrentInputWatts(state);
  const outputWatts = getCurrentOutputWatts(state);
  const roundedPercent = Math.round(percent);
  const roundedInput = Math.round(inputWatts);
  const roundedOutput = Math.round(outputWatts);

  return {
    deviceId,
    inputWatts,
    outputWatts,
    percent,
    title: `${deviceId} power status`,
    body: `Input ${roundedInput} W - Output ${roundedOutput} W - SOC ${roundedPercent}%`,
  };
}

async function sendNtfyStatusNotification(
  payload: StatusNotificationPayload,
  server: string,
  topic: string,
) {
  const url = buildNtfyUrl(server, topic);

  if (!url) {
    return false;
  }

  const params = new URLSearchParams({
    priority: 'default',
    tags: 'battery,plug',
    title: payload.title,
  });

  try {
    const response = await fetch(`${url}?${params.toString()}`, {
      method: 'POST',
      body: payload.body,
    });
    return response.ok;
  } catch (error) {
    console.warn('[notifications] failed to send ntfy notification', error);
    return false;
  }
}

export function useBatteryFullNotifications(allState: AllState) {
  const [browserNotificationPermission, setBrowserNotificationPermission] =
    useState<BrowserNotificationPermissionState>(getBrowserNotificationPermission);
  const deviceSnapshotsRef = useRef<Record<string, BatterySnapshot>>({});
  const ntfyLastSentAtRef = useRef<Record<string, number>>({});
  const browserBatteryFullEnabled = useAppSettingsStore((s) => s.alerts.batteryFullBrowser);
  const desktopBatteryFullEnabled = useAppSettingsStore((s) => s.alerts.batteryFullDesktop);
  const ntfyEnabled = useAppSettingsStore((s) => s.alerts.ntfyEnabled);
  const ntfyIntervalMinutes = useAppSettingsStore((s) => s.alerts.ntfyIntervalMinutes);
  const ntfyServer = useAppSettingsStore((s) => s.alerts.ntfyServer);
  const ntfyTopic = useAppSettingsStore((s) => s.alerts.ntfyTopic);
  const desktopNotificationsAvailable = isDesktopHostAvailable();

  useEffect(() => {
    setBrowserNotificationPermission(getBrowserNotificationPermission());
  }, []);

  useEffect(() => {
    const nextSnapshots: Record<string, BatterySnapshot> = {};

    for (const [deviceId, state] of Object.entries(allState)) {
      const percent = getBatteryPercent(state);

      if (percent === null) {
        continue;
      }

      const ceiling = getChargeCeilingPercent(state);
      const previous = deviceSnapshotsRef.current[deviceId] ?? null;

      if (shouldNotifyBatteryFull(previous?.percent ?? null, percent, ceiling)) {
        const payload = buildBatteryFullNotification(deviceId, state, percent, ceiling);
        if (browserBatteryFullEnabled) {
          showBrowserNotification(payload);
        }
        if (desktopBatteryFullEnabled) {
          sendDesktopNotification(payload);
        }
      }

      nextSnapshots[deviceId] = { ceiling, percent };
    }

    deviceSnapshotsRef.current = nextSnapshots;
  }, [allState, browserBatteryFullEnabled, desktopBatteryFullEnabled, ntfyEnabled, ntfyServer, ntfyTopic]);

  useEffect(() => {
    if (!ntfyEnabled || !buildNtfyUrl(ntfyServer, ntfyTopic)) {
      ntfyLastSentAtRef.current = {};
      return;
    }

    const intervalMs = Math.max(1, ntfyIntervalMinutes) * 60_000;
    const now = Date.now();

    for (const [deviceId, state] of Object.entries(allState)) {
      const previousSentAt = ntfyLastSentAtRef.current[deviceId] ?? 0;

      if (now - previousSentAt < intervalMs) {
        continue;
      }

      const payload = buildStatusNotification(deviceId, state);

      if (!payload) {
        continue;
      }

      ntfyLastSentAtRef.current[deviceId] = now;
      void sendNtfyStatusNotification(payload, ntfyServer, ntfyTopic).then((sent) => {
        if (!sent) {
          ntfyLastSentAtRef.current[deviceId] = previousSentAt;
        }
      });
    }
  }, [allState, ntfyEnabled, ntfyIntervalMinutes, ntfyServer, ntfyTopic]);

  async function requestBrowserNotifications() {
    if (typeof window === 'undefined' || typeof window.Notification === 'undefined') {
      setBrowserNotificationPermission('unsupported');
      return 'unsupported' as const;
    }

    const permission = await window.Notification.requestPermission();
    setBrowserNotificationPermission(permission);
    return permission;
  }

  return {
    browserNotificationPermission,
    desktopNotificationsAvailable,
    requestBrowserNotifications,
  };
}
