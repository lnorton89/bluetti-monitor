import { useEffect, useRef, useState } from 'react';
import type { AllState, DeviceState } from './api';
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
  percent: number;
  silent: boolean;
  subtitle: string;
  title: string;
  type: 'battery-full';
};

function parseNumericValue(raw: string | undefined) {
  if (raw === undefined) {
    return null;
  }

  const parsed = Number.parseFloat(raw);
  return Number.isFinite(parsed) ? parsed : null;
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
  percent: number,
  ceiling: number,
): BatteryFullNotificationPayload {
  const roundedPercent = Math.round(percent);
  const roundedCeiling = Math.round(ceiling);
  const reachedConfiguredCeiling = roundedCeiling < 100;

  return {
    type: 'battery-full',
    deviceId,
    percent,
    ceiling,
    silent: false,
    subtitle: 'Bluetti Monitor',
    title: reachedConfiguredCeiling
      ? `${deviceId} reached its charge ceiling`
      : `${deviceId} reached full charge`,
    body: reachedConfiguredCeiling
      ? `Battery reached the configured ${roundedCeiling}% state of charge.`
      : `Battery is now at ${roundedPercent}% state of charge.`,
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
  const hostBridge = (window as Window & {
    __electrobunSendToHost?: (message: unknown) => void;
  }).__electrobunSendToHost;

  if (typeof hostBridge === 'function') {
    hostBridge(payload);
  }
}

export function useBatteryFullNotifications(allState: AllState) {
  const [browserNotificationPermission, setBrowserNotificationPermission] =
    useState<BrowserNotificationPermissionState>(getBrowserNotificationPermission);
  const deviceSnapshotsRef = useRef<Record<string, BatterySnapshot>>({});
  const browserBatteryFullEnabled = useAppSettingsStore((s) => s.alerts.batteryFullBrowser);
  const desktopBatteryFullEnabled = useAppSettingsStore((s) => s.alerts.batteryFullDesktop);
  const desktopNotificationsAvailable =
    typeof window !== 'undefined'
    && typeof (window as Window & { __electrobunSendToHost?: unknown }).__electrobunSendToHost === 'function';

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
        const payload = buildBatteryFullNotification(deviceId, percent, ceiling);
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
  }, [allState, browserBatteryFullEnabled, desktopBatteryFullEnabled]);

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
