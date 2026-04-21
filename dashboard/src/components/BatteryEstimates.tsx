import { Clock, BatteryCharging, Info } from 'lucide-react';
import { StatHelpTooltip, type StatHelpContent } from './ui';
import type { DeviceState } from '../lib/battery-estimates';
import {
  estimateRuntimeMinutes,
  estimateChargeTimeMinutes,
  isCharging,
  formatDuration,
  isBatteryFull,
  isBatteryEmpty,
  isSystemIdle,
  getBatteryPercent,
} from '../lib/battery-estimates';

interface BatteryEstimatesProps {
  state: DeviceState;
}

/**
 * Detect if runtime estimate uses fallback calculation
 * Fallback is used when device doesn't provide battery_range_to_empty
 */
function isRuntimeEstimated(state: DeviceState): boolean {
  // If device provides direct value, it's not estimated
  if (state['battery_range_to_empty'] !== undefined) return false;
  // Fallback uses AC500 capacity constant
  return true;
}

/**
 * Detect if charge time estimate uses fallback calculation
 * Fallback is used when device doesn't provide battery_range_to_full
 */
function isChargeEstimated(state: DeviceState): boolean {
  // If device provides direct value, it's not estimated
  if (state['battery_range_to_full'] !== undefined) return false;
  // Fallback uses AC500 capacity constant
  return true;
}

function EstimateConfidence({ estimated }: { estimated: boolean }) {
  if (!estimated) return null;
  return (
    <span
      className="estimate-confidence"
      title="Based on typical values — actual rate may vary"
    >
      <Info size={10} />
      <span>estimated</span>
    </span>
  );
}

function buildRuntimeTooltip(state: DeviceState, estimated: boolean): StatHelpContent {
  return {
    summary: estimated
      ? 'Runtime is estimated because the device did not publish a direct battery_range_to_empty value.'
      : 'Runtime comes from the device-reported battery_range_to_empty field.',
    dataPoints: [
      `battery_range_to_empty: ${state['battery_range_to_empty']?.value ?? 'unavailable'}`,
      `total_battery_percent: ${state['total_battery_percent']?.value ?? state['battery_percent']?.value ?? state['soc']?.value ?? state['charge_level']?.value ?? 'unavailable'}`,
      `ac_output_power: ${state['ac_output_power']?.value ?? '0'}`,
      `dc_output_power: ${state['dc_output_power']?.value ?? '0'}`,
    ],
    calculation: estimated
      ? [
          'Fallback remainingWh = batteryPercent / 100 * 5120 Wh',
          'Fallback usableWh = max(remainingWh - 100 Wh, 0)',
          'Fallback runtimeMinutes = usableWh / (ac_output_power + dc_output_power) * 60',
        ]
      : [
          'Read battery_range_to_empty directly from live telemetry.',
          'Format the reported minutes into h/m display text.',
        ],
    note: estimated ? 'This assumes the AC500 5120 Wh base capacity and current load stay roughly steady.' : undefined,
  };
}

function buildChargeTooltip(state: DeviceState, estimated: boolean): StatHelpContent {
  return {
    summary: estimated
      ? 'Time to Full is estimated because the device did not publish battery_range_to_full.'
      : 'Time to Full comes from the device-reported battery_range_to_full field.',
    dataPoints: [
      `battery_range_to_full: ${state['battery_range_to_full']?.value ?? 'unavailable'}`,
      `battery percent: ${state['total_battery_percent']?.value ?? state['battery_percent']?.value ?? state['soc']?.value ?? state['charge_level']?.value ?? 'unavailable'}`,
      `ac_input_power: ${state['ac_input_power']?.value ?? '0'}`,
      `pv1_power: ${state['pv1_power']?.value ?? '0'}`,
      `pv2_power: ${state['pv2_power']?.value ?? '0'}`,
    ],
    calculation: estimated
      ? [
          'remainingWh = batteryPercent / 100 * 5120 Wh',
          'deficitWh = 5120 Wh - remainingWh',
          'chargeMinutes = deficitWh / (ac_input_power + pv1_power + pv2_power) * 60',
        ]
      : [
          'Read battery_range_to_full directly from live telemetry.',
          'Format the reported minutes into h/m display text.',
        ],
    note: estimated ? 'The estimate assumes current AC + solar charge rates stay close to the present readings.' : undefined,
  };
}

export function BatteryEstimates({ state }: BatteryEstimatesProps) {
  const charging = isCharging(state);
  const isFull = isBatteryFull(state);
  const isEmpty = isBatteryEmpty(state);
  const isIdle = isSystemIdle(state);
  const batteryPercent = getBatteryPercent(state);
  const runtimeEstimated = isRuntimeEstimated(state);
  const chargeEstimated = isChargeEstimated(state);

  let runtimeDisplay = '—';
  if (isEmpty) {
    runtimeDisplay = '0m';
  } else if (isIdle) {
    runtimeDisplay = '—';
  } else {
    const runtimeMinutes = estimateRuntimeMinutes(state);
    runtimeDisplay = formatDuration(runtimeMinutes);
  }

  let chargeDisplay = '—';
  if (isFull) {
    chargeDisplay = 'Full';
  } else if (isIdle && !charging) {
    chargeDisplay = '—';
  } else {
    const chargeMinutes = estimateChargeTimeMinutes(state);
    chargeDisplay = formatDuration(chargeMinutes);
  }

  const getRuntimeTone = () => {
    if (batteryPercent === null) return 'var(--text-dim)';
    if (batteryPercent >= 50) return 'var(--green)';
    if (batteryPercent >= 20) return 'var(--amber)';
    return 'var(--red)';
  };

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
        <EstimateConfidence estimated={runtimeEstimated && runtimeDisplay !== '—'} />
      </div>
      {(charging || isFull) && (
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
          <EstimateConfidence estimated={chargeEstimated && chargeDisplay !== '—'} />
        </div>
      )}
    </div>
  );
}
