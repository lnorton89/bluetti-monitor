export const DARK_CHART_COLORS = ['#ff8fab', '#ffd6a5', '#fdffb6', '#caffbf', '#9bf6ff', '#a0c4ff', '#bdb2ff'];
export const LIGHT_CHART_COLORS = ['#b82355', '#a15c10', '#8b7a00', '#2f7d32', '#00889b', '#315fae', '#7650ad'];

export const buildRainbow = (colors: string[]) => ({
  red: colors[0],
  orange: colors[1],
  yellow: colors[2],
  green: colors[3],
  cyan: colors[4],
  blue: colors[5],
  violet: colors[6],
});

export const DEFAULT_COMPARISON_FIELDS = [
  'ac_input_power',
  'ac_output_power',
  'dc_input_power',
  'dc_output_power',
  'total_battery_percent',
  'power_generation',
];

export const EXCLUDED_COMPARISON_FIELDS = new Set([
  '_raw',
  'arm_version',
  'auto_sleep_mode',
  'bluetooth_connected',
  'device_type',
  'dsp_version',
  'pack_num',
  'pack_num_max',
  'serial_number',
  'split_phase_machine_mode',
  'split_phase_on',
  'time_control_on',
  'ups_mode',
]);

export const ANALYTICS_SKIN_KEY = 'bluetti-analytics:skin';
export const ANALYTICS_THEME_KEY = 'bluetti-analytics:theme';
export const ANALYTICS_DENSITY_KEY = 'bluetti-analytics:density';
export const COMPARISON_DEFAULT_FIELDS_KEY = 'bluetti-analytics:comparison-default-fields';
export const MAX_COMPARISON_FIELDS = 6;
export const EMPTY_TIMELINE: [] = [];

export type AnalyticsSkin = 'modern' | 'classic';
export type AnalyticsTheme = 'dark' | 'light';
export type AnalyticsDensity = 'comfortable' | 'compact';

export function getStoredAnalyticsSkin(): AnalyticsSkin {
  if (typeof window === 'undefined') {
    return 'modern';
  }
  return window.localStorage.getItem(ANALYTICS_SKIN_KEY) === 'classic' ? 'classic' : 'modern';
}

export function getStoredAnalyticsTheme(): AnalyticsTheme {
  if (typeof window === 'undefined') {
    return 'dark';
  }
  return window.localStorage.getItem(ANALYTICS_THEME_KEY) === 'light' ? 'light' : 'dark';
}

export function getStoredAnalyticsDensity(): AnalyticsDensity {
  if (typeof window === 'undefined') {
    return 'comfortable';
  }
  return window.localStorage.getItem(ANALYTICS_DENSITY_KEY) === 'compact' ? 'compact' : 'comfortable';
}

export function getStoredComparisonDefaultFields() {
  if (typeof window === 'undefined') {
    return DEFAULT_COMPARISON_FIELDS;
  }

  try {
    const stored = JSON.parse(window.localStorage.getItem(COMPARISON_DEFAULT_FIELDS_KEY) ?? '[]');
    return Array.isArray(stored) && stored.every((field) => typeof field === 'string')
      ? stored.slice(0, MAX_COMPARISON_FIELDS)
      : DEFAULT_COMPARISON_FIELDS;
  } catch {
    return DEFAULT_COMPARISON_FIELDS;
  }
}

export function normalizeComparisonFields(fields: string[], availableFields: string[]) {
  const seen = new Set<string>();
  return fields
    .filter((field) => availableFields.includes(field) && !seen.has(field) && seen.add(field))
    .slice(0, MAX_COMPARISON_FIELDS);
}

export function areSameFields(a: string[], b: string[]) {
  return a.length === b.length && a.every((field, index) => field === b[index]);
}

export function isComparableField(field: string) {
  return !EXCLUDED_COMPARISON_FIELDS.has(field);
}
