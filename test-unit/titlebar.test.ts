import { describe, expect, test } from "bun:test";
import { buildWindowTitle, type AllState } from "../src/bun/titlebar.ts";

function makeState(fields: Record<string, string>): AllState {
  const ts = "2026-04-14T08:00:00.000Z";
  const entries = Object.entries(fields).map(([field, value]) => [field, { value, ts }] as const);

  return {
    AC5002237000003358: Object.fromEntries(entries),
  };
}

describe("buildWindowTitle", () => {
  test("shows a waiting title before telemetry arrives", () => {
    expect(buildWindowTitle({})).toBe("Bluetti Monitor - Waiting for telemetry");
  });

  test("prefers an explicit device-reported mode when it is meaningful", () => {
    const title = buildWindowTitle(
      makeState({
        charge_state: "Discharging",
        total_battery_percent: "62",
        ac_input_power: "350",
        ac_output_power: "350",
      }),
    );

    expect(title).toBe("Bluetti Monitor - Discharging - 62% SOC");
  });

  test("infers charging when input power is higher than output power", () => {
    const title = buildWindowTitle(
      makeState({
        dc_input_power: "742",
        ac_output_power: "486",
        dc_output_power: "92",
        total_battery_percent: "67",
      }),
    );

    expect(title).toBe("Bluetti Monitor - Charging - 67% SOC");
  });

  test("infers discharging when output power is higher than input power", () => {
    const title = buildWindowTitle(
      makeState({
        ac_input_power: "0",
        dc_input_power: "48",
        ac_output_power: "610",
        dc_output_power: "36",
        total_battery_percent: "54",
      }),
    );

    expect(title).toBe("Bluetti Monitor - Discharging - 54% SOC");
  });

  test("falls back to idle when the system is effectively at rest", () => {
    const title = buildWindowTitle(
      makeState({
        ac_input_power: "0",
        dc_input_power: "8",
        ac_output_power: "4",
        dc_output_power: "5",
        total_battery_percent: "79",
      }),
    );

    expect(title).toBe("Bluetti Monitor - Idle - 79% SOC");
  });
});
