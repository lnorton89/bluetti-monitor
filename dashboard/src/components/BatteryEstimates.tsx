import { Clock, BatteryCharging, Info } from 'lucide-react';
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
        <span className="estimate-label">Runtime</span>
        <span className="estimate-value" style={{ color: getRuntimeTone() }}>
          {runtimeDisplay}
        </span>
        <EstimateConfidence estimated={runtimeEstimated && runtimeDisplay !== '—'} />
      </div>
      {(charging || isFull) && (
        <div className="estimate-item charging">
          <BatteryCharging size={14} className="estimate-icon" />
          <span className="estimate-label">{isFull ? 'Status' : 'Time to Full'}</span>
          <span className="estimate-value">{chargeDisplay}</span>
          <EstimateConfidence estimated={chargeEstimated && chargeDisplay !== '—'} />
        </div>
      )}
    </div>
  );
}