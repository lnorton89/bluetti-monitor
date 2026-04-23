import { useQuery } from '@tanstack/react-query';
import { BatteryCharging, Clock, Info } from 'lucide-react';
import { fetchHistory } from '../lib/api';
import type { DeviceState, HistoryPoint } from '../lib/battery-estimates';
import {
  estimateChargeTimeMinutes,
  estimateChargeTimeMinutesFromHistory,
  estimateRuntimeMinutes,
  estimateRuntimeMinutesFromInferredCapacity,
  estimateRuntimeMinutesFromHistory,
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

function EstimateConfidence({ estimated }: { estimated: boolean }) {
  if (!estimated) return null;
  return (
    <span
      className="estimate-confidence"
      title="Based on current telemetry and recent trend data; actual rate may vary"
    >
      <Info size={10} />
      <span>estimated</span>
    </span>
  );
}

function getHistoryPointValue(state: DeviceState, fields: readonly string[]): string {
  for (const field of fields) {
    const value = state[field]?.value;
    if (value !== undefined) {
      return value;
    }
  }

  return 'unavailable';
}

function buildRuntimeTooltip(state: DeviceState, estimated: boolean): StatHelpContent {
  const capacityWh = getBatteryCapacityWh(state);
  const floorPercent = getBatteryRangeStartPercent(state);

  return {
    summary: estimated
      ? 'Runtime is estimated because the device did not publish a direct battery_range_to_empty value.'
      : 'Runtime comes from the device-reported battery_range_to_empty field.',
    dataPoints: [
      `battery_range_to_empty: ${state['battery_range_to_empty']?.value ?? 'unavailable'}`,
      `battery_capacity: ${state['battery_capacity']?.value ?? state['pack_capacity']?.value ?? 'unavailable'}`,
      `remaining_capacity: ${state['remaining_capacity']?.value ?? 'unavailable'}`,
      `battery percent: ${getHistoryPointValue(state, BATTERY_HISTORY_FIELDS)}`,
      `battery_range_start: ${state['battery_range_start']?.value ?? String(floorPercent)}`,
      `ac_output_power: ${state['ac_output_power']?.value ?? '0'}`,
      `dc_output_power: ${state['dc_output_power']?.value ?? '0'}`,
    ],
    calculation: estimated
      ? [
          'Use remaining_capacity directly when the device publishes it.',
          `Otherwise derive remaining energy from battery percent and live capacity${capacityWh ? ` (~${Math.round(capacityWh)} Wh right now)` : ''}.`,
          'runtimeMinutes = remainingWh / (ac_output_power + dc_output_power) * 60',
          'If no battery-capacity field is available, infer effective capacity from recent battery-percent change and net battery power.',
          `If capacity telemetry is unavailable, derive runtime from recent battery-percent decline down to the ${floorPercent}% floor.`,
        ]
      : [
          'Read battery_range_to_empty directly from live telemetry.',
          'Format the reported minutes into h/m display text.',
        ],
    note: estimated
      ? 'The estimate prefers direct device fields, then live power plus capacity telemetry, then recent battery-percent trend.'
      : undefined,
  };
}

function buildChargeTooltip(state: DeviceState, estimated: boolean): StatHelpContent {
  const capacityWh = getBatteryCapacityWh(state);
  const targetPercent = getBatteryRangeEndPercent(state);

  return {
    summary: estimated
      ? 'Time to Full is estimated because the device did not publish battery_range_to_full.'
      : 'Time to Full comes from the device-reported battery_range_to_full field.',
    dataPoints: [
      `battery_range_to_full: ${state['battery_range_to_full']?.value ?? 'unavailable'}`,
      `battery_capacity: ${state['battery_capacity']?.value ?? state['pack_capacity']?.value ?? 'unavailable'}`,
      `remaining_capacity: ${state['remaining_capacity']?.value ?? 'unavailable'}`,
      `battery percent: ${getHistoryPointValue(state, BATTERY_HISTORY_FIELDS)}`,
      `battery_range_end: ${state['battery_range_end']?.value ?? String(targetPercent)}`,
      `ac_input_power: ${state['ac_input_power']?.value ?? state['grid_charge_power']?.value ?? '0'}`,
      `dc_input_power: ${state['dc_input_power']?.value ?? state['pv_input_power']?.value ?? state['solar_power']?.value ?? '0'}`,
      `pv1_power: ${state['pv1_power']?.value ?? '0'}`,
      `pv2_power: ${state['pv2_power']?.value ?? '0'}`,
    ],
    calculation: estimated
      ? [
          `Estimate total capacity from live battery-capacity telemetry${capacityWh ? ` (~${Math.round(capacityWh)} Wh right now)` : ''}.`,
          'Estimate remaining energy from remaining_capacity or battery percent.',
          'deficitWh = capacityWh - remainingWh',
          'chargeMinutes = deficitWh / chargePower * 60',
          `If capacity telemetry is unavailable, derive time to full from recent battery-percent climb toward ${targetPercent}%.`,
        ]
      : [
          'Read battery_range_to_full directly from live telemetry.',
          'Format the reported minutes into h/m display text.',
        ],
    note: estimated
      ? 'The estimate prefers direct device fields, then live charge power plus capacity telemetry, then recent battery-percent trend.'
      : undefined,
  };
}

async function fetchBatteryHistory(deviceId: string): Promise<HistoryPoint[]> {
  const since = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();

  for (const field of BATTERY_HISTORY_FIELDS) {
    const history = await fetchHistory(deviceId, field, { limit: 120, since });
    if (history.length > 1) {
      return history;
    }
  }

  return [];
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
    queryFn: () => fetchBatteryHistory(deviceId!),
  });

  const history = batteryHistoryQuery.data ?? [];
  const runtimeDirectMinutes = estimateRuntimeMinutes(state);
  const runtimeHistoryMinutes = estimateRuntimeMinutesFromHistory(state, history);
  const runtimeInferredMinutes = estimateRuntimeMinutesFromInferredCapacity(state, history);
  const chargeDirectMinutes = estimateChargeTimeMinutes(state);
  const chargeHistoryMinutes = estimateChargeTimeMinutesFromHistory(state, history);
  const runtimeMinutes = runtimeDirectMinutes ?? runtimeInferredMinutes ?? runtimeHistoryMinutes;
  const chargeMinutes = chargeDirectMinutes ?? chargeHistoryMinutes;
  const runtimeEstimated = state['battery_range_to_empty'] === undefined && runtimeMinutes !== null;
  const chargeEstimated = state['battery_range_to_full'] === undefined && chargeMinutes !== null;

  let runtimeDisplay = '--';
  if (isEmpty) {
    runtimeDisplay = '0m';
  } else if (isIdle) {
    runtimeDisplay = '--';
  } else {
    runtimeDisplay = formatDuration(runtimeMinutes).replace('â€”', '--');
  }

  let chargeDisplay = '--';
  if (isFull) {
    chargeDisplay = 'Full';
  } else if (isIdle && !charging) {
    chargeDisplay = '--';
  } else {
    chargeDisplay = formatDuration(chargeMinutes).replace('â€”', '--');
  }

  const getRuntimeTone = () => {
    if (batteryPercent === null) return 'var(--text-dim)';
    if (batteryPercent >= 50) return 'var(--green)';
    if (batteryPercent >= 20) return 'var(--amber)';
    return 'var(--red)';
  };

  const showChargeEstimate = charging || isFull || chargeMinutes !== null;
  const runtimeMissing = runtimeDisplay === '--';
  const chargeMissing = chargeDisplay === '--';

  return (
    <div className="battery-estimates">
      <div className="estimate-item">
        <Clock size={14} className="estimate-icon" />
        <span className="estimate-label-group">
          <span className="estimate-label">Runtime</span>
          <StatHelpTooltip label="Runtime" content={buildRuntimeTooltip(state, runtimeEstimated)} />
        </span>
        <span className="estimate-value" style={{ color: getRuntimeTone() }}>
          {runtimeDisplay}
        </span>
        <EstimateConfidence estimated={runtimeEstimated && !runtimeMissing} />
      </div>
      {showChargeEstimate && (
        <div className="estimate-item charging">
          <BatteryCharging size={14} className="estimate-icon" />
          <span className="estimate-label-group">
            <span className="estimate-label">{isFull ? 'Status' : 'Time to Full'}</span>
            <StatHelpTooltip
              label={isFull ? 'Status' : 'Time to Full'}
              content={buildChargeTooltip(state, chargeEstimated)}
            />
          </span>
          <span className="estimate-value">{chargeDisplay}</span>
          <EstimateConfidence estimated={chargeEstimated && !chargeMissing} />
        </div>
      )}
    </div>
  );
}
