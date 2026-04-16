const WINDOW_TITLE_PREFIX = "Bluetti Monitor";
const WINDOW_TITLE_WAITING = `${WINDOW_TITLE_PREFIX} - Waiting for telemetry`;
const POWER_DEADBAND_WATTS = 25;

export interface FieldValue {
  value: string;
  ts: string;
}

export type DeviceState = Record<string, FieldValue>;
export type AllState = Record<string, DeviceState>;

const SOC_FIELDS = ["total_battery_percent", "battery_percent", "charge_level", "soc", "pack_soc"] as const;
const MODE_FIELDS = [
  "charge_state",
  "charging_mode",
  "system_mode",
  "work_mode",
  "load_mode",
  "output_mode",
] as const;

export function buildWindowTitle(allState: AllState): string {
  const deviceState = getPrimaryDeviceState(allState);

  if (!deviceState) {
    return WINDOW_TITLE_WAITING;
  }

  const mode = getPowerMode(deviceState);
  const soc = getBatterySoc(deviceState);

  if (soc === null) {
    return `${WINDOW_TITLE_PREFIX} - ${mode}`;
  }

  return `${WINDOW_TITLE_PREFIX} - ${mode} - ${soc}% SOC`;
}

function getPrimaryDeviceState(allState: AllState): DeviceState | null {
  const [firstDevice] = Object.keys(allState);
  return firstDevice ? allState[firstDevice] ?? null : null;
}

function getBatterySoc(deviceState: DeviceState): number | null {
  for (const field of SOC_FIELDS) {
    const value = parseNumber(deviceState[field]?.value);
    if (value !== null) {
      return Math.round(value);
    }
  }

  return null;
}

function getPowerMode(deviceState: DeviceState): string {
  const explicitMode = getExplicitMode(deviceState);

  if (explicitMode) {
    return explicitMode;
  }

  return inferModeFromPower(deviceState);
}

function getExplicitMode(deviceState: DeviceState): string | null {
  for (const field of MODE_FIELDS) {
    const raw = deviceState[field]?.value?.trim();
    if (!raw || isBooleanLike(raw)) {
      continue;
    }

    const normalized = raw.toLowerCase();

    if (normalized.includes("discharg")) {
      return "Discharging";
    }

    if (normalized.includes("charg")) {
      return "Charging";
    }

    if (
      normalized.includes("idle")
      || normalized.includes("standby")
      || normalized.includes("sleep")
      || normalized.includes("rest")
    ) {
      return "Idle";
    }

    if (
      normalized.includes("pass")
      || normalized.includes("bypass")
      || normalized.includes("ups")
      || normalized.includes("line")
    ) {
      return "Pass-through";
    }
  }

  return null;
}

function inferModeFromPower(deviceState: DeviceState): string {
  const acInput = getFirstNumericValue(deviceState, ["ac_input_power", "grid_charge_power"]) ?? 0;
  const dcInput = getFirstNumericValue(deviceState, ["dc_input_power", "pv_input_power", "solar_power"])
    ?? getSummedNumericValue(deviceState, ["pv1_power", "pv2_power", "dc_input_power1"])
    ?? 0;
  const acOutput = getFirstNumericValue(deviceState, ["ac_output_power"]) ?? 0;
  const dcOutput = getFirstNumericValue(deviceState, ["dc_output_power"]) ?? 0;

  const totalInput = acInput + dcInput;
  const totalOutput = acOutput + dcOutput;
  const netPower = totalInput - totalOutput;

  if (totalInput <= POWER_DEADBAND_WATTS && totalOutput <= POWER_DEADBAND_WATTS) {
    return "Idle";
  }

  if (netPower > POWER_DEADBAND_WATTS) {
    return "Charging";
  }

  if (netPower < -POWER_DEADBAND_WATTS) {
    return "Discharging";
  }

  if (totalInput > POWER_DEADBAND_WATTS && totalOutput > POWER_DEADBAND_WATTS) {
    return "Pass-through";
  }

  if (totalInput > POWER_DEADBAND_WATTS) {
    return "Charging";
  }

  if (totalOutput > POWER_DEADBAND_WATTS) {
    return "Discharging";
  }

  return "Idle";
}

function getFirstNumericValue(deviceState: DeviceState, fields: readonly string[]): number | null {
  for (const field of fields) {
    const value = parseNumber(deviceState[field]?.value);
    if (value !== null) {
      return value;
    }
  }

  return null;
}

function getSummedNumericValue(deviceState: DeviceState, fields: readonly string[]): number | null {
  let foundValue = false;
  let sum = 0;

  for (const field of fields) {
    const value = parseNumber(deviceState[field]?.value);
    if (value === null) {
      continue;
    }

    foundValue = true;
    sum += value;
  }

  return foundValue ? sum : null;
}

function parseNumber(value: string | undefined): number | null {
  if (value === undefined) {
    return null;
  }

  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function isBooleanLike(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return normalized === "true" || normalized === "false" || normalized === "1" || normalized === "0";
}
