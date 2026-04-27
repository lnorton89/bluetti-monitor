type FieldValue = { value: string; ts: string };
export type DeviceState = Record<string, FieldValue>;
export type HistoryPoint = { value: string; ts: string };

const BATTERY_PERCENT_FIELDS = [
  'total_battery_percent',
  'battery_percent',
  'soc',
  'charge_level',
  'pack_soc',
  'pack_battery_percent',
] as const;

const BATTERY_CAPACITY_FIELDS = ['battery_capacity', 'pack_capacity'] as const;
const REMAINING_CAPACITY_FIELDS = ['remaining_capacity'] as const;
const AC_INPUT_FIELDS = ['ac_input_power', 'grid_charge_power'] as const;
const SOLAR_INPUT_FIELDS = ['dc_input_power', 'pv_input_power', 'solar_power'] as const;
const SPLIT_SOLAR_FIELDS = ['pv1_power', 'pv2_power', 'dc_input_power1', 'dc_input_power2'] as const;
const POWER_FLOW_DEADBAND_W = 20;

function getField(state: DeviceState, field: string): number | null {
  const raw = state[field]?.value;
  if (raw === undefined) return null;
  const parsed = parseFloat(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function getFirstField(state: DeviceState, fields: readonly string[]): number | null {
  for (const field of fields) {
    const value = getField(state, field);
    if (value !== null) {
      return value;
    }
  }

  return null;
}

function getSummedFields(state: DeviceState, fields: readonly string[]): number | null {
  let foundValue = false;
  let sum = 0;

  for (const field of fields) {
    const value = getField(state, field);
    if (value === null) {
      continue;
    }

    foundValue = true;
    sum += value;
  }

  return foundValue ? sum : null;
}

export function getBatteryPercent(state: DeviceState): number | null {
  return getFirstField(state, BATTERY_PERCENT_FIELDS);
}

export function getBatteryCapacityWh(state: DeviceState): number | null {
  const directCapacity = getFirstField(state, BATTERY_CAPACITY_FIELDS);
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
  const remainingCapacity = getFirstField(state, REMAINING_CAPACITY_FIELDS);
  if (remainingCapacity !== null && remainingCapacity >= 0) {
    return remainingCapacity;
  }

  const capacityWh = getFirstField(state, BATTERY_CAPACITY_FIELDS);
  const batteryPercent = getBatteryPercent(state);
  if (capacityWh === null || batteryPercent === null) {
    return null;
  }

  return (batteryPercent / 100) * capacityWh;
}

export function formatDuration(minutes: number | null): string {
  if (minutes === null || !Number.isFinite(minutes) || minutes < 1) {
    return '--';
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

  const netDischargeW = getTotalOutputPower(state) - getTotalInputPower(state);
  if (netDischargeW <= POWER_FLOW_DEADBAND_W) return null;

  const remainingWh = getRemainingCapacityWh(state);
  if (remainingWh === null || remainingWh <= 0) return null;

  return (remainingWh / netDischargeW) * 60;
}

export function isChargingFromGrid(state: DeviceState): boolean {
  const gridCharge = state['grid_charge_on']?.value;
  const acCharge = state['ac_charging_on']?.value;
  const acInputPower = getFirstField(state, AC_INPUT_FIELDS) ?? 0;
  const gridChargeEnabled = gridCharge === 'True' || gridCharge === 'true' ||
    gridCharge === '1' || gridCharge === 'ON';
  const acChargeEnabled = acCharge === 'True' || acCharge === 'true' ||
    acCharge === '1' || acCharge === 'ON';

  return (gridChargeEnabled || acChargeEnabled) && acInputPower > POWER_FLOW_DEADBAND_W;
}

export function isCharging(state: DeviceState): boolean {
  const totalInputPower = getTotalInputPower(state);
  const totalOutputPower = getTotalOutputPower(state);

  if (isChargingFromGrid(state)) {
    return true;
  }

  return totalInputPower > totalOutputPower + POWER_FLOW_DEADBAND_W;
}

export function estimateChargeTimeMinutes(state: DeviceState): number | null {
  const rangeToFull = getField(state, 'battery_range_to_full');
  if (rangeToFull !== null && rangeToFull >= 0) return rangeToFull;

  const capacityWh = getBatteryCapacityWh(state);
  const remainingWh = getRemainingCapacityWh(state);
  if (capacityWh === null || remainingWh === null) return null;
  const targetWh = capacityWh * (getBatteryRangeEndPercent(state) / 100);
  if (remainingWh >= targetWh) return 0;
  const deficitWh = targetWh - remainingWh;

  const netChargeW = getTotalInputPower(state) - getTotalOutputPower(state);

  if (netChargeW <= POWER_FLOW_DEADBAND_W) return null;

  return (deficitWh / netChargeW) * 60;
}

export function isBatteryFull(state: DeviceState): boolean {
  const percent = getBatteryPercent(state);
  return percent !== null && percent >= getBatteryRangeEndPercent(state);
}

export function isBatteryEmpty(state: DeviceState): boolean {
  const percent = getBatteryPercent(state);
  return percent !== null && percent < 1;
}

export function getTotalOutputPower(state: DeviceState): number {
  return (getField(state, 'ac_output_power') ?? 0) + (getField(state, 'dc_output_power') ?? 0);
}

export function getTotalInputPower(state: DeviceState): number {
  const acInput = getFirstField(state, AC_INPUT_FIELDS) ?? 0;
  const solarInput = getFirstField(state, SOLAR_INPUT_FIELDS) ?? getSummedFields(state, SPLIT_SOLAR_FIELDS) ?? 0;

  return acInput + solarInput;
}

export function isSystemIdle(state: DeviceState): boolean {
  return getTotalOutputPower(state) === 0 && getTotalInputPower(state) === 0;
}

export function getBatteryRangeStartPercent(state: DeviceState): number {
  const configuredFloor = getField(state, 'battery_range_start');
  if (configuredFloor !== null && configuredFloor >= 0 && configuredFloor <= 100) {
    return configuredFloor;
  }

  return 0;
}

export function getBatteryRangeEndPercent(state: DeviceState): number {
  const configuredCeiling = getField(state, 'battery_range_end');
  if (configuredCeiling !== null && configuredCeiling >= 0 && configuredCeiling <= 100) {
    return configuredCeiling;
  }

  return 100;
}

function parseHistoryPoints(history: HistoryPoint[]): Array<{ percent: number; ts: number }> {
  return history
    .map((point) => ({
      percent: Number.parseFloat(point.value),
      ts: Date.parse(point.ts),
    }))
    .filter((point) => Number.isFinite(point.percent) && Number.isFinite(point.ts))
    .sort((left, right) => left.ts - right.ts);
}

function buildDistinctHistory(points: Array<{ percent: number; ts: number }>): Array<{ percent: number; ts: number }> {
  const distinct: Array<{ percent: number; ts: number }> = [];

  for (const point of points) {
    const last = distinct.at(-1);
    if (last && last.percent === point.percent) {
      distinct[distinct.length - 1] = point;
      continue;
    }

    distinct.push(point);
  }

  return distinct;
}

function getTrailingTrendSegment(
  history: HistoryPoint[],
): { direction: "charging" | "discharging"; first: { percent: number; ts: number }; last: { percent: number; ts: number } } | null {
  const distinct = buildDistinctHistory(parseHistoryPoints(history));
  if (distinct.length < 2) {
    return null;
  }

  const last = distinct.at(-1);
  const penultimate = distinct.at(-2);
  if (!last || !penultimate || last.percent === penultimate.percent) {
    return null;
  }

  const direction = last.percent > penultimate.percent ? "charging" : "discharging";
  let firstIndex = distinct.length - 2;

  while (firstIndex > 0) {
    const current = distinct[firstIndex];
    const previous = distinct[firstIndex - 1];
    const delta = current.percent - previous.percent;

    if (direction === "charging" && delta <= 0) {
      break;
    }

    if (direction === "discharging" && delta >= 0) {
      break;
    }

    firstIndex -= 1;
  }

  return {
    direction,
    first: distinct[firstIndex],
    last,
  };
}

function estimateBatteryTrendPercentPerHourForDirection(
  history: HistoryPoint[],
  direction: "charging" | "discharging",
): number | null {
  const segment = getTrailingTrendSegment(history);
  if (segment === null || segment.direction !== direction) {
    return null;
  }

  const { first, last } = segment;
  const elapsedHours = (last.ts - first.ts) / 3_600_000;
  if (elapsedHours <= 0) {
    return null;
  }

  const percentChange = last.percent - first.percent;
  return percentChange / elapsedHours;
}

export function estimateBatteryTrendPercentPerHour(history: HistoryPoint[]): number | null {
  const segment = getTrailingTrendSegment(history);
  if (segment === null) {
    return null;
  }

  return estimateBatteryTrendPercentPerHourForDirection(history, segment.direction);
}

export function estimateRuntimeMinutesFromHistory(
  state: DeviceState,
  history: HistoryPoint[],
): number | null {
  const currentPercent = getBatteryPercent(state);
  if (currentPercent === null) {
    return null;
  }

  const floorPercent = getBatteryRangeStartPercent(state);
  if (currentPercent <= floorPercent) {
    return 0;
  }

  const percentPerHour = estimateBatteryTrendPercentPerHourForDirection(history, "discharging");
  if (percentPerHour === null || percentPerHour >= 0) {
    return null;
  }

  return ((currentPercent - floorPercent) / Math.abs(percentPerHour)) * 60;
}
export function estimateChargeTimeMinutesFromHistory(
  state: DeviceState,
  history: HistoryPoint[],
): number | null {
  const currentPercent = getBatteryPercent(state);
  if (currentPercent === null) {
    return null;
  }

  const targetPercent = Math.max(currentPercent, getBatteryRangeEndPercent(state));
  if (currentPercent >= targetPercent) {
    return 0;
  }

  const percentPerHour = estimateBatteryTrendPercentPerHourForDirection(history, "charging");
  if (percentPerHour === null || percentPerHour <= 0) {
    return null;
  }

  return ((targetPercent - currentPercent) / percentPerHour) * 60;
}
