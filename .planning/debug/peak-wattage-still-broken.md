---
status: resolved
trigger: "the peak wattage is still broken. /gsd-debug fix it"
created: 2026-06-15T13:41:28-07:00
updated: 2026-06-15T13:50:00-07:00
---

# Debug Session: peak-wattage-still-broken

## Symptoms

- Expected behavior: Peak wattage should reflect the highest relevant input wattage reported by AC500 telemetry.
- Actual behavior: Peak wattage is still broken.
- Error messages: None reported.
- Timeline: Still broken as of 2026-06-15.
- Reproduction: View peak wattage in the dashboard/API while telemetry is available.

## Current Focus

- hypothesis: Peak input logic was using an incomplete or mismatched set of telemetry fields.
- test: Inspect API/dashboard peak calculation and telemetry field mappings, then add regression coverage.
- expecting: Peak calculation includes the fields the live UI uses for current input wattage.
- next_action: resolved
- reasoning_checkpoint:
- tdd_checkpoint:

## Evidence

- timestamp: 2026-06-15T13:41:28-07:00
  observation: API `/stats/{device}/input-max` only read `dc_input_power` and `ac_input_power`.
- timestamp: 2026-06-15T13:41:28-07:00
  observation: Overview live/highest fallback only added `dc_input_power` and `ac_input_power`.
- timestamp: 2026-06-15T13:41:28-07:00
  observation: AC500 telemetry exposes split solar fields `dc_input_1_power` and `dc_input_2_power`.
- timestamp: 2026-06-15T13:41:28-07:00
  observation: Existing notification helper already resolved aliases like split PV and `grid_charge_power`.

## Eliminated

## Resolution

- root_cause: Peak/live input wattage calculations in Overview and the API used only aggregate DC/AC fields, so AC500 split solar telemetry could be omitted.
- fix: Added a shared dashboard power helper for input/output watts, reused it in notifications, Overview, and mock peak calculation, and mirrored the same alias groups in the API input-max endpoint.
- verification: `bun test dashboard\test-unit\notifications.test.ts`; `npm --prefix dashboard run build`; `python -m py_compile api\main.py`
- files_changed: api/main.py, dashboard/src/lib/power.ts, dashboard/src/lib/api.ts, dashboard/src/lib/notifications.ts, dashboard/src/pages/Overview.tsx, dashboard/test-unit/notifications.test.ts
