import type { DeviceState, HistoryPoint } from './api';
import { getFieldMeta, isNumericValue } from './fields';
import { type ComparisonOption } from './constants';

export const RANGE_PRESETS = [
  { id: '1h', label: '1H', minutes: 60, limit: 900, bucketMs: 60_000 },
  { id: '6h', label: '6H', minutes: 360, limit: 2_400, bucketMs: 5 * 60_000 },
  { id: '24h', label: '24H', minutes: 1_440, limit: 12_000, bucketMs: 15 * 60_000 },
  { id: '3d', label: '3D', minutes: 4_320, limit: 36_000, bucketMs: 60 * 60_000 },
  { id: '7d', label: '7D', minutes: 10_080, limit: 84_000, bucketMs: 2 * 60 * 60_000 },
] as const;

export type PresetId = typeof RANGE_PRESETS[number]['id'];
export type RangeId = PresetId | 'custom';
export const CUSTOM_RANGE_ID = 'custom' as const;

export function buildCustomRange(startIso: string, endIso: string) {
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  const diffMs = Math.max(60_000, end - start);
  const minutes = diffMs / 60_000;

  let bucketMs: number;
  if (minutes <= 180) {
    bucketMs = 60_000;
  } else if (minutes <= 720) {
    bucketMs = 5 * 60_000;
  } else if (minutes <= 4_320) {
    bucketMs = 15 * 60_000;
  } else if (minutes <= 10_080) {
    bucketMs = 60 * 60_000;
  } else if (minutes <= 43_200) {
    bucketMs = 2 * 60 * 60_000;
  } else {
    bucketMs = 6 * 60 * 60_000;
  }

  const limit = Math.ceil(minutes * 60_000 / bucketMs * 1.2);

  return { minutes, limit, bucketMs } as const;
}

export function computeComparisonRange(sinceIso: string, rangeMinutes: number, option: ComparisonOption): { since: string; label: string; offsetMs: number } | null {
  if (option === 'none') return null;

  const since = Date.parse(sinceIso);
  if (!Number.isFinite(since)) return null;

  let offsetMs: number;
  let label: string;

  switch (option) {
    case 'yesterday':
      offsetMs = 24 * 60 * 60_000;
      label = 'Yesterday';
      break;
    case 'same_day_last_week':
      offsetMs = 7 * 24 * 60 * 60_000;
      label = 'Same day last week';
      break;
    case 'same_range_last_week':
      offsetMs = 7 * 24 * 60 * 60_000;
      label = 'Same range last week';
      break;
    default:
      return null;
  }

  return { since: new Date(since - offsetMs).toISOString(), label, offsetMs };
}

export const METRIC_ALIASES = {
  solarInput: ['dc_input_power', 'internal_dc_input_power', 'pv_input_power', 'solar_power'],
  solarVoltage: ['internal_dc_input_voltage', 'pv_input_voltage', 'dc_input_voltage', 'solar_voltage'],
  dcInput1Power: ['dc_input_1_power', 'dc_input_power1', 'pv1_power'],
  dcInput1Voltage: ['dc_input_1_voltage', 'dc_input_voltage1', 'pv1_voltage'],
  dcInput2Power: ['dc_input_2_power', 'dc_input_power2', 'pv2_power'],
  dcInput2Voltage: ['dc_input_2_voltage', 'dc_input_voltage2', 'pv2_voltage'],
  gridInput: ['ac_input_power', 'grid_charge_power'],
  acLoad: ['ac_output_power', 'internal_power_one'],
  dcLoad: ['dc_output_power'],
  batteryPercent: ['total_battery_percent', 'pack_battery_percent', 'battery_percent', 'soc'],
  batteryVoltage: ['total_battery_voltage', 'pack_voltage', 'battery_voltage'],
  internalAcVoltage: ['internal_ac_voltage', 'ac_output_voltage'],
  generatedEnergy: ['power_generation'],
} as const;

export type MetricKey = keyof typeof METRIC_ALIASES;
export type ResolvedFields = Record<MetricKey, string | null>;

export interface TimelinePoint {
  ts: number;
  solarInput: number | null;
  solarVoltage: number | null;
  dcInput1Power: number | null;
  dcInput1Voltage: number | null;
  dcInput2Power: number | null;
  dcInput2Voltage: number | null;
  gridInput: number | null;
  totalInput: number | null;
  acLoad: number | null;
  dcLoad: number | null;
  totalOutput: number | null;
  netPower: number | null;
  batteryPercent: number | null;
  batteryVoltage: number | null;
  internalAcVoltage: number | null;
  generatedEnergy: number | null;
}

export interface MetricSummary {
  current: number | null;
  start: number | null;
  min: number;
  max: number;
  avg: number;
  change: number | null;
  points: number;
}

type Bucket = { sum: number; count: number };

export function resolveFields(fields: string[]): ResolvedFields {
  const available = new Set(fields);

  return Object.fromEntries(
    Object.entries(METRIC_ALIASES).map(([metric, aliases]) => [
      metric,
      aliases.find((field) => available.has(field)) ?? null,
    ]),
  ) as ResolvedFields;
}

export function getNumericFields(fields: string[], state: DeviceState) {
  return fields.filter((field) => {
    const meta = getFieldMeta(field);
    const liveValue = state[field]?.value;
    return meta.numeric || (liveValue !== undefined && isNumericValue(liveValue));
  });
}

export function fieldsForResolved(resolved: ResolvedFields) {
  return [...new Set(Object.values(resolved).filter((field): field is string => Boolean(field)))];
}

export function buildTimeline(
  resolved: ResolvedFields,
  historyByField: Record<string, HistoryPoint[]>,
  bucketMs: number,
): TimelinePoint[] {
  const metricBuckets = Object.fromEntries(
    Object.entries(resolved).map(([metric, field]) => [
      metric,
      field ? bucketHistory(historyByField[field] ?? [], bucketMs) : new Map<number, number>(),
    ]),
  ) as Record<MetricKey, Map<number, number>>;

  const timestamps = collectTimestamps(Object.values(metricBuckets));

  return timestamps.map((ts) => {
    const solarInput = metricBuckets.solarInput.get(ts) ?? null;
    const solarVoltage = metricBuckets.solarVoltage.get(ts) ?? null;
    const dcInput1Power = metricBuckets.dcInput1Power.get(ts) ?? null;
    const dcInput1Voltage = metricBuckets.dcInput1Voltage.get(ts) ?? null;
    const dcInput2Power = metricBuckets.dcInput2Power.get(ts) ?? null;
    const dcInput2Voltage = metricBuckets.dcInput2Voltage.get(ts) ?? null;
    const gridInput = metricBuckets.gridInput.get(ts) ?? null;
    const acLoad = metricBuckets.acLoad.get(ts) ?? null;
    const dcLoad = metricBuckets.dcLoad.get(ts) ?? null;
    const totalInput = solarInput !== null || gridInput !== null ? (solarInput ?? 0) + (gridInput ?? 0) : null;
    const totalOutput = acLoad !== null || dcLoad !== null ? (acLoad ?? 0) + (dcLoad ?? 0) : null;

    return {
      ts,
      solarInput,
      solarVoltage,
      dcInput1Power,
      dcInput1Voltage,
      dcInput2Power,
      dcInput2Voltage,
      gridInput,
      totalInput,
      acLoad,
      dcLoad,
      totalOutput,
      netPower: solarInput !== null || gridInput !== null || acLoad !== null || dcLoad !== null
        ? (solarInput ?? 0) + (gridInput ?? 0) - (acLoad ?? 0) - (dcLoad ?? 0)
        : null,
      batteryPercent: metricBuckets.batteryPercent.get(ts) ?? null,
      batteryVoltage: metricBuckets.batteryVoltage.get(ts) ?? null,
      internalAcVoltage: metricBuckets.internalAcVoltage.get(ts) ?? null,
      generatedEnergy: metricBuckets.generatedEnergy.get(ts) ?? null,
    };
  });
}

export function buildComparisonTimeline(
  fields: string[],
  historyByField: Record<string, HistoryPoint[]>,
  bucketMs: number,
) {
  const buckets = Object.fromEntries(
    fields.map((field) => [field, bucketHistory(historyByField[field] ?? [], bucketMs)]),
  ) as Record<string, Map<number, number>>;
  const timestamps = collectTimestamps(Object.values(buckets));

  return timestamps.map((ts) => {
    const row: { ts: number } & Record<string, number | null> = { ts };
    for (const field of fields) {
      row[field] = buckets[field]?.get(ts) ?? null;
    }
    return row;
  });
}

export function summarize(rows: TimelinePoint[], key: keyof TimelinePoint): MetricSummary | null {
  let current: number | null = null;
  let start: number | null = null;
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  let sum = 0;
  let points = 0;

  for (const row of rows) {
    const value = row[key];
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      continue;
    }

    start ??= value;
    current = value;
    min = Math.min(min, value);
    max = Math.max(max, value);
    sum += value;
    points += 1;
  }

  if (points === 0) {
    return null;
  }

  return {
    current,
    start,
    min,
    max,
    avg: sum / points,
    change: current !== null && start !== null ? current - start : null,
    points,
  };
}

export function findPeak(rows: TimelinePoint[], key: keyof TimelinePoint) {
  return rows.reduce<TimelinePoint | null>((best, row) => {
    const value = row[key];
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      return best;
    }

    if (!best || value > (best[key] as number)) {
      return row;
    }

    return best;
  }, null);
}

export function getEnergyDelta(rows: TimelinePoint[]) {
  let first: number | null = null;
  let last: number | null = null;
  let points = 0;

  for (const row of rows) {
    const value = row.generatedEnergy;
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      continue;
    }

    first ??= value;
    last = value;
    points += 1;
  }

  if (points < 2 || first === null || last === null) {
    return null;
  }

  const delta = last - first;
  return delta >= 0 ? delta : null;
}

export function clampPercent(value: number | null) {
  if (value === null || !Number.isFinite(value)) {
    return null;
  }

  return Math.max(0, Math.min(999, value));
}

function bucketHistory(points: HistoryPoint[], bucketMs: number) {
  const buckets = new Map<number, Bucket>();

  for (const point of points) {
    const value = Number.parseFloat(point.value);
    const timestamp = Date.parse(point.ts);

    if (!Number.isFinite(value) || !Number.isFinite(timestamp)) {
      continue;
    }

    const bucket = Math.floor(timestamp / bucketMs) * bucketMs;
    let entry = buckets.get(bucket);
    if (!entry) {
      entry = { sum: 0, count: 0 };
      buckets.set(bucket, entry);
    }
    entry.sum += value;
    entry.count += 1;
  }

  const averaged = new Map<number, number>();
  const sortedBuckets = Array.from(buckets.keys()).sort((left, right) => left - right);
  for (const bucket of sortedBuckets) {
    const entry = buckets.get(bucket)!;
    averaged.set(bucket, entry.sum / entry.count);
  }

  return averaged;
}

function collectTimestamps(series: Array<Map<number, number>>) {
  const timestamps = new Set<number>();
  for (const item of series) {
    for (const key of item.keys()) {
      timestamps.add(key);
    }
  }

  return Array.from(timestamps).sort((left, right) => left - right);
}
