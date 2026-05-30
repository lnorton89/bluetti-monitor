const DEFAULT_DARK_CHART_COLORS = ['#ff8fab', '#ffd6a5', '#fdffb6', '#caffbf', '#9bf6ff', '#a0c4ff', '#bdb2ff'];
const DEFAULT_LIGHT_CHART_COLORS = ['#b82355', '#a15c10', '#8b7a00', '#2f7d32', '#00889b', '#315fae', '#7650ad'];

export const SKIN_OPTIONS = [
  { id: 'modern', label: 'Modern' },
  { id: 'classic', label: 'Classic' },
  { id: 'aurora', label: 'Aurora' },
  { id: 'terminal', label: 'Terminal' },
  { id: 'blueprint', label: 'Blueprint' },
  { id: 'brutalist', label: 'Brutalist' },
  { id: 'clay', label: 'Clay' },
  { id: 'win95', label: 'Windows 95' },
  { id: 'win2k', label: 'Windows 2000' },
  { id: 'winaero', label: 'Windows Aero' },
] as const;

export type AnalyticsSkin = (typeof SKIN_OPTIONS)[number]['id'];

const ANALYTICS_CHART_COLORS: Record<AnalyticsSkin, Record<AnalyticsTheme, string[]>> = {
  modern: {
    dark: DEFAULT_DARK_CHART_COLORS,
    light: DEFAULT_LIGHT_CHART_COLORS,
  },
  classic: {
    dark: ['#d08080', '#d0a060', '#c0c040', '#70b070', '#6ba3d6', '#8090d0', '#a080c0'],
    light: ['#800000', '#663300', '#555500', '#005500', '#005555', '#000080', '#550055'],
  },
  aurora: {
    dark: ['#ff5ea8', '#ffb86b', '#ffe66d', '#72f2a6', '#55f7ff', '#7c9cff', '#c084ff'],
    light: ['#b01563', '#b45309', '#8a6d00', '#138a54', '#008c9c', '#3150b7', '#7c3bb2'],
  },
  terminal: {
    dark: ['#ff6b6b', '#ffb000', '#f7ff58', '#39ff88', '#00f5ff', '#62a8ff', '#d16dff'],
    light: ['#9b1d1d', '#8f5200', '#6c6900', '#00753a', '#007582', '#1d4e9b', '#74329b'],
  },
  blueprint: {
    dark: ['#ff8a9a', '#ffbd6e', '#f6e27a', '#7ee7a6', '#65e9ff', '#83a7ff', '#b996ff'],
    light: ['#b8264f', '#98621a', '#857100', '#18734a', '#007c98', '#2157b6', '#6d43aa'],
  },
  brutalist: {
    dark: ['#ff3366', '#ff8c00', '#ffe500', '#36ff65', '#00d7ff', '#5271ff', '#d738ff'],
    light: ['#e60046', '#d96a00', '#8f7600', '#008f31', '#007da0', '#263ccf', '#8f00b3'],
  },
  clay: {
    dark: ['#ff8f8f', '#f7b267', '#ffe08a', '#8ee6a8', '#8bdbe8', '#9eb7ff', '#d9a6ff'],
    light: ['#c44b6a', '#b76725', '#9c7c09', '#3e8f5b', '#2b8493', '#556fc1', '#9360ae'],
  },
  win95: {
    dark: ['#800000', '#663300', '#444400', '#005500', '#005555', '#000080', '#550055'],
    light: ['#800000', '#804000', '#555500', '#005500', '#005555', '#000080', '#550055'],
  },
  win2k: {
    dark: ['#800000', '#804000', '#555500', '#005500', '#005555', '#0a246a', '#550055'],
    light: ['#800000', '#804000', '#555500', '#005500', '#005555', '#0a246a', '#550055'],
  },
  winaero: {
    dark: ['#f44d4d', '#f7a84d', '#ffdd44', '#7ed321', '#00bcf2', '#0078d4', '#b774d4'],
    light: ['#e81123', '#d9530f', '#a08000', '#389e0d', '#00bcf2', '#0078d4', '#881798'],
  },
};

export const buildRainbow = (colors: string[]) => ({
  red: colors[0],
  orange: colors[1],
  yellow: colors[2],
  green: colors[3],
  cyan: colors[4],
  blue: colors[5],
  violet: colors[6],
});

export const COMPARISON_OPTIONS = [
  { id: 'none', label: 'None' },
  { id: 'yesterday', label: 'Yesterday' },
  { id: 'same_day_last_week', label: 'Same day last week' },
  { id: 'same_range_last_week', label: 'Same range last week' },
] as const;

export type ComparisonOption = (typeof COMPARISON_OPTIONS)[number]['id'];

export const ANALYTICS_COMPARE_KEY = 'bluetti-analytics:compare';

export function getStoredComparisonOption(): ComparisonOption {
  if (typeof window === 'undefined') return 'none';
  const stored = window.localStorage.getItem(ANALYTICS_COMPARE_KEY);
  return COMPARISON_OPTIONS.some((opt) => opt.id === stored) ? (stored as ComparisonOption) : 'none';
}

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

export type AnalyticsTheme = 'dark' | 'light';
export type AnalyticsDensity = 'comfortable' | 'compact';

export function getStoredAnalyticsSkin(): AnalyticsSkin {
  if (typeof window === 'undefined') {
    return 'modern';
  }
  const stored = window.localStorage.getItem(ANALYTICS_SKIN_KEY);
  return SKIN_OPTIONS.some((option) => option.id === stored) ? stored as AnalyticsSkin : 'modern';
}

export function getChartColors(skin: AnalyticsSkin, theme: AnalyticsTheme) {
  return ANALYTICS_CHART_COLORS[skin]?.[theme] ?? ANALYTICS_CHART_COLORS.modern[theme];
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
