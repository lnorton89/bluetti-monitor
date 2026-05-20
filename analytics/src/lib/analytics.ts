import type { DeviceState, HistoryPoint } from './api';
import { getFieldMeta, isNumericValue } from './fields';

export const RANGE_PRESETS = [
  { id: '1h', label: '1H', minutes: 60, limit: 900, bucketMs: 60_000 },
  { id: '6h', label: '6H', minutes: 360, limit: 2_400, bucketMs: 5 * 60_000 },
  { id: '24h', label: '24H', minutes: 1_440, limit: 5_000, bucketMs: 15 * 60_000 },
  { id: '3d', label: '3D', minutes: 4_320, limit: 5_000, bucketMs: 60 * 60_000 },
  { id: '7d', label: '7D', minutes: 10_080, limit: 5_000, bucketMs: 2 * 60 * 60_000 },
] as const;

export type RangeId = typeof RANGE_PRESETS[number]['id'];

export const METRIC_ALIASES = {
  solarInput: ['dc_input_power', 'internal_dc_input_power', 'pv_input_power', 'solar_power'],
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
    const gridInput = metricBuckets.gridInput.get(ts) ?? null;
    const acLoad = metricBuckets.acLoad.get(ts) ?? null;
    const dcLoad = metricBuckets.dcLoad.get(ts) ?? null;

    return {
      ts,
      solarInput,
      gridInput,
      totalInput: sumNullable([solarInput, gridInput]),
      acLoad,
      dcLoad,
      totalOutput: sumNullable([acLoad, dcLoad]),
      netPower: hasAnyValue([solarInput, gridInput, acLoad, dcLoad])
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
  const values = rows
    .map((row) => row[key])
    .filter((value): value is number => typeof value === 'number' && Number.isFinite(value));

  if (values.length === 0) {
    return null;
  }

  const current = values.at(-1) ?? null;
  const start = values[0] ?? null;
  const avg = values.reduce((sum, value) => sum + value, 0) / values.length;

  return {
    current,
    start,
    min: Math.min(...values),
    max: Math.max(...values),
    avg,
    change: current !== null && start !== null ? current - start : null,
    points: values.length,
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
  const values = rows
    .map((row) => row.generatedEnergy)
    .filter((value): value is number => typeof value === 'number' && Number.isFinite(value));

  if (values.length < 2) {
    return null;
  }

  const delta = values.at(-1)! - values[0]!;
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
    const entry = buckets.get(bucket) ?? { sum: 0, count: 0 };
    entry.sum += value;
    entry.count += 1;
    buckets.set(bucket, entry);
  }

  return new Map(
    [...buckets.entries()]
      .sort((left, right) => left[0] - right[0])
      .map(([bucket, entry]) => [bucket, entry.sum / entry.count]),
  );
}

function collectTimestamps(series: Array<Map<number, number>>) {
  return [...new Set(series.flatMap((item) => [...item.keys()]))].sort((left, right) => left - right);
}

function sumNullable(values: Array<number | null>) {
  const present = values.filter((value): value is number => value !== null);
  return present.length > 0 ? present.reduce((sum, value) => sum + value, 0) : null;
}

function hasAnyValue(values: Array<number | null>) {
  return values.some((value) => value !== null);
}
