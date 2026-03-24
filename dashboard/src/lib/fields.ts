// Known field metadata: label, unit, category
export interface FieldMeta {
  label:    string;
  unit?:    string;
  category: Category;
  numeric:  boolean;
}

import type { ComponentType } from 'react';
import { Sun, Plug, Battery, Activity, Gauge } from 'lucide-react';

export const CATEGORIES = ['Input', 'Output', 'Battery', 'Modes', 'System'] as const;
export type Category = typeof CATEGORIES[number];

const FIELDS: Record<string, FieldMeta> = {
  // ── INPUT: Solar ────────────────────────────────────────────────────────────
  dc_input_power:        { label: 'DC Input Power',    unit: 'W',  category: 'Input', numeric: true },
  dc_input_power1:       { label: 'DC Input Power 1',  unit: 'W',  category: 'Input', numeric: true },
  pv1_power:             { label: 'PV1 Power',         unit: 'W',  category: 'Input', numeric: true },
  pv2_power:             { label: 'PV2 Power',         unit: 'W',  category: 'Input', numeric: true },
  pv_input_power:        { label: 'PV Input Power',    unit: 'W',  category: 'Input', numeric: true },
  solar_power:           { label: 'Solar Power',       unit: 'W',  category: 'Input', numeric: true },
  power_generation:      { label: 'Power Generation',  unit: 'W',  category: 'Input', numeric: true },
  
  dc_input_voltage1:     { label: 'PV1 Voltage',       unit: 'V',  category: 'Input', numeric: true },
  dc_input_voltage2:     { label: 'PV2 Voltage',       unit: 'V',  category: 'Input', numeric: true },
  pv1_voltage:           { label: 'PV1 Voltage',       unit: 'V',  category: 'Input', numeric: true },
  pv2_voltage:           { label: 'PV2 Voltage',       unit: 'V',  category: 'Input', numeric: true },
  pv_input_voltage:      { label: 'PV Input Voltage',  unit: 'V',  category: 'Input', numeric: true },
  
  dc_input_current1:     { label: 'PV1 Current',       unit: 'A',  category: 'Input', numeric: true },
  dc_input_current2:     { label: 'PV2 Current',       unit: 'A',  category: 'Input', numeric: true },
  pv1_current:           { label: 'PV1 Current',       unit: 'A',  category: 'Input', numeric: true },
  pv2_current:           { label: 'PV2 Current',       unit: 'A',  category: 'Input', numeric: true },
  pv_input_current:      { label: 'PV Input Current',  unit: 'A',  category: 'Input', numeric: true },

  // ── INPUT: Grid ─────────────────────────────────────────────────────────────
  ac_input_power:        { label: 'AC Input Power',    unit: 'W',  category: 'Input', numeric: true },
  ac_input_voltage:      { label: 'AC Input Voltage',  unit: 'V',  category: 'Input', numeric: true },
  ac_input_frequency:    { label: 'AC Input Frequency',unit: 'Hz', category: 'Input', numeric: true },
  ac_input_current:      { label: 'AC Input Current',  unit: 'A',  category: 'Input', numeric: true },
  grid_charge_power:     { label: 'Grid Charge Power', unit: 'W',  category: 'Input', numeric: true },
  grid_voltage:          { label: 'Grid Voltage',      unit: 'V',  category: 'Input', numeric: true },
  grid_current:          { label: 'Grid Current',      unit: 'A',  category: 'Input', numeric: true },
  grid_frequency:        { label: 'Grid Frequency',    unit: 'Hz', category: 'Input', numeric: true },

  // ── OUTPUT: AC ──────────────────────────────────────────────────────────────
  ac_output_power:       { label: 'AC Output Power',   unit: 'W',  category: 'Output', numeric: true },
  ac_output_voltage:     { label: 'AC Output Voltage', unit: 'V',  category: 'Output', numeric: true },
  ac_output_current:     { label: 'AC Output Current', unit: 'A',  category: 'Output', numeric: true },
  ac_output_frequency:   { label: 'AC Output Freq',    unit: 'Hz', category: 'Output', numeric: true },
  ac_output_on:          { label: 'AC Output',         unit: '',   category: 'Output', numeric: false },

  // ── OUTPUT: DC ──────────────────────────────────────────────────────────────
  dc_output_power:       { label: 'DC Output Power',   unit: 'W',  category: 'Output', numeric: true },
  dc_output_voltage:     { label: 'DC Output Voltage', unit: 'V',  category: 'Output', numeric: true },
  dc_output_current:     { label: 'DC Output Current', unit: 'A',  category: 'Output', numeric: true },
  dc_output_on:          { label: 'DC Output',         unit: '',   category: 'Output', numeric: false },

  // ── BATTERY: Main ───────────────────────────────────────────────────────────
  total_battery_percent: { label: 'Battery Level',     unit: '%',  category: 'Battery', numeric: true },
  total_battery_voltage: { label: 'Battery Voltage',   unit: 'V',  category: 'Battery', numeric: true },
  battery_percent:       { label: 'Battery Level',     unit: '%',  category: 'Battery', numeric: true },
  battery_range_to_empty:{ label: 'Time to Empty',     unit: 'min',category: 'Battery', numeric: true },
  battery_range_to_full: { label: 'Time to Full',      unit: 'min',category: 'Battery', numeric: true },
  battery_range_end:     { label: 'Battery Range End', unit: '%',  category: 'Battery', numeric: true },
  battery_range_start:   { label: 'Battery Range Start',unit: '%',category: 'Battery', numeric: true },
  battery_voltage:       { label: 'Battery Voltage',   unit: 'V',  category: 'Battery', numeric: true },
  battery_current:       { label: 'Battery Current',   unit: 'A',  category: 'Battery', numeric: true },
  battery_temp:          { label: 'Battery Temp',      unit: '°C', category: 'Battery', numeric: true },
  battery_capacity:      { label: 'Battery Capacity',  unit: 'Wh', category: 'Battery', numeric: true },
  remaining_capacity:    { label: 'Remaining Capacity',unit: 'Wh', category: 'Battery', numeric: true },
  charge_level:          { label: 'Charge Level',      unit: '%',  category: 'Battery', numeric: true },
  soc:                   { label: 'State of Charge',   unit: '%',  category: 'Battery', numeric: true },

  // ── BATTERY: Pack Info ──────────────────────────────────────────────────────
  pack_num_max:          { label: 'Max Packs',         unit: '',   category: 'Battery', numeric: true },
  pack_count:            { label: 'Pack Count',        unit: '',   category: 'Battery', numeric: true },
  pack_battery_level:    { label: 'Pack Battery Level',unit: '%',  category: 'Battery', numeric: true },
  pack_voltage:          { label: 'Pack Voltage',      unit: 'V',  category: 'Battery', numeric: true },
  pack_current:          { label: 'Pack Current',      unit: 'A',  category: 'Battery', numeric: true },
  pack_temp:             { label: 'Pack Temp',         unit: '°C', category: 'Battery', numeric: true },
  pack_cycle_count:      { label: 'Pack Cycle Count',  unit: '',   category: 'Battery', numeric: true },
  pack_soc:              { label: 'Pack SOC',          unit: '%',  category: 'Battery', numeric: true },
  pack_capacity:         { label: 'Pack Capacity',     unit: 'Wh', category: 'Battery', numeric: true },
  pack_health:           { label: 'Pack Health',       unit: '%',  category: 'Battery', numeric: true },
  pack_soh:              { label: 'Pack SOH',          unit: '%',  category: 'Battery', numeric: true },
  // Pack detail objects (JSON with percent, voltage, voltages array)
  pack_details1:         { label: 'Pack 1 Details',    unit: '',   category: 'Battery', numeric: false },
  pack_details2:         { label: 'Pack 2 Details',    unit: '',   category: 'Battery', numeric: false },
  pack_details3:         { label: 'Pack 3 Details',    unit: '',   category: 'Battery', numeric: false },
  pack_details4:         { label: 'Pack 4 Details',    unit: '',   category: 'Battery', numeric: false },
  pack_details5:         { label: 'Pack 5 Details',    unit: '',   category: 'Battery', numeric: false },
  pack_details6:         { label: 'Pack 6 Details',    unit: '',   category: 'Battery', numeric: false },

  // ── MODES: Operating Modes ──────────────────────────────────────────────────
  work_mode:             { label: 'Work Mode',         unit: '',   category: 'Modes', numeric: false },
  ups_mode:              { label: 'UPS Mode',          unit: '',   category: 'Modes', numeric: false },
  output_mode:           { label: 'Output Mode',       unit: '',   category: 'Modes', numeric: false },
  charging_mode:         { label: 'Charging Mode',     unit: '',   category: 'Modes', numeric: false },
  system_mode:           { label: 'System Mode',       unit: '',   category: 'Modes', numeric: false },
  load_mode:             { label: 'Load Mode',         unit: '',   category: 'Modes', numeric: false },
  ac_output_mode:        { label: 'AC Output Mode',    unit: '',   category: 'Modes', numeric: false },
  split_phase_machine_mode: { label: 'Split Phase Mode',unit: '', category: 'Modes', numeric: false },
  auto_sleep_mode:       { label: 'Auto Sleep Mode',   unit: '',   category: 'Modes', numeric: false },

  // ── MODES: Charging States ──────────────────────────────────────────────────
  ac_charging_on:        { label: 'AC Charging',       unit: '',   category: 'Modes', numeric: false },
  dc_charging_on:        { label: 'DC Charging',       unit: '',   category: 'Modes', numeric: false },
  charging_on:           { label: 'Charging',          unit: '',   category: 'Modes', numeric: false },
  charge_state:          { label: 'Charge State',      unit: '',   category: 'Modes', numeric: false },
  grid_charge_on:        { label: 'Grid Charge',       unit: '',   category: 'Modes', numeric: false },

  // ── MODES: Power Control ────────────────────────────────────────────────────
  power_off:             { label: 'Power Off',         unit: '',   category: 'Modes', numeric: false },
  power_on:              { label: 'Power On',          unit: '',   category: 'Modes', numeric: false },
  eco_mode:              { label: 'Eco Mode',          unit: '',   category: 'Modes', numeric: false },
  eco_mode_on:           { label: 'Eco Mode',          unit: '',   category: 'Modes', numeric: false },
  timer_charge:          { label: 'Timer Charge',      unit: '',   category: 'Modes', numeric: false },
  timer_charge_on:       { label: 'Timer Charge',      unit: '',   category: 'Modes', numeric: false },
  time_control_on:       { label: 'Time Control',      unit: '',   category: 'Modes', numeric: false },
  beep_mode:             { label: 'Beep Mode',         unit: '',   category: 'Modes', numeric: false },
  lcd_mode:              { label: 'LCD Mode',          unit: '',   category: 'Modes', numeric: false },
  split_phase_on:        { label: 'Split Phase',       unit: '',   category: 'Modes', numeric: false },

  // ── SYSTEM: Temperatures ────────────────────────────────────────────────────
  internal_temp:         { label: 'Internal Temp',     unit: '°C', category: 'System', numeric: true },
  ambient_temp:          { label: 'Ambient Temp',      unit: '°C', category: 'System', numeric: true },
  inverter_temp:         { label: 'Inverter Temp',     unit: '°C', category: 'System', numeric: true },
  mppt_temp:             { label: 'MPPT Temp',         unit: '°C', category: 'System', numeric: true },
  transformer_temp:      { label: 'Transformer Temp',  unit: '°C', category: 'System', numeric: true },
  heatsink_temp:         { label: 'Heatsink Temp',     unit: '°C', category: 'System', numeric: true },

  // ── SYSTEM: Internal Electrical ─────────────────────────────────────────────
  internal_ac_voltage:   { label: 'Internal AC Voltage',unit: 'V', category: 'System', numeric: true },
  internal_ac_frequency: { label: 'Internal AC Frequency',unit: 'Hz',category: 'System', numeric: true },
  internal_voltage:      { label: 'Internal Voltage',  unit: 'V',  category: 'System', numeric: true },
  internal_current_one:  { label: 'Internal Current 1',unit: 'A',  category: 'System', numeric: true },
  internal_current_two:  { label: 'Internal Current 2',unit: 'A',  category: 'System', numeric: true },
  internal_current_three:{ label: 'Internal Current 3',unit: 'A',  category: 'System', numeric: true },
  internal_power_one:    { label: 'Internal Power 1',  unit: 'W',  category: 'System', numeric: true },
  internal_power_two:    { label: 'Internal Power 2',  unit: 'W',  category: 'System', numeric: true },
  internal_power_three:  { label: 'Internal Power 3',  unit: 'W',  category: 'System', numeric: true },

  // ── SYSTEM: Fan & Misc ──────────────────────────────────────────────────────
  fan_speed:             { label: 'Fan Speed',         unit: 'RPM',category: 'System', numeric: true },
  fan_state:             { label: 'Fan State',         unit: '',   category: 'System', numeric: false },
  fan_auto:              { label: 'Fan Auto',          unit: '',   category: 'System', numeric: false },

  // ── SYSTEM: Errors & Status ─────────────────────────────────────────────────
  error_code:            { label: 'Error Code',        unit: '',   category: 'System', numeric: false },
  error_codes:           { label: 'Error Codes',       unit: '',   category: 'System', numeric: false },
  warning_code:          { label: 'Warning Code',      unit: '',   category: 'System', numeric: false },
  fault_code:            { label: 'Fault Code',        unit: '',   category: 'System', numeric: false },
  system_status:         { label: 'System Status',     unit: '',   category: 'System', numeric: false },
  device_status:         { label: 'Device Status',     unit: '',   category: 'System', numeric: false },
  communication_status:  { label: 'Comm Status',       unit: '',   category: 'System', numeric: false },

  // ── SYSTEM: General ─────────────────────────────────────────────────────────
  system_voltage:        { label: 'System Voltage',    unit: 'V',  category: 'System', numeric: true },
  load_voltage:          { label: 'Load Voltage',      unit: 'V',  category: 'System', numeric: true },
  version:               { label: 'Firmware Version',  unit: '',   category: 'System', numeric: false },
  serial_number:         { label: 'Serial Number',     unit: '',   category: 'System', numeric: false },
  device_type:           { label: 'Device Type',       unit: '',   category: 'System', numeric: false },
  runtime:               { label: 'Runtime',           unit: 'min',category: 'System', numeric: true },
  total_runtime:         { label: 'Total Runtime',     unit: 'min',category: 'System', numeric: true },
};

export function getFieldMeta(field: string): FieldMeta {
  const known = FIELDS[field];
  if (known) return known;

  // No smart categorization - all fields must be explicitly defined above
  // Unknown fields default to System category
  let label = field.replace(/_/g, ' ');
  label = label.replace(/\b(ac)\b/gi, 'AC').replace(/\b(dc)\b/gi, 'DC');
  label = label.replace(/\b\w/g, c => c.toUpperCase());

  return {
    label,
    category: 'System',
    numeric: false,
  };
}

export function formatValue(field: string, raw: string): string {
  const meta = getFieldMeta(field);
  if (!meta.numeric) {
    if (raw === 'True' || raw === 'true' || raw === '1') return 'ON';
    if (raw === 'False'|| raw === 'false'|| raw === '0') return 'OFF';
    return raw;
  }
  const n = parseFloat(raw);
  if (isNaN(n)) return raw;
  return meta.unit ? `${n.toLocaleString()} ${meta.unit}` : n.toLocaleString();
}

/**
 * Format a value that might be a JSON object (e.g., pack details).
 * Returns a formatted string representation.
 */
export function formatObjectValue(value: unknown): string {
  if (typeof value === 'string') {
    // Try to parse as JSON
    try {
      const parsed = JSON.parse(value);
      if (typeof parsed === 'object' && parsed !== null) {
        return formatObjectValue(parsed);
      }
      return value;
    } catch {
      return value;
    }
  }

  if (typeof value === 'object' && value !== null) {
    if (Array.isArray(value)) {
      return value.map(formatObjectValue).join(', ');
    }
    // Handle pack detail objects
    const entries = Object.entries(value);
    if (entries.length === 0) return '{}';

    // If it looks like a pack object with index/voltage/etc
    if ('index' in value || 'voltage' in value || 'percent' in value || 'v' in value || 'soc' in value) {
      const parts: string[] = [];
      if ('index' in value) parts.push(`Pack #${value.index}`);
      if ('voltage' in value) parts.push(`${value.voltage}V`);
      else if ('v' in value) parts.push(`${value.v}V`);
      if ('percent' in value) parts.push(`${value.percent}%`);
      else if ('soc' in value) parts.push(`${value.soc}%`);
      if ('temp' in value) parts.push(`${value.temp}°C`);
      else if ('t' in value) parts.push(`${value.t}°C`);
      if ('current' in value) parts.push(`${value.current}A`);
      else if ('i' in value) parts.push(`${value.i}A`);
      if ('power' in value) parts.push(`${value.power}W`);
      else if ('p' in value) parts.push(`${value.p}W`);
      return parts.join(' · ');
    }

    // Generic object formatting with unit inference
    return entries
      .map(([k, v]) => {
        const formatted = formatObjectValue(v);
        // Try to add unit based on key name
        const lower = k.toLowerCase();
        if (typeof v === 'number') {
          if (lower.includes('volt')) return `${k}: ${v}V`;
          if (lower.includes('amp') || lower.includes('current')) return `${k}: ${v}A`;
          if (lower.includes('power') || lower.includes('watt')) return `${k}: ${v}W`;
          if (lower.includes('percent') || lower.includes('soc')) return `${k}: ${v}%`;
          if (lower.includes('temp')) return `${k}: ${v}°C`;
          if (lower.includes('freq')) return `${k}: ${v}Hz`;
          if (lower.includes('capacity') || lower.includes('wh')) return `${k}: ${v}Wh`;
        }
        return `${k}: ${formatted}`;
      })
      .join(', ');
  }

  return String(value);
}

export function isNumeric(_field: string, raw: string): boolean {
  return !isNaN(parseFloat(raw));
}

// Category icons and colors for UI components
export const categoryColors: Record<Category, string> = {
  Input: 'var(--cat-input)',
  Output: 'var(--cat-output)',
  Battery: 'var(--cat-battery)',
  Modes: 'var(--cat-modes)',
  System: 'var(--cat-system)',
};

export const categoryIcons: Record<Category, ComponentType<{ size: number }>> = {
  Input: Sun,
  Output: Plug,
  Battery: Battery,
  Modes: Activity,
  System: Gauge,
};
