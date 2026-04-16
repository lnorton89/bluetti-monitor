import { Clock, BatteryCharging } from 'lucide-react';
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

export function BatteryEstimates({ state }: BatteryEstimatesProps) {
  const charging = isCharging(state);
  const isFull = isBatteryFull(state);
  const isEmpty = isBatteryEmpty(state);
  const isIdle = isSystemIdle(state);
  const batteryPercent = getBatteryPercent(state);

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
      </div>
      {(charging || isFull) && (
        <div className="estimate-item charging">
          <BatteryCharging size={14} className="estimate-icon" />
          <span className="estimate-label">{isFull ? 'Status' : 'Time to Full'}</span>
          <span className="estimate-value">{chargeDisplay}</span>
        </div>
      )}
    </div>
  );
}