import type { HistoryPoint } from './api';

export const CORE_FIELD_ALIASES = {
  solarInput: ['dc_input_power', 'pv_input_power', 'solar_power'],
  gridInput: ['ac_input_power', 'grid_charge_power', 'grid_current'],
  acLoad: ['ac_output_power'],
  dcLoad: ['dc_output_power'],
  batteryPercent: ['total_battery_percent', 'battery_percent', 'charge_level', 'soc'],
  batteryVoltage: ['total_battery_voltage', 'battery_voltage'],
  internalTemp: ['internal_temp', 'ambient_temp', 'inverter_temp', 'transformer_temp'],
  fanSpeed: ['fan_speed'],
} as const;

export type CoreMetricKey = keyof typeof CORE_FIELD_ALIASES;

export interface ResolvedCoreFields {
  solarInput: string | null;
  gridInput: string | null;
  acLoad: string | null;
  dcLoad: string | null;
  batteryPercent: string | null;
  batteryVoltage: string | null;
  internalTemp: string | null;
  fanSpeed: string | null;
}

export interface AnalyticsTimelinePoint {
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
  internalTemp: number | null;
  fanSpeed: number | null;
}

export type ComparisonTimelinePoint = {
  ts: number;
} & Record<string, number | null>;

type MetricHistoryMap = Partial<Record<CoreMetricKey, HistoryPoint[]>>;
type BucketEntry = { count: number; sum: number };

export function resolveCoreFields(availableFields: string[]): ResolvedCoreFields {
  const fieldSet = new Set(availableFields);

  return {
    solarInput: CORE_FIELD_ALIASES.solarInput.find((field) => fieldSet.has(field)) ?? null,
    gridInput: CORE_FIELD_ALIASES.gridInput.find((field) => fieldSet.has(field)) ?? null,
    acLoad: CORE_FIELD_ALIASES.acLoad.find((field) => fieldSet.has(field)) ?? null,
    dcLoad: CORE_FIELD_ALIASES.dcLoad.find((field) => fieldSet.has(field)) ?? null,
    batteryPercent: CORE_FIELD_ALIASES.batteryPercent.find((field) => fieldSet.has(field)) ?? null,
    batteryVoltage: CORE_FIELD_ALIASES.batteryVoltage.find((field) => fieldSet.has(field)) ?? null,
    internalTemp: CORE_FIELD_ALIASES.internalTemp.find((field) => fieldSet.has(field)) ?? null,
    fanSpeed: CORE_FIELD_ALIASES.fanSpeed.find((field) => fieldSet.has(field)) ?? null,
  };
}

export function buildAnalyticsTimeline(historyByMetric: MetricHistoryMap, bucketMs: number): AnalyticsTimelinePoint[] {
  const bucketed = {
    solarInput: bucketHistory(historyByMetric.solarInput ?? [], bucketMs),
    gridInput: bucketHistory(historyByMetric.gridInput ?? [], bucketMs),
    acLoad: bucketHistory(historyByMetric.acLoad ?? [], bucketMs),
    dcLoad: bucketHistory(historyByMetric.dcLoad ?? [], bucketMs),
    batteryPercent: bucketHistory(historyByMetric.batteryPercent ?? [], bucketMs),
    batteryVoltage: bucketHistory(historyByMetric.batteryVoltage ?? [], bucketMs),
    internalTemp: bucketHistory(historyByMetric.internalTemp ?? [], bucketMs),
    fanSpeed: bucketHistory(historyByMetric.fanSpeed ?? [], bucketMs),
  };

  const timestamps = collectBucketKeys(Object.values(bucketed));

  return timestamps.map((ts) => {
    const solarInput = bucketed.solarInput.get(ts) ?? null;
    const gridInput = bucketed.gridInput.get(ts) ?? null;
    const acLoad = bucketed.acLoad.get(ts) ?? null;
    const dcLoad = bucketed.dcLoad.get(ts) ?? null;

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
      batteryPercent: bucketed.batteryPercent.get(ts) ?? null,
      batteryVoltage: bucketed.batteryVoltage.get(ts) ?? null,
      internalTemp: bucketed.internalTemp.get(ts) ?? null,
      fanSpeed: bucketed.fanSpeed.get(ts) ?? null,
    };
  });
}

export function buildIndexedComparisonTimeline(
  histories: Record<string, HistoryPoint[]>,
  bucketMs: number,
): ComparisonTimelinePoint[] {
  const bucketed = Object.fromEntries(
    Object.entries(histories).map(([field, points]) => [field, bucketHistory(points, bucketMs)]),
  ) as Record<string, Map<number, number>>;

  const timestamps = collectBucketKeys(Object.values(bucketed));
  const baselines = Object.fromEntries(
    Object.entries(bucketed).map(([field, series]) => [field, firstValidValue(series, timestamps)]),
  ) as Record<string, number | null>;

  return timestamps.map((ts) => {
    const row: ComparisonTimelinePoint = { ts };

    for (const [field, series] of Object.entries(bucketed)) {
      const value = series.get(ts) ?? null;
      const baseline = baselines[field];
      row[field] = value;
      row[`${field}Indexed`] = value !== null && baseline !== null && baseline !== 0
        ? (value / baseline) * 100
        : null;
    }

    return row;
  });
}

export function summarizeTimelineMetric(
  timeline: AnalyticsTimelinePoint[],
  key: keyof AnalyticsTimelinePoint,
) {
  const values = timeline
    .map((point) => point[key])
    .filter((value): value is number => typeof value === 'number' && Number.isFinite(value));

  if (values.length === 0) {
    return null;
  }

  const current = values.at(-1) ?? null;
  const start = values[0] ?? null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const avg = values.reduce((sum, value) => sum + value, 0) / values.length;

  return {
    current,
    start,
    min,
    max,
    avg,
    change: current !== null && start !== null ? current - start : null,
    points: values.length,
  };
}

export function findPeakPoint(
  timeline: AnalyticsTimelinePoint[],
  key: keyof AnalyticsTimelinePoint,
) {
  let match: AnalyticsTimelinePoint | null = null;
  let peak = Number.NEGATIVE_INFINITY;

  for (const point of timeline) {
    const value = point[key];
    if (typeof value === 'number' && Number.isFinite(value) && value > peak) {
      peak = value;
      match = point;
    }
  }

  return match;
}

export function buildCoverageLabel(bucketMs: number) {
  const minutes = Math.round(bucketMs / 60_000);
  if (minutes < 60) {
    return `${minutes} min buckets`;
  }

  return `${minutes / 60} hr buckets`;
}

function bucketHistory(points: HistoryPoint[], bucketMs: number) {
  const buckets = new Map<number, BucketEntry>();

  for (const point of points) {
    const numericValue = Number.parseFloat(point.value);
    const ts = Date.parse(point.ts);

    if (!Number.isFinite(numericValue) || !Number.isFinite(ts)) {
      continue;
    }

    const bucket = Math.floor(ts / bucketMs) * bucketMs;
    const current = buckets.get(bucket) ?? { count: 0, sum: 0 };
    current.count += 1;
    current.sum += numericValue;
    buckets.set(bucket, current);
  }

  return new Map(
    [...buckets.entries()]
      .sort((left, right) => left[0] - right[0])
      .map(([bucket, entry]) => [bucket, entry.sum / entry.count]),
  );
}

function collectBucketKeys(seriesList: Array<Map<number, number>>) {
  return [...new Set(seriesList.flatMap((series) => [...series.keys()]))].sort((left, right) => left - right);
}

function sumNullable(values: Array<number | null>) {
  const present = values.filter((value): value is number => value !== null);
  if (present.length === 0) {
    return null;
  }

  return present.reduce((sum, value) => sum + value, 0);
}

function hasAnyValue(values: Array<number | null>) {
  return values.some((value) => value !== null);
}

function firstValidValue(series: Map<number, number>, timestamps: number[]) {
  for (const ts of timestamps) {
    const value = series.get(ts);
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
  }

  return null;
}
