type FieldValue = { value: string; ts: string };
export type DeviceState = Record<string, FieldValue>;

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

export function getBatteryCapacityWh(state: DeviceState): number | null {
  const directCapacity = getField(state, 'battery_capacity') ?? getField(state, 'pack_capacity');
  if (directCapacity !== null && directCapacity > 0) {
    return directCapacity;
  }

  const remainingCapacity = getRemainingCapacityWh(state);
  const batteryPercent = getBatteryPercent(state);
  if (remainingCapacity === null || batteryPercent === null || batteryPercent <= 0) {
    return null;
  }

  return remainingCapacity / (batteryPercent / 100);
}

export function getRemainingCapacityWh(state: DeviceState): number | null {
  const remainingCapacity = getField(state, 'remaining_capacity');
  if (remainingCapacity !== null && remainingCapacity >= 0) {
    return remainingCapacity;
  }

  const capacityWh = getField(state, 'battery_capacity') ?? getField(state, 'pack_capacity');
  const batteryPercent = getBatteryPercent(state);
  if (capacityWh === null || batteryPercent === null) {
    return null;
  }

  return (batteryPercent / 100) * capacityWh;
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

  const acOutputW = getField(state, 'ac_output_power');
  const dcOutputW = getField(state, 'dc_output_power');

  const totalOutputW = (acOutputW ?? 0) + (dcOutputW ?? 0);
  if (totalOutputW <= 0) return null;

  const remainingWh = getRemainingCapacityWh(state);
  if (remainingWh === null || remainingWh <= 0) return null;

  return (remainingWh / totalOutputW) * 60;
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

  const acInputW = getField(state, 'ac_input_power');
  const capacityWh = getBatteryCapacityWh(state);
  const remainingWh = getRemainingCapacityWh(state);
  if (capacityWh === null || remainingWh === null) return null;
  if (remainingWh >= capacityWh) return null;
  const deficitWh = capacityWh - remainingWh;

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
