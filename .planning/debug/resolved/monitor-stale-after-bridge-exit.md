---
status: resolved
trigger: "current monitor instance is showing old data after the BLE bridge failed, with no UI feedback and endless GET requests for input-max"
created: 2026-07-08
updated: 2026-07-08
---

## Symptoms

- expected: The monitor should keep receiving current AC500 telemetry, or clearly report that telemetry has stopped.
- actual: The bridge exits while the API and dashboard remain running; the dashboard shows old values and continues to label the stream LIVE and recently updated.
- errors: BLE write failed with `command_failed: ... Unreachable`; cleanup then reported `Cannot access a disposed object`; bridge exited with code 1.
- timeline: Failure captured at 2026-07-08T20:45:55Z after earlier busy/backoff warnings.
- reproduction: Run the current monitor instance until the BLE helper/connection becomes unreachable.
- secondary: The dashboard repeatedly requests `/stats/AC500-2237000003358/input-max` after telemetry has stopped.

## Current Focus

- hypothesis: Confirmed: the bridge child exited without being restarted, the API WebSocket remained connected, and dashboard freshness never reevaluated as wall-clock time passed.
- test: Build the dashboard, syntax-check both monitor launchers, and inspect the final diff.
- expecting: Dashboard compiles with timestamp hydration and clock-driven stale state; launchers parse with bridge restart supervision.
- next_action: restart the currently running monitor stack so the updated supervisor launches a new bridge

## Evidence

- timestamp: 2026-07-08T20:45:55.426Z
  observation: Bluetooth cleanup failed because an object was already disposed.
- timestamp: 2026-07-08T20:45:55.429Z
  observation: MQTT disconnected and device polling stopped.
- timestamp: 2026-07-08T20:45:55Z
  observation: BLE write to characteristic ff02 failed as unreachable; bridge exited with code 1.
- timestamp: 2026-07-08T20:45:55Z
  observation: API remained alive and continued returning HTTP 200 for repeated input-max requests.
- timestamp: 2026-07-08
  observation: The running process tree contained API, dashboard, and desktop processes but no bluetti-mqtt-node bridge process.
- timestamp: 2026-07-08
  observation: Dashboard snapshots replaced state without setting lastUpdate, and freshness used Date.now() without any timer-driven rerender.
- timestamp: 2026-07-08
  observation: The input-max query intentionally refetched every 60 seconds during the active solar window without considering telemetry freshness.

## Eliminated

## Resolution

- root_cause: A fatal Windows BLE write error escaped the bridge and terminated it. The monitor supervisor merely logged the child exit while leaving API/dashboard alive. The dashboard treated its API WebSocket as the live signal and had no clock tick to transition old telemetry to stale.
- fix: Restart bridge children after unexpected exits; initialize lastUpdate from snapshot field timestamps; reevaluate freshness every second; disable overview history queries once telemetry is stale.
- verification: Dashboard production build passed; both monitor scripts passed node --check; git diff --check passed. Dashboard lint remains unavailable because the repository has ESLint 9 without an eslint.config file.
- files_changed: dashboard/src/store/ws.ts, dashboard/src/hooks/useTelemetryState.ts, dashboard/src/pages/Overview.tsx, scripts/monitor/dev.mjs, scripts/monitor/start.mjs
