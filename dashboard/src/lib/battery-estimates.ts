type FieldValue = { value: string; ts: string };
export type DeviceState = Record<string, FieldValue>;

const AC500_CAPACITY_WH = 5120;

function getField(state: DeviceState, field: string): number | null {
  const raw = state[field]?.value;
  if (raw === undefined) return null;
  const parsed = parseFloat(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

export function getBatteryPercent(state: DeviceState): number | null {
  return (
    getField(state, 'total_battery_percent') ??
    getField(state, 'battery_percent') ??
    getField(state, 'soc') ??
    getField(state, 'charge_level')
  );
}

export function formatDuration(minutes: number | null): string {
  if (minutes === null || !Number.isFinite(minutes) || minutes < 1) {
    return '—';
  }
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  if (hours > 0) {
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }
  return `${mins}m`;
}

export function estimateRuntimeMinutes(state: DeviceState): number | null {
  const rangeToEmpty = getField(state, 'battery_range_to_empty');
  if (rangeToEmpty !== null && rangeToEmpty >= 0) return rangeToEmpty;

  const batteryPercent = getBatteryPercent(state);
  const acOutputW = getField(state, 'ac_output_power');
  const dcOutputW = getField(state, 'dc_output_power');

  if (batteryPercent === null) return null;

  const totalOutputW = (acOutputW ?? 0) + (dcOutputW ?? 0);
  if (totalOutputW <= 0) return null;

  const remainingWh = (batteryPercent / 100) * AC500_CAPACITY_WH;
  const usableWh = Math.max(0, remainingWh - 100);
  return (usableWh / totalOutputW) * 60;
}

export function isChargingFromGrid(state: DeviceState): boolean {
  const gridCharge = state['grid_charge_on']?.value;
  const acCharge = state['ac_charging_on']?.value;
  return gridCharge === 'True' || gridCharge === 'true' ||
         gridCharge === '1' || gridCharge === 'ON' ||
         acCharge === 'True' || acCharge === 'true' ||
         acCharge === '1' || acCharge === 'ON';
}

export function isCharging(state: DeviceState): boolean {
  return isChargingFromGrid(state) || (getField(state, 'dc_input_power') ?? 0) > 0;
}

export function estimateChargeTimeMinutes(state: DeviceState): number | null {
  const rangeToFull = getField(state, 'battery_range_to_full');
  if (rangeToFull !== null && rangeToFull >= 0) return rangeToFull;

  const batteryPercent = getBatteryPercent(state);
  const acInputW = getField(state, 'ac_input_power');

  if (batteryPercent === null) return null;
  if (batteryPercent >= 100) return null;

  const remainingWh = (batteryPercent / 100) * AC500_CAPACITY_WH;
  const deficitWh = AC500_CAPACITY_WH - remainingWh;

  const pv1 = getField(state, 'pv1_power') ?? 0;
  const pv2 = getField(state, 'pv2_power') ?? 0;
  const solarInputW = pv1 + pv2;
  const totalChargeW = (acInputW ?? 0) + solarInputW;

  if (totalChargeW <= 0) return null;

  return (deficitWh / totalChargeW) * 60;
}

export function isBatteryFull(state: DeviceState): boolean {
  const percent = getBatteryPercent(state);
  return percent !== null && percent >= 100;
}

export function isBatteryEmpty(state: DeviceState): boolean {
  const percent = getBatteryPercent(state);
  return percent !== null && percent < 1;
}

export function getTotalOutputPower(state: DeviceState): number {
  return (getField(state, 'ac_output_power') ?? 0) + (getField(state, 'dc_output_power') ?? 0);
}

export function getTotalInputPower(state: DeviceState): number {
  return (
    (getField(state, 'ac_input_power') ?? 0) +
    (getField(state, 'dc_input_power') ?? 0) +
    (getField(state, 'solar_power') ?? 0) +
    (getField(state, 'pv_input_power') ?? 0)
  );
}

export function isSystemIdle(state: DeviceState): boolean {
  return getTotalOutputPower(state) === 0 && getTotalInputPower(state) === 0;
}