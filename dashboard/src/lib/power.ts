import type { DeviceState } from './api';

export const GRID_INPUT_FIELDS = ['ac_input_power', 'grid_charge_power'] as const;
export const TOTAL_SOLAR_INPUT_FIELDS = ['dc_input_power', 'pv_input_power', 'solar_power'] as const;
export const PV1_INPUT_FIELDS = ['dc_input_1_power', 'pv1_power', 'dc_input_power1'] as const;
export const PV2_INPUT_FIELDS = ['dc_input_2_power', 'pv2_power', 'dc_input_power2'] as const;
export const OUTPUT_FIELDS = ['ac_output_power', 'dc_output_power'] as const;

export function parseNumericValue(raw: string | undefined) {
  if (raw === undefined) {
    return null;
  }

  const parsed = Number.parseFloat(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

export function sumNumericFields(state: DeviceState, fields: readonly string[]) {
  return fields.reduce((total, field) => total + (parseNumericValue(state[field]?.value) ?? 0), 0);
}

export function getFirstNumericValue(state: DeviceState, fields: readonly string[]) {
  for (const field of fields) {
    const value = parseNumericValue(state[field]?.value);
    if (value !== null) {
      return value;
    }
  }

  return null;
}

export function getCurrentInputWatts(state: DeviceState) {
  const gridInput = getFirstNumericValue(state, GRID_INPUT_FIELDS) ?? 0;
  return gridInput + getCurrentSolarInputWatts(state);
}

export function getCurrentSolarInputWatts(state: DeviceState) {
  const totalSolarInput = getFirstNumericValue(state, TOTAL_SOLAR_INPUT_FIELDS);
  if (totalSolarInput !== null) {
    return totalSolarInput;
  }

  const splitSolarInput = (getFirstNumericValue(state, PV1_INPUT_FIELDS) ?? 0)
    + (getFirstNumericValue(state, PV2_INPUT_FIELDS) ?? 0);

  return splitSolarInput;
}

export function getCurrentOutputWatts(state: DeviceState) {
  return sumNumericFields(state, OUTPUT_FIELDS);
}
