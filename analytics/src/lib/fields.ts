export type FieldCategory = 'Input' | 'Output' | 'Battery' | 'System' | 'Modes' | 'Raw';

export interface FieldMeta {
  label: string;
  unit?: string;
  category: FieldCategory;
  numeric: boolean;
}

const FIELD_META: Record<string, FieldMeta> = {
  dc_input_power: { label: 'DC Input Power', unit: 'W', category: 'Input', numeric: true },
  dc_input_voltage: { label: 'DC Input Voltage', unit: 'V', category: 'Input', numeric: true },
  dc_input_frequency: { label: 'DC Input Frequency', unit: 'Hz', category: 'Input', numeric: true },
  pv_input_voltage: { label: 'PV Input Voltage', unit: 'V', category: 'Input', numeric: true },
  pv_input_frequency: { label: 'PV Input Frequency', unit: 'Hz', category: 'Input', numeric: true },
  solar_voltage: { label: 'Solar Voltage', unit: 'V', category: 'Input', numeric: true },
  solar_frequency: { label: 'Solar Frequency', unit: 'Hz', category: 'Input', numeric: true },
  internal_dc_input_power: { label: 'Internal DC Input', unit: 'W', category: 'Input', numeric: true },
  internal_dc_input_voltage: { label: 'Internal DC Voltage', unit: 'V', category: 'Input', numeric: true },
  internal_dc_input_current: { label: 'Internal DC Current', unit: 'A', category: 'Input', numeric: true },
  ac_input_power: { label: 'AC Input Power', unit: 'W', category: 'Input', numeric: true },
  ac_input_voltage: { label: 'AC Input Voltage', unit: 'V', category: 'Input', numeric: true },
  ac_input_frequency: { label: 'AC Input Frequency', unit: 'Hz', category: 'Input', numeric: true },
  ac_output_power: { label: 'AC Output Power', unit: 'W', category: 'Output', numeric: true },
  dc_output_power: { label: 'DC Output Power', unit: 'W', category: 'Output', numeric: true },
  internal_power_one: { label: 'Internal Power 1', unit: 'W', category: 'Output', numeric: true },
  internal_power_two: { label: 'Internal Power 2', unit: 'W', category: 'Output', numeric: true },
  internal_power_three: { label: 'Internal Power 3', unit: 'W', category: 'Output', numeric: true },
  total_battery_percent: { label: 'Battery Level', unit: '%', category: 'Battery', numeric: true },
  total_battery_voltage: { label: 'Battery Voltage', unit: 'V', category: 'Battery', numeric: true },
  pack_battery_percent: { label: 'Pack Battery', unit: '%', category: 'Battery', numeric: true },
  pack_voltage: { label: 'Pack Voltage', unit: 'V', category: 'Battery', numeric: true },
  pack_num: { label: 'Pack Count', category: 'Battery', numeric: true },
  pack_num_max: { label: 'Max Packs', category: 'Battery', numeric: true },
  power_generation: { label: 'Generated Energy', unit: 'kWh', category: 'Input', numeric: true },
  internal_ac_voltage: { label: 'Internal AC Voltage', unit: 'V', category: 'System', numeric: true },
  internal_ac_frequency: { label: 'Internal AC Frequency', unit: 'Hz', category: 'System', numeric: true },
  internal_current_one: { label: 'Internal Current 1', unit: 'A', category: 'System', numeric: true },
  internal_current_two: { label: 'Internal Current 2', unit: 'A', category: 'System', numeric: true },
  internal_current_three: { label: 'Internal Current 3', unit: 'A', category: 'System', numeric: true },
  ac_output_on: { label: 'AC Output', category: 'Modes', numeric: false },
  dc_output_on: { label: 'DC Output', category: 'Modes', numeric: false },
  grid_charge_on: { label: 'Grid Charge', category: 'Modes', numeric: false },
  ups_mode: { label: 'UPS Mode', category: 'Modes', numeric: false },
  ac_output_mode: { label: 'AC Output Mode', category: 'Modes', numeric: false },
  split_phase_on: { label: 'Split Phase', category: 'Modes', numeric: false },
  split_phase_machine_mode: { label: 'Split Phase Role', category: 'Modes', numeric: false },
  time_control_on: { label: 'Time Control', category: 'Modes', numeric: false },
  auto_sleep_mode: { label: 'Auto Sleep', category: 'Modes', numeric: false },
  bluetooth_connected: { label: 'Bluetooth', category: 'System', numeric: false },
  device_type: { label: 'Device Type', category: 'System', numeric: false },
  serial_number: { label: 'Serial Number', category: 'System', numeric: false },
  arm_version: { label: 'ARM Version', category: 'System', numeric: true },
  dsp_version: { label: 'DSP Version', category: 'System', numeric: true },
  _raw: { label: 'Raw Payload', category: 'Raw', numeric: false },
};

export function getFieldMeta(field: string): FieldMeta {
  const known = FIELD_META[field];
  if (known) {
    return known;
  }

  const label = field
    .replace(/^_/, '')
    .replace(/_/g, ' ')
    .replace(/\b(ac|dc|dsp|arm)\b/gi, (match) => match.toUpperCase())
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

  return { label, category: 'System', numeric: false };
}

export function isNumericValue(value: string) {
  return Number.isFinite(Number.parseFloat(value));
}

export function formatMetric(value: number | null | undefined, unit = '', digits = 0) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return '--';
  }

  const formatted = value.toLocaleString(undefined, {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  });

  return unit ? `${formatted} ${unit}` : formatted;
}

export function formatFieldValue(field: string, raw: string | undefined) {
  if (raw === undefined) {
    return '--';
  }

  const meta = getFieldMeta(field);
  if (!meta.numeric) {
    if (raw === 'True' || raw === 'true' || raw === '1') return 'ON';
    if (raw === 'False' || raw === 'false' || raw === '0') return 'OFF';
    return raw;
  }

  const value = Number.parseFloat(raw);
  return Number.isFinite(value) ? formatMetric(value, meta.unit, meta.unit === 'kWh' ? 2 : 1) : raw;
}
