/**
 * Shared control patterns for Charts and Solar pages.
 *
 * Range presets: Time range selectors used in chart controls.
 * Device selector: Hook for selecting the active device from the live device list.
 */

import { useEffect, useState } from 'react';

export const RANGE_PRESETS = [
  { id: '1h', label: '1H', minutes: 60, limit: 720, bucketMs: 60_000 },
  { id: '6h', label: '6H', minutes: 360, limit: 2_400, bucketMs: 5 * 60_000 },
  { id: '24h', label: '24H', minutes: 1_440, limit: 5_000, bucketMs: 15 * 60_000 },
  { id: '72h', label: '3D', minutes: 4_320, limit: 5_000, bucketMs: 60 * 60_000 },
] as const;

export type RangePreset = typeof RANGE_PRESETS[number];

/**
 * Hook that manages device selection state, defaulting to the first device
 * and resetting when the device list changes.
 */
export function useDeviceSelector(devices: string[]): {
  selectedDevice: string;
  setSelectedDevice: (device: string) => void;
} {
  const [selectedDevice, setSelectedDevice] = useState(devices[0] ?? '');

  useEffect(() => {
    if (devices.length === 0) {
      setSelectedDevice('');
      return;
    }
    if (!selectedDevice || !devices.includes(selectedDevice)) {
      setSelectedDevice(devices[0]);
    }
  }, [devices, selectedDevice]);

  return { selectedDevice, setSelectedDevice };
}
