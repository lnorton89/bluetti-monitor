---
status: resolved
trigger: "[bluetti-mqtt-node] Service exited unexpectedly\r\nError: command_failed: Failed to enumerate GATT services: Unreachable.\r\nat createHelperError (C:\\Users\\Lawrence\\Documents\\Dev\\bluetti\\bluetti-monitor\\build\\dev-win-x64\\BluettiMonitor-dev\\Resources\\app\\bun\\index.js:253392:19)\r\nat handleLine (C:\\Users\\Lawrence\\Documents\\Dev\\bluetti\\bluetti-monitor\\build\\dev-win-x64\\BluettiMonitor-dev\\Resources\\app\\bun\\index.js:253383:39)\r\nat <anonymous> (C:\\Users\\Lawrence\\Documents\\Dev\\bluetti\\bluetti-monitor\\build\\dev-win-x64\\BluettiMonitor-dev\\Resources\\app\\bun\\index.js:253240:24)\r\nat emit (node:events:95:22)\r\nat [_onLine] (node:readline:584:16)\r\nat [_normalWrite] (node:readline:674:22)\r\nat onData (node:readline:462:38)\r\nat emit (node:events:95:22)\r\nat addChunk (internal:streams/readable:264:47)\r\nat readableAddChunkPushByteMode (internal:streams/readable:242:18)"
created: 2026-05-10
updated: 2026-05-10
---

# Symptoms

- Expected behavior: The `bluetti-mqtt-node` BLE/MQTT service should tolerate transient Windows BLE GATT enumeration failures, keep the desktop app alive, and reconnect or retry without exiting unexpectedly.
- Actual behavior: The service exits unexpectedly after a helper response reports `command_failed: Failed to enumerate GATT services: Unreachable.`
- Error messages: `Error: command_failed: Failed to enumerate GATT services: Unreachable.` from packaged `Resources/app/bun/index.js` in the BLE helper line handler.
- Timeline: Reported on 2026-05-10. A related `Cannot access a disposed object` helper failure was previously fixed on 2026-05-08.
- Reproduction: Run the packaged/dev Windows desktop app with `bluetti-mqtt-node` BLE polling enabled until the Windows BLE helper attempts to enumerate GATT services while the device or adapter is unreachable.

# Current Focus

- hypothesis: The Windows helper client maps `Failed to enumerate GATT services: Unreachable` to a generic error, so the device polling/service layer treats a transient BLE connectivity failure as fatal instead of a recoverable bad-connection condition.
- test: Inspect `lib/bluetti-mqtt-node` helper error mapping and service/device handler boundaries, then add or verify handling for the GATT `Unreachable` enumeration failure.
- expecting: The helper error should be normalized into an existing recoverable connection error path, likely alongside the previous disposed-object handling.
- next_action: gather initial evidence

# Evidence

- timestamp: 2026-05-10T20:14:00Z
  source: code inspection
  finding: `lib/bluetti-mqtt-node/src/bluetooth/helper-client.ts` only mapped `command_failed` messages containing `cannot access a disposed object` to `BadConnectionError`; `Failed to enumerate GATT services: Unreachable.` returned a plain `Error`.
- timestamp: 2026-05-10T20:14:00Z
  source: code inspection
  finding: `lib/bluetti-mqtt-node/src/app/device-handler.ts` treats `BadConnectionError` as an expected polling error and continues, but rethrows plain `Error` values, causing the service to exit.
- timestamp: 2026-05-10T20:14:00Z
  source: verification
  finding: `npm test -- helper-client` in `lib/bluetti-mqtt-node` rebuilt TypeScript and passed the smoke test suite, including the new GATT unreachable regression test.

# Findings

- Root cause: Windows helper GATT service enumeration failures with `Unreachable` were not normalized into the existing recoverable BLE connection error type.
- Fix applied: Broadened helper-client error classification from disposed-object-only to recoverable Bluetooth connection errors, including `Failed to enumerate GATT services: Unreachable.`
- Regression coverage: Added `testGattUnreachableErrorMapping()` to assert the exact helper error becomes `BadConnectionError`.
- Specialist review: none; `typescript-expert` is not available in this session, so no mapped specialist skill could be invoked.

# Next Plan

- Monitor the packaged/dev Windows desktop app to confirm the next `Failed to enumerate GATT services: Unreachable.` event is logged as an expected polling error and no longer exits `bluetti-mqtt-node`.

# Resolution

root_cause: Windows helper GATT `Unreachable` enumeration failures were emitted as generic helper errors instead of `BadConnectionError`, bypassing the existing transient BLE recovery path.
fix: `lib/bluetti-mqtt-node/src/bluetooth/helper-client.ts` now maps `command_failed: Failed to enumerate GATT services: Unreachable.` to `BadConnectionError`; `test/helper-client.test.mjs` covers the regression.
