import type { DeviceState } from './api';

const DEVICE_ID_PATTERN = /^(AC200M|AC300|AC500|AC60|EB3A|EP500P|EP500|EP600)[-_]?(.*)$/i;

export function getDeviceModel(state: DeviceState, deviceId: string): string {
  const reported = state['device_type']?.value?.trim();
  if (reported) {
    return reported;
  }

  const parsed = parseDeviceId(deviceId);
  return parsed?.model ?? deviceId;
}

export function getDeviceSerial(state: DeviceState, deviceId: string): string {
  const reported = state['serial_number']?.value?.trim();
  if (reported) {
    return reported;
  }

  const parsed = parseDeviceId(deviceId);
  return parsed?.serial ?? deviceId;
}

function parseDeviceId(deviceId: string): { model: string; serial: string | null } | null {
  const match = DEVICE_ID_PATTERN.exec(deviceId);
  if (!match) {
    return null;
  }

  const model = match[1];
  const serial = match[2]?.trim() || null;
  if (!model) {
    return null;
  }

  return { model: model.toUpperCase(), serial };
}
