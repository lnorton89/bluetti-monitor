import { useQuery } from '@tanstack/react-query';
import { BatteryCharging } from 'lucide-react';
import { fetchHistoryBundle } from '../lib/api';
import type { BatteryEstimateResult, DeviceState, EstimateHistory } from '../lib/battery-estimates';
import {
  buildBatteryEstimate,
  ESTIMATE_HISTORY_ALIASES,
  formatDuration,
  getBatteryCapacityWh,
  getBatteryPercent,
  getBatteryRangeEndPercent,
  getBatteryRangeStartPercent,
  isBatteryEmpty,
  isBatteryFull,
  isCharging,
  isSystemIdle,
} from '../lib/battery-estimates';
import { StatHelpTooltip, type StatHelpContent } from './ui';

interface BatteryEstimatesProps {
  deviceId?: string;
  state: DeviceState;
}

const BATTERY_HISTORY_FIELDS = [
  'total_battery_percent',
  'battery_percent',
  'charge_level',
  'soc',
  'pack_soc',
  'pack_battery_percent',
] as const;

const ESTIMATE_HISTORY_FIELDS = Object.values(ESTIMATE_HISTORY_ALIASES).flat();

function getHistoryPointValue(state: DeviceState, fields: readonly string[]): string {
  for (const field of fields) {
    const value = state[field]?.value;
    if (value !== undefined) {
      return value;
    }
  }

  return 'unavailable';
}

function buildRuntimeTooltip(state: DeviceState, estimate: BatteryEstimateResult): StatHelpContent {
  const capacityWh = getBatteryCapacityWh(state);
  const floorPercent = getBatteryRangeStartPercent(state);

  return {
    summary: `Runtime uses ${estimate.sourceLabel.toLowerCase()} with ${estimate.confidence} confidence.`,
    dataPoints: [
      `selected source: ${estimate.sourceLabel}`,
      `confidence: ${estimate.confidence}`,
      `battery_range_to_empty: ${state['battery_range_to_empty']?.value ?? 'unavailable'}`,
      `battery_capacity: ${state['battery_capacity']?.value ?? state['pack_capacity']?.value ?? 'unavailable'}`,
      `remaining_capacity: ${state['remaining_capacity']?.value ?? 'unavailable'}`,
      `battery percent: ${getHistoryPointValue(state, BATTERY_HISTORY_FIELDS)}`,
      `battery_range_start: ${state['battery_range_start']?.value ?? String(floorPercent)}`,
      `ac_output_power: ${state['ac_output_power']?.value ?? '0'}`,
      `dc_output_power: ${state['dc_output_power']?.value ?? '0'}`,
      ...estimate.inputs,
    ],
    calculation: [
      'Build candidates from device range, similar historical windows, historical calibration, instant net power, and recent SOC trend.',
      `For instant runtime, derive remaining energy from battery percent and live capacity${capacityWh ? ` (~${Math.round(capacityWh)} Wh right now)` : ''}.`,
      'runtimeMinutes = remainingWh / (total output power - total input power) * 60',
      `Trend and historical tactics estimate time down to the ${floorPercent}% floor.`,
      ...estimate.caveats,
    ],
    note: estimate.detail,
  };
}

function buildChargeTooltip(state: DeviceState, estimate: BatteryEstimateResult): StatHelpContent {
  const capacityWh = getBatteryCapacityWh(state);
  const targetPercent = getBatteryRangeEndPercent(state);

  return {
    summary: `Time to Full uses ${estimate.sourceLabel.toLowerCase()} with ${estimate.confidence} confidence.`,
    dataPoints: [
      `selected source: ${estimate.sourceLabel}`,
      `confidence: ${estimate.confidence}`,
      `battery_range_to_full: ${state['battery_range_to_full']?.value ?? 'unavailable'}`,
      `battery_capacity: ${state['battery_capacity']?.value ?? state['pack_capacity']?.value ?? 'unavailable'}`,
      `remaining_capacity: ${state['remaining_capacity']?.value ?? 'unavailable'}`,
      `battery percent: ${getHistoryPointValue(state, BATTERY_HISTORY_FIELDS)}`,
      `battery_range_end: ${state['battery_range_end']?.value ?? String(targetPercent)}`,
      `ac_input_power: ${state['ac_input_power']?.value ?? state['grid_charge_power']?.value ?? '0'}`,
      `dc_input_power: ${state['dc_input_power']?.value ?? state['pv_input_power']?.value ?? state['solar_power']?.value ?? '0'}`,
      `pv1_power: ${state['pv1_power']?.value ?? '0'}`,
      `pv2_power: ${state['pv2_power']?.value ?? '0'}`,
      ...estimate.inputs,
    ],
    calculation: [
      'Build candidates from device range, similar historical windows, historical calibration, instant net power, and recent SOC trend.',
      `Estimate total capacity from live or calibrated capacity${capacityWh ? ` (~${Math.round(capacityWh)} Wh right now)` : ''}.`,
      `targetWh = capacityWh * ${targetPercent}%`,
      'deficitWh = targetWh - remainingWh',
      'chargeMinutes = deficitWh / (total input power - total output power) * 60',
      `Trend and historical tactics estimate time up to ${targetPercent}%.`,
      ...estimate.caveats,
    ],
    note: estimate.detail,
  };
}

function mapHistoryBundle(bundle: Record<string, { value: string; ts: string }[]>): EstimateHistory {
  return Object.fromEntries(
    Object.entries(ESTIMATE_HISTORY_ALIASES).map(([key, aliases]) => [
      key,
      aliases.map((field) => bundle[field] ?? []).find((history) => history.length > 1) ?? [],
    ]),
  ) as EstimateHistory;
}

async function fetchEstimateHistory(deviceId: string): Promise<EstimateHistory> {
  const since = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();
  const bundle = await fetchHistoryBundle(deviceId, ESTIMATE_HISTORY_FIELDS, { limit: 80, since });
  return mapHistoryBundle(bundle);
}

export function BatteryEstimates({ deviceId, state }: BatteryEstimatesProps) {
  const charging = isCharging(state);
  const isFull = isBatteryFull(state);
  const isEmpty = isBatteryEmpty(state);
  const isIdle = isSystemIdle(state);
  const batteryPercent = getBatteryPercent(state);
  const batteryHistoryQuery = useQuery({
    queryKey: ['battery-estimate-history', deviceId],
    enabled: Boolean(deviceId),
    staleTime: 60_000,
    queryFn: () => fetchEstimateHistory(deviceId!),
  });

  const history = batteryHistoryQuery.data ?? {};
  const runtimeEstimate = buildBatteryEstimate('runtime', state, history);
  const chargeEstimate = buildBatteryEstimate('charge', state, history);
  const runtimeMinutes = runtimeEstimate.minutes;
  const chargeMinutes = charging || isFull ? chargeEstimate.minutes : null;

  let runtimeDisplay = '--';
  if (isEmpty) {
    runtimeDisplay = '0m';
  } else if (isIdle) {
    runtimeDisplay = '--';
  } else {
    runtimeDisplay = formatDuration(runtimeMinutes);
  }

  let chargeDisplay = '--';
  if (isFull) {
    chargeDisplay = 'Full';
  } else if (isIdle && !charging) {
    chargeDisplay = '--';
  } else {
    chargeDisplay = formatDuration(chargeMinutes);
  }

  const getRuntimeTone = () => {
    if (batteryPercent === null) return 'var(--text-dim)';
    if (batteryPercent >= 50) return 'var(--green)';
    if (batteryPercent >= 20) return 'var(--amber)';
    return 'var(--red)';
  };

  const showChargeEstimate = charging || isFull || chargeMinutes !== null;
  return (
    <div className="battery-estimates">
      <div className="estimate-item">
        <span className="estimate-label-group">
          <span className="estimate-label">Runtime</span>
          <StatHelpTooltip label="Runtime" content={buildRuntimeTooltip(state, runtimeEstimate)} />
        </span>
        <span
          className="estimate-value"
          style={{ color: getRuntimeTone() }}
          title={`${runtimeEstimate.sourceLabel} (${runtimeEstimate.confidence})`}
        >
          {runtimeDisplay}
        </span>
      </div>
      {showChargeEstimate && (
        <div className="estimate-item charging">
          <BatteryCharging size={14} className="estimate-icon" />
          <span className="estimate-label-group">
            <span className="estimate-label">{isFull ? 'Status' : 'Time to Full'}</span>
            <StatHelpTooltip
              label={isFull ? 'Status' : 'Time to Full'}
              content={buildChargeTooltip(state, chargeEstimate)}
            />
          </span>
          <span
            className="estimate-value"
            title={`${chargeEstimate.sourceLabel} (${chargeEstimate.confidence})`}
          >
            {chargeDisplay}
          </span>
        </div>
      )}
    </div>
  );
}
