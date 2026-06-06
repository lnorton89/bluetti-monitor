type FieldValue = { value: string; ts: string };
export type DeviceState = Record<string, FieldValue>;
export type HistoryPoint = { value: string; ts: string };

export type EstimateKind = 'runtime' | 'charge';
export type EstimateSource =
  | 'device'
  | 'instant'
  | 'recent-trend'
  | 'historical-calibration'
  | 'historical-match'
  | 'unavailable';
export type EstimateConfidence = 'high' | 'medium' | 'low' | 'unavailable';

export type EstimateCandidate = {
  source: EstimateSource;
  sourceLabel: string;
  minutes: number | null;
  confidence: EstimateConfidence;
  detail: string;
  inputs: string[];
  caveats: string[];
  rejected?: boolean;
};

export type BatteryEstimateResult = {
  kind: EstimateKind;
  minutes: number | null;
  source: EstimateSource;
  sourceLabel: string;
  confidence: EstimateConfidence;
  detail: string;
  inputs: string[];
  caveats: string[];
  candidates: EstimateCandidate[];
};

export type EstimateHistory = Partial<Record<EstimateHistoryField, HistoryPoint[]>>;
export type EstimateHistoryField =
  | 'batteryPercent'
  | 'remainingCapacity'
  | 'batteryCapacity'
  | 'acInput'
  | 'dcInput'
  | 'pv1Power'
  | 'pv2Power'
  | 'acOutput'
  | 'dcOutput'
  | 'rangeToEmpty'
  | 'rangeToFull';

export const ESTIMATE_HISTORY_ALIASES: Record<EstimateHistoryField, readonly string[]> = {
  batteryPercent: [
    'total_battery_percent',
    'battery_percent',
    'soc',
    'charge_level',
    'pack_soc',
    'pack_battery_percent',
  ],
  remainingCapacity: ['remaining_capacity'],
  batteryCapacity: ['battery_capacity', 'pack_capacity'],
  acInput: ['ac_input_power', 'grid_charge_power'],
  dcInput: ['dc_input_power', 'pv_input_power', 'solar_power'],
  pv1Power: ['pv1_power', 'dc_input_1_power', 'dc_input_power1'],
  pv2Power: ['pv2_power', 'dc_input_2_power', 'dc_input_power2'],
  acOutput: ['ac_output_power'],
  dcOutput: ['dc_output_power'],
  rangeToEmpty: ['battery_range_to_empty'],
  rangeToFull: ['battery_range_to_full'],
};

const BATTERY_PERCENT_FIELDS = ESTIMATE_HISTORY_ALIASES.batteryPercent;
const BATTERY_CAPACITY_FIELDS = ESTIMATE_HISTORY_ALIASES.batteryCapacity;
const REMAINING_CAPACITY_FIELDS = ESTIMATE_HISTORY_ALIASES.remainingCapacity;
const AC_INPUT_FIELDS = ESTIMATE_HISTORY_ALIASES.acInput;
const SOLAR_INPUT_FIELDS = ESTIMATE_HISTORY_ALIASES.dcInput;
const SPLIT_SOLAR_FIELDS = [...ESTIMATE_HISTORY_ALIASES.pv1Power, ...ESTIMATE_HISTORY_ALIASES.pv2Power] as const;
const POWER_FLOW_DEADBAND_W = 20;
const STALE_DIRECT_COUNTER_MS = 15 * 60 * 1000;
const MIN_TREND_SPAN_MS = 12 * 60 * 1000;
const MIN_TREND_PERCENT_DELTA = 0.4;
const SIMILAR_POWER_TOLERANCE_W = 250;
const SIMILAR_SOC_TOLERANCE_PERCENT = 15;
const MAX_ESTIMATE_TIMELINE_ROWS = 80;

function getField(state: DeviceState, field: string): number | null {
  const raw = state[field]?.value;
  if (raw === undefined) return null;
  const parsed = parseFloat(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function getFirstField(state: DeviceState, fields: readonly string[]): number | null {
  for (const field of fields) {
    const value = getField(state, field);
    if (value !== null) {
      return value;
    }
  }

  return null;
}

function getSummedFields(state: DeviceState, fields: readonly string[]): number | null {
  let foundValue = false;
  let sum = 0;

  for (const field of fields) {
    const value = getField(state, field);
    if (value === null) {
      continue;
    }

    foundValue = true;
    sum += value;
  }

  return foundValue ? sum : null;
}

function latestStateTimestamp(state: DeviceState): number | null {
  let latest: number | null = null;

  for (const field of Object.values(state)) {
    const ts = Date.parse(field.ts);
    if (Number.isFinite(ts) && (latest === null || ts > latest)) {
      latest = ts;
    }
  }

  return latest;
}

function isFieldFresh(state: DeviceState, field: string): boolean {
  const latest = latestStateTimestamp(state);
  const fieldTs = Date.parse(state[field]?.ts ?? '');
  if (latest === null || !Number.isFinite(fieldTs)) {
    return true;
  }

  return latest - fieldTs <= STALE_DIRECT_COUNTER_MS;
}

export function getBatteryPercent(state: DeviceState): number | null {
  return getFirstField(state, BATTERY_PERCENT_FIELDS);
}

export function getBatteryCapacityWh(state: DeviceState): number | null {
  const directCapacity = getFirstField(state, BATTERY_CAPACITY_FIELDS);
  if (directCapacity !== null && directCapacity > 0) {
    return directCapacity;
  }

  const remainingCapacity = getRemainingCapacityWh(state);
  const batteryPercent = getBatteryPercent(state);
  if (remainingCapacity === null || batteryPercent === null || batteryPercent <= 0) {
    return null;
  }

  return remainingCapacity / (batteryPercent / 100);
}

export function getRemainingCapacityWh(state: DeviceState): number | null {
  const remainingCapacity = getFirstField(state, REMAINING_CAPACITY_FIELDS);
  if (remainingCapacity !== null && remainingCapacity >= 0) {
    return remainingCapacity;
  }

  const capacityWh = getFirstField(state, BATTERY_CAPACITY_FIELDS);
  const batteryPercent = getBatteryPercent(state);
  if (capacityWh === null || batteryPercent === null) {
    return null;
  }

  return (batteryPercent / 100) * capacityWh;
}

export function formatDuration(minutes: number | null): string {
  if (minutes === null || !Number.isFinite(minutes) || minutes < 1) {
    return '--';
  }
  const rounded = Math.max(0, Math.round(minutes));
  const hours = Math.floor(rounded / 60);
  const mins = rounded % 60;
  if (hours > 0) {
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }
  return `${mins}m`;
}

function candidate(
  source: EstimateSource,
  sourceLabel: string,
  minutes: number | null,
  confidence: EstimateConfidence,
  detail: string,
  inputs: string[],
  caveats: string[] = [],
  rejected = false,
): EstimateCandidate {
  return { source, sourceLabel, minutes, confidence, detail, inputs, caveats, rejected };
}

function chooseCandidate(kind: EstimateKind, candidates: EstimateCandidate[]): BatteryEstimateResult {
  const priority: Record<EstimateConfidence, number> = {
    high: 4,
    medium: 3,
    low: 2,
    unavailable: 1,
  };
  const sourcePriority: Record<EstimateSource, number> = {
    device: 7,
    'historical-match': 6,
    'historical-calibration': 5,
    'recent-trend': 3,
    instant: 2,
    unavailable: 1,
  };
  const valid = candidates
    .filter((item) => !item.rejected && item.minutes !== null && Number.isFinite(item.minutes) && item.minutes >= 0)
    .sort((left, right) => {
      const confidenceDelta = priority[right.confidence] - priority[left.confidence];
      if (confidenceDelta !== 0) return confidenceDelta;
      return sourcePriority[right.source] - sourcePriority[left.source];
    });

  const selected = valid[0] ?? candidate(
    'unavailable',
    'Unavailable',
    null,
    'unavailable',
    'No estimate tactic had enough trustworthy telemetry.',
    [],
    candidates.filter((item) => item.rejected || item.minutes === null).map((item) => item.detail),
  );

  const disagreements = findCandidateDisagreements(valid);
  return {
    kind,
    minutes: selected.minutes,
    source: selected.source,
    sourceLabel: selected.sourceLabel,
    confidence: selected.confidence,
    detail: selected.detail,
    inputs: selected.inputs,
    caveats: [...selected.caveats, ...disagreements],
    candidates,
  };
}

function findCandidateDisagreements(candidates: EstimateCandidate[]): string[] {
  if (candidates.length < 2) {
    return [];
  }

  const minutes = candidates
    .map((item) => item.minutes)
    .filter((value): value is number => value !== null && Number.isFinite(value) && value > 0);
  if (minutes.length < 2) {
    return [];
  }

  const low = Math.min(...minutes);
  const high = Math.max(...minutes);
  if (high / low >= 1.75) {
    return ['Estimate tactics disagree sharply; confidence is capped by the selected source.'];
  }

  return [];
}

function directCounterCandidate(
  state: DeviceState,
  kind: EstimateKind,
  field: 'battery_range_to_empty' | 'battery_range_to_full',
): EstimateCandidate {
  const direct = getField(state, field);
  const directionOk = kind === 'runtime'
    ? getTotalOutputPower(state) > getTotalInputPower(state) + POWER_FLOW_DEADBAND_W
    : getTotalInputPower(state) > getTotalOutputPower(state) + POWER_FLOW_DEADBAND_W || isBatteryFull(state);

  if (direct === null || direct < 0) {
    return candidate('device', `Device ${field}`, null, 'unavailable', `${field} is not currently usable.`, [
      `${field}: ${state[field]?.value ?? 'unavailable'}`,
    ], ['Device did not publish a non-negative direct range counter.'], true);
  }

  if (!isFieldFresh(state, field)) {
    return candidate('device', `Device ${field}`, null, 'unavailable', `${field} is stale relative to live telemetry.`, [
      `${field}: ${direct} min`,
    ], ['Direct device counter is older than the latest telemetry snapshot.'], true);
  }

  return candidate(
    'device',
    `Device ${field}`,
    direct,
    directionOk ? 'high' : 'medium',
    directionOk ? `Using live ${field}.` : `Using ${field}, but current power direction is ambiguous.`,
    [`${field}: ${direct} min`],
    directionOk ? [] : ['Power flow does not clearly match the direct counter direction.'],
  );
}

function instantRuntimeCandidate(state: DeviceState, effectiveCapacityWh: number | null): EstimateCandidate {
  const netDischargeW = getTotalOutputPower(state) - getTotalInputPower(state);
  const remainingWh = getRemainingCapacityWh(state)
    ?? estimateRemainingWhFromPercent(state, effectiveCapacityWh);

  if (netDischargeW <= POWER_FLOW_DEADBAND_W) {
    return candidate('instant', 'Instant net discharge', null, 'unavailable', 'Net discharge is below the useful estimate threshold.', [
      `net discharge: ${Math.round(netDischargeW)} W`,
      `deadband: ${POWER_FLOW_DEADBAND_W} W`,
    ], ['Input currently covers the load or the delta is too small.'], true);
  }

  if (remainingWh === null || remainingWh <= 0) {
    return candidate('instant', 'Instant net discharge', null, 'unavailable', 'Remaining energy is unavailable.', [
      `remaining_capacity: ${state.remaining_capacity?.value ?? 'unavailable'}`,
      `battery percent: ${getBatteryPercent(state) ?? 'unavailable'}`,
    ], ['Need remaining capacity or battery percent plus capacity.'], true);
  }

  return candidate(
    'instant',
    'Instant net discharge',
    (remainingWh / netDischargeW) * 60,
    'medium',
    'Estimated from current remaining energy and net discharge.',
    [`remaining energy: ${Math.round(remainingWh)} Wh`, `net discharge: ${Math.round(netDischargeW)} W`],
    ['Instantaneous power can be noisy if load or input changes.'],
  );
}

function instantChargeCandidate(state: DeviceState, effectiveCapacityWh: number | null): EstimateCandidate {
  const capacityWh = getBatteryCapacityWh(state) ?? effectiveCapacityWh;
  const remainingWh = getRemainingCapacityWh(state)
    ?? estimateRemainingWhFromPercent(state, capacityWh);
  if (capacityWh === null || remainingWh === null) {
    return candidate('instant', 'Instant net charge', null, 'unavailable', 'Capacity or remaining energy is unavailable.', [
      `battery_capacity: ${state.battery_capacity?.value ?? state.pack_capacity?.value ?? 'unavailable'}`,
      `remaining_capacity: ${state.remaining_capacity?.value ?? 'unavailable'}`,
    ], ['Need capacity plus remaining energy for charge deficit.'], true);
  }

  const targetWh = capacityWh * (getBatteryRangeEndPercent(state) / 100);
  if (remainingWh >= targetWh) {
    return candidate('instant', 'Instant net charge', 0, 'high', 'Battery is already at or above the configured charge ceiling.', [
      `remaining energy: ${Math.round(remainingWh)} Wh`,
      `target energy: ${Math.round(targetWh)} Wh`,
    ]);
  }

  const netChargeW = getTotalInputPower(state) - getTotalOutputPower(state);
  if (netChargeW <= POWER_FLOW_DEADBAND_W) {
    return candidate('instant', 'Instant net charge', null, 'unavailable', 'Net charge is below the useful estimate threshold.', [
      `net charge: ${Math.round(netChargeW)} W`,
      `deadband: ${POWER_FLOW_DEADBAND_W} W`,
    ], ['Output currently consumes the input or the delta is too small.'], true);
  }

  return candidate(
    'instant',
    'Instant net charge',
    ((targetWh - remainingWh) / netChargeW) * 60,
    'medium',
    'Estimated from current charge deficit and net charge power.',
    [
      `deficit: ${Math.round(targetWh - remainingWh)} Wh`,
      `net charge: ${Math.round(netChargeW)} W`,
      `target: ${getBatteryRangeEndPercent(state)}%`,
    ],
    ['Instantaneous charge power can be noisy if solar or loads change.'],
  );
}

function estimateRemainingWhFromPercent(state: DeviceState, capacityWh: number | null): number | null {
  const percent = getBatteryPercent(state);
  if (capacityWh === null || percent === null) {
    return null;
  }

  return capacityWh * (percent / 100);
}

function trendCandidate(state: DeviceState, history: EstimateHistory, kind: EstimateKind): EstimateCandidate {
  const percent = getBatteryPercent(state);
  const targetPercent = kind === 'runtime' ? getBatteryRangeStartPercent(state) : getBatteryRangeEndPercent(state);
  const direction = kind === 'runtime' ? 'discharging' : 'charging';
  const trend = getBestTrend(history.batteryPercent ?? [], direction);

  if (percent === null) {
    return candidate('recent-trend', 'Recent SOC trend', null, 'unavailable', 'Battery percent is unavailable.', [], [], true);
  }

  if (kind === 'runtime' && percent <= targetPercent) {
    return candidate('recent-trend', 'Recent SOC trend', 0, 'high', 'Battery is already at the configured reserve floor.', [
      `battery percent: ${percent}%`,
      `target: ${targetPercent}%`,
    ]);
  }

  if (kind === 'charge' && percent >= targetPercent) {
    return candidate('recent-trend', 'Recent SOC trend', 0, 'high', 'Battery is already at the configured charge ceiling.', [
      `battery percent: ${percent}%`,
      `target: ${targetPercent}%`,
    ]);
  }

  if (trend === null) {
    return candidate('recent-trend', 'Recent SOC trend', null, 'unavailable', `No stable recent ${direction} SOC trend is available.`, [
      `history points: ${history.batteryPercent?.length ?? 0}`,
    ], ['SOC may be flat, too coarse, or moving in the opposite direction.'], true);
  }

  const rate = Math.abs(trend.percentPerHour);
  const delta = kind === 'runtime' ? percent - targetPercent : targetPercent - percent;
  return candidate(
    'recent-trend',
    'Recent SOC trend',
    (delta / rate) * 60,
    trend.elapsedMs >= 60 * 60 * 1000 ? 'medium' : 'low',
    `Estimated from ${direction} battery-percent movement over ${Math.round(trend.elapsedMs / 60000)} minutes.`,
    [
      `current: ${percent}%`,
      `target: ${targetPercent}%`,
      `trend: ${trend.percentPerHour.toFixed(2)}%/hour`,
    ],
    ['SOC changes in coarse steps, so this is weaker than calibrated history.'],
  );
}

function calibrationCandidate(
  state: DeviceState,
  kind: EstimateKind,
  calibration: { whPerPercent: number; samples: number } | null,
): EstimateCandidate {
  if (calibration === null) {
    return candidate(
      'historical-calibration',
      'Historical calibration',
      null,
      'unavailable',
      'Not enough stable historical windows for calibration.',
      [],
      ['Need SOC movement and power history for the same time window.'],
      true,
    );
  }

  const percent = getBatteryPercent(state);
  if (percent === null) {
    return candidate('historical-calibration', 'Historical calibration', null, 'unavailable', 'Battery percent is unavailable.', [], [], true);
  }

  const target = kind === 'runtime' ? getBatteryRangeStartPercent(state) : getBatteryRangeEndPercent(state);
  const deltaPercent = kind === 'runtime' ? percent - target : target - percent;
  if (deltaPercent <= 0) {
    return candidate('historical-calibration', 'Historical calibration', 0, 'high', 'Battery is already at the estimate target.', [
      `current: ${percent}%`,
      `target: ${target}%`,
    ]);
  }

  const netPower = kind === 'runtime'
    ? getTotalOutputPower(state) - getTotalInputPower(state)
    : getTotalInputPower(state) - getTotalOutputPower(state);
  if (netPower <= POWER_FLOW_DEADBAND_W) {
    return candidate(
      'historical-calibration',
      'Historical calibration',
      null,
      'unavailable',
      'Current net power is too small for calibrated power math.',
      [`net ${kind === 'runtime' ? 'discharge' : 'charge'}: ${Math.round(netPower)} W`],
      ['Waiting for a clearer power direction.'],
      true,
    );
  }

  const neededWh = deltaPercent * calibration.whPerPercent;
  return candidate(
    'historical-calibration',
    'Historical calibration',
    (neededWh / netPower) * 60,
    calibration.samples >= 5 ? 'high' : 'medium',
    `Estimated with historical effective capacity from ${calibration.samples} stable windows.`,
    [
      `effective capacity: ${Math.round(calibration.whPerPercent * 100)} Wh`,
      `Wh per percent: ${calibration.whPerPercent.toFixed(1)}`,
      `net power: ${Math.round(netPower)} W`,
    ],
    calibration.samples < 5 ? ['Calibration is based on limited historical samples.'] : [],
  );
}

function similarWindowCandidate(state: DeviceState, history: EstimateHistory, kind: EstimateKind): EstimateCandidate {
  const percent = getBatteryPercent(state);
  const target = kind === 'runtime' ? getBatteryRangeStartPercent(state) : getBatteryRangeEndPercent(state);
  const direction = kind === 'runtime' ? 'discharging' : 'charging';
  const currentNetPower = kind === 'runtime'
    ? getTotalOutputPower(state) - getTotalInputPower(state)
    : getTotalInputPower(state) - getTotalOutputPower(state);
  const matches = findSimilarWindows(history, direction, percent, currentNetPower, target);

  if (percent === null || currentNetPower <= POWER_FLOW_DEADBAND_W || matches.length === 0) {
    return candidate(
      'historical-match',
      'Historical similar windows',
      null,
      'unavailable',
      'No comparable historical window currently matches this power and SOC posture.',
      [
        `current SOC: ${percent ?? 'unavailable'}%`,
        `current net power: ${Math.round(currentNetPower)} W`,
      ],
      ['This tactic activates once enough similar charge/discharge history exists.'],
      true,
    );
  }

  const median = medianNumber(matches.map((match) => match.minutesToTarget));
  return candidate(
    'historical-match',
    'Historical similar windows',
    median,
    matches.length >= 3 ? 'high' : 'medium',
    `Estimated from ${matches.length} prior similar ${direction} window${matches.length === 1 ? '' : 's'}.`,
    [
      `current SOC: ${percent}%`,
      `target: ${target}%`,
      `median observed time: ${Math.round(median)} min`,
    ],
    matches.length < 3 ? ['Only one or two historical matches were available.'] : [],
  );
}

export function buildBatteryEstimate(
  kind: EstimateKind,
  state: DeviceState,
  history: EstimateHistory = {},
): BatteryEstimateResult {
  const calibration = deriveHistoricalCalibration(history, kind);
  const effectiveCapacityWh = calibration ? calibration.whPerPercent * 100 : null;
  const directField = kind === 'runtime' ? 'battery_range_to_empty' : 'battery_range_to_full';
  const candidates = [
    directCounterCandidate(state, kind, directField),
    similarWindowCandidate(state, history, kind),
    calibrationCandidate(state, kind, calibration),
    kind === 'runtime'
      ? instantRuntimeCandidate(state, effectiveCapacityWh)
      : instantChargeCandidate(state, effectiveCapacityWh),
    trendCandidate(state, history, kind),
  ];

  return chooseCandidate(kind, candidates);
}

export function estimateRuntimeMinutes(state: DeviceState): number | null {
  const result = buildBatteryEstimate('runtime', state);
  return result.minutes;
}

export function estimateChargeTimeMinutes(state: DeviceState): number | null {
  const result = buildBatteryEstimate('charge', state);
  return result.minutes;
}

export function isChargingFromGrid(state: DeviceState): boolean {
  const gridCharge = state['grid_charge_on']?.value;
  const acCharge = state['ac_charging_on']?.value;
  const acInputPower = getFirstField(state, AC_INPUT_FIELDS) ?? 0;
  const gridChargeEnabled = gridCharge === 'True' || gridCharge === 'true' ||
    gridCharge === '1' || gridCharge === 'ON';
  const acChargeEnabled = acCharge === 'True' || acCharge === 'true' ||
    acCharge === '1' || acCharge === 'ON';

  return (gridChargeEnabled || acChargeEnabled) && acInputPower > POWER_FLOW_DEADBAND_W;
}

export function isCharging(state: DeviceState): boolean {
  const totalInputPower = getTotalInputPower(state);
  const totalOutputPower = getTotalOutputPower(state);

  if (isChargingFromGrid(state)) {
    return true;
  }

  return totalInputPower > totalOutputPower + POWER_FLOW_DEADBAND_W;
}

export function isBatteryFull(state: DeviceState): boolean {
  const percent = getBatteryPercent(state);
  return percent !== null && percent >= getBatteryRangeEndPercent(state);
}

export function isBatteryEmpty(state: DeviceState): boolean {
  const percent = getBatteryPercent(state);
  return percent !== null && percent < 1;
}

export function getTotalOutputPower(state: DeviceState): number {
  return (getField(state, 'ac_output_power') ?? 0) + (getField(state, 'dc_output_power') ?? 0);
}

export function getTotalInputPower(state: DeviceState): number {
  const acInput = getFirstField(state, AC_INPUT_FIELDS) ?? 0;
  const solarInput = getFirstField(state, SOLAR_INPUT_FIELDS) ?? getSummedFields(state, SPLIT_SOLAR_FIELDS) ?? 0;

  return acInput + solarInput;
}

export function isSystemIdle(state: DeviceState): boolean {
  return getTotalOutputPower(state) === 0 && getTotalInputPower(state) === 0;
}

export function getBatteryRangeStartPercent(state: DeviceState): number {
  const configuredFloor = getField(state, 'battery_range_start');
  if (configuredFloor !== null && configuredFloor >= 0 && configuredFloor <= 100) {
    return configuredFloor;
  }

  return 0;
}

export function getBatteryRangeEndPercent(state: DeviceState): number {
  const configuredCeiling = getField(state, 'battery_range_end');
  if (configuredCeiling !== null && configuredCeiling >= 0 && configuredCeiling <= 100) {
    return configuredCeiling;
  }

  return 100;
}

function parseHistoryPoints(history: HistoryPoint[]): Array<{ value: number; ts: number }> {
  return history
    .map((point) => ({
      value: Number.parseFloat(point.value),
      ts: Date.parse(point.ts),
    }))
    .filter((point) => Number.isFinite(point.value) && Number.isFinite(point.ts))
    .sort((left, right) => left.ts - right.ts);
}

function buildDistinctHistory(points: Array<{ value: number; ts: number }>): Array<{ value: number; ts: number }> {
  const distinct: Array<{ value: number; ts: number }> = [];

  for (const point of points) {
    const last = distinct.at(-1);
    if (last && last.value === point.value) {
      continue;
    }

    distinct.push(point);
  }

  return distinct;
}

function getBestTrend(history: HistoryPoint[], direction: 'charging' | 'discharging') {
  const distinct = buildDistinctHistory(parseHistoryPoints(history));
  if (distinct.length < 2) {
    return null;
  }

  let best: { percentPerHour: number; elapsedMs: number; delta: number } | null = null;
  const windowsMs = [15, 30, 60, 180, 360].map((minutes) => minutes * 60 * 1000);
  const last = distinct.at(-1);
  if (!last) {
    return null;
  }

  for (const windowMs of windowsMs) {
    const first = distinct.find((point) => point.ts >= last.ts - windowMs) ?? distinct[0];
    const elapsedMs = last.ts - first.ts;
    const delta = last.value - first.value;
    if (elapsedMs < MIN_TREND_SPAN_MS || Math.abs(delta) < MIN_TREND_PERCENT_DELTA) {
      continue;
    }

    if (direction === 'charging' && delta <= 0) {
      continue;
    }

    if (direction === 'discharging' && delta >= 0) {
      continue;
    }

    const percentPerHour = delta / (elapsedMs / 3_600_000);
    const candidateTrend = { percentPerHour, elapsedMs, delta };
    if (best === null || candidateTrend.elapsedMs > best.elapsedMs) {
      best = candidateTrend;
    }
  }

  return best;
}

export function estimateBatteryTrendPercentPerHour(history: HistoryPoint[]): number | null {
  const chargingTrend = getBestTrend(history, 'charging');
  const dischargingTrend = getBestTrend(history, 'discharging');
  if (chargingTrend && dischargingTrend) {
    return chargingTrend.elapsedMs >= dischargingTrend.elapsedMs
      ? chargingTrend.percentPerHour
      : dischargingTrend.percentPerHour;
  }

  return chargingTrend?.percentPerHour ?? dischargingTrend?.percentPerHour ?? null;
}

export function estimateRuntimeMinutesFromHistory(
  state: DeviceState,
  history: HistoryPoint[],
): number | null {
  return trendCandidate(state, { batteryPercent: history }, 'runtime').minutes;
}

export function estimateChargeTimeMinutesFromHistory(
  state: DeviceState,
  history: HistoryPoint[],
): number | null {
  return trendCandidate(state, { batteryPercent: history }, 'charge').minutes;
}

type TimelineRow = {
  ts: number;
  percent: number | null;
  acInput: number | null;
  dcInput: number | null;
  pv1Power: number | null;
  pv2Power: number | null;
  acOutput: number | null;
  dcOutput: number | null;
};

function deriveHistoricalCalibration(history: EstimateHistory, kind: EstimateKind): { whPerPercent: number; samples: number } | null {
  const windows = buildHistoricalWindows(history, kind === 'runtime' ? 'discharging' : 'charging');
  const whPerPercentValues = windows
    .map((window) => window.whPerPercent)
    .filter((value) => Number.isFinite(value) && value > 0 && value < 500);

  if (whPerPercentValues.length === 0) {
    return null;
  }

  return {
    whPerPercent: medianNumber(whPerPercentValues),
    samples: whPerPercentValues.length,
  };
}

function findSimilarWindows(
  history: EstimateHistory,
  direction: 'charging' | 'discharging',
  currentPercent: number | null,
  currentNetPower: number,
  targetPercent: number,
) {
  if (currentPercent === null) {
    return [];
  }

  return buildHistoricalWindows(history, direction)
    .filter((window) => Math.abs(window.startPercent - currentPercent) <= SIMILAR_SOC_TOLERANCE_PERCENT)
    .filter((window) => Math.abs(window.avgNetPower - currentNetPower) <= SIMILAR_POWER_TOLERANCE_W)
    .map((window) => {
      const percentRemaining = direction === 'discharging'
        ? window.startPercent - targetPercent
        : targetPercent - window.startPercent;
      const observedRate = Math.abs(window.deltaPercent) / (window.elapsedMs / 3_600_000);
      return {
        ...window,
        minutesToTarget: observedRate > 0 ? (percentRemaining / observedRate) * 60 : Number.NaN,
      };
    })
    .filter((window) => Number.isFinite(window.minutesToTarget) && window.minutesToTarget >= 0);
}

function buildHistoricalWindows(history: EstimateHistory, direction: 'charging' | 'discharging') {
  const rows = buildTimelineRows(history);
  const windows: Array<{
    startPercent: number;
    endPercent: number;
    deltaPercent: number;
    elapsedMs: number;
    avgNetPower: number;
    whPerPercent: number;
  }> = [];

  for (let index = 0; index < rows.length - 1; index += 1) {
    const start = rows[index];
    for (let endIndex = index + 1; endIndex < rows.length; endIndex += 1) {
      const end = rows[endIndex];
      const elapsedMs = end.ts - start.ts;
      if (elapsedMs < MIN_TREND_SPAN_MS) {
        continue;
      }

      if (elapsedMs > 3 * 60 * 60 * 1000) {
        break;
      }

      if (start.percent === null || end.percent === null) {
        continue;
      }

      const deltaPercent = end.percent - start.percent;
      if (Math.abs(deltaPercent) < MIN_TREND_PERCENT_DELTA) {
        continue;
      }

      if (direction === 'charging' && deltaPercent <= 0) {
        continue;
      }

      if (direction === 'discharging' && deltaPercent >= 0) {
        continue;
      }

      const slice = rows.slice(index, endIndex + 1);
      const avgNetPower = averageNumber(slice.map((row) => {
        const input = (row.acInput ?? 0) + (row.dcInput ?? 0) + (row.pv1Power ?? 0) + (row.pv2Power ?? 0);
        const output = (row.acOutput ?? 0) + (row.dcOutput ?? 0);
        return direction === 'charging' ? input - output : output - input;
      }));

      if (avgNetPower <= POWER_FLOW_DEADBAND_W) {
        continue;
      }

      const elapsedHours = elapsedMs / 3_600_000;
      const observedWh = avgNetPower * elapsedHours;
      windows.push({
        startPercent: start.percent,
        endPercent: end.percent,
        deltaPercent,
        elapsedMs,
        avgNetPower,
        whPerPercent: observedWh / Math.abs(deltaPercent),
      });
    }
  }

  return windows;
}

function buildTimelineRows(history: EstimateHistory): TimelineRow[] {
  const parsed = Object.fromEntries(
    Object.entries(history).map(([key, points]) => [key, parseHistoryPoints(points ?? [])]),
  ) as Partial<Record<EstimateHistoryField, Array<{ value: number; ts: number }>>>;
  const timestamps = [
    ...new Set(Object.values(parsed).flatMap((points) => points?.map((point) => point.ts) ?? [])),
  ].sort((left, right) => left - right).slice(-MAX_ESTIMATE_TIMELINE_ROWS);

  return timestamps.map((ts) => ({
    ts,
    percent: valueAtOrBefore(parsed.batteryPercent, ts),
    acInput: valueAtOrBefore(parsed.acInput, ts),
    dcInput: valueAtOrBefore(parsed.dcInput, ts),
    pv1Power: valueAtOrBefore(parsed.pv1Power, ts),
    pv2Power: valueAtOrBefore(parsed.pv2Power, ts),
    acOutput: valueAtOrBefore(parsed.acOutput, ts),
    dcOutput: valueAtOrBefore(parsed.dcOutput, ts),
  }));
}

function valueAtOrBefore(points: Array<{ value: number; ts: number }> | undefined, ts: number): number | null {
  if (!points || points.length === 0) {
    return null;
  }

  let match: number | null = null;
  for (const point of points) {
    if (point.ts > ts) {
      break;
    }
    match = point.value;
  }

  return match;
}

function medianNumber(values: number[]): number {
  const sorted = values.filter(Number.isFinite).sort((left, right) => left - right);
  if (sorted.length === 0) {
    return Number.NaN;
  }

  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) {
    return sorted[middle];
  }

  return (sorted[middle - 1] + sorted[middle]) / 2;
}

function averageNumber(values: number[]): number {
  const filtered = values.filter(Number.isFinite);
  if (filtered.length === 0) {
    return Number.NaN;
  }

  return filtered.reduce((sum, value) => sum + value, 0) / filtered.length;
}
