---
status: resolved
trigger: "npm run dev:all repeatedly fails real AC500 discovery because the Windows BLE helper exits with code 2147516570."
created: 2026-07-19
updated: 2026-07-19
---

# Windows BLE helper host crash

## Symptoms

- Expected: `npm run dev:all` discovers the real AC500 and keeps its bridge connected.
- Actual: API, dashboards, and Electrobun start, but every discovery attempt fails immediately and retries every five seconds.
- Error: `Windows BLE helper exited with code 2147516570` (`0x8000809A`).
- Reproduction: start `npm run dev:all` with the current helper artifact, or execute `artifacts/helper/win-x64/BluettiMqtt.BluetoothHelper.exe` directly.

## Current Focus

- root_cause: an interrupted/retriggered in-place `dotnet publish` left an incomplete single-file helper, while mtime-only preflight accepted it and the Windows watcher could schedule redundant publishes from generated or non-stale file events.
- fix: require an explicit helper `ready` protocol event before use and after publish; ignore helper `bin`/`obj` paths; discard watcher events unless their corresponding artifact is actually stale.
- verification: supervisor tests pass and a clean live session discovered and polled the physical AC500 at `24:4C:AB:2C:24:8E` without rebuilding the healthy helper.

## Evidence

- Direct execution of the current 53.8 MB artifact reproduces the failure: `.NET` reports that `BluettiMqtt.BluetoothHelper.dll` does not exist beside the executable.
- Exit code `2147516570` converts to `0x8000809A`; PowerShell exposes the signed process code as `-2147450726`.
- The artifact directory contains only `BluettiMqtt.BluetoothHelper.exe`, which should be valid because this path is documented and built as self-contained single-file output.
- Artifact freshness checks use only file modification times and do not execute or structurally validate the helper.
- Recursive staleness scanning skips `bin`, `obj`, and `node_modules`, but the live `fs.watch` callback does not apply those exclusions before `classifyBridgeChange()`.
- A fresh isolated self-contained publish produced an 85,851,164-byte executable that emitted the expected `ready` event; the broken artifact was only 53,756,032 bytes.
- Live preflight detected the broken artifact, rebuilt it, discovered `AC5002237000003358`, and published real telemetry through MQTT.
- The first live validation also exposed a delayed non-stale `Program.cs` watcher event that caused a redundant second publish. Requiring actual artifact staleness for watcher-triggered rebuilds closes that path.

## Resolution

- Added `probeHelperArtifact()` to execute the helper with a five-second timeout and require its explicit JSON `ready` event.
- Preflight now repairs an unhealthy helper even when its modification time appears fresh, and rejects a failed post-build probe.
- Helper watcher classification ignores generated `bin` and `obj` trees. Watcher callbacks also compare input and artifact mtimes so access-only/delayed events do not stop the bridge or republish the helper.
- Probe failures are normalized to one line so the unified JSON log remains one record per diagnostic.
- `npm run dev:supervisor:test` passes all nine tests, including generated-path classification, healthy/malformed/crashed helper probes, and stale-event filtering.
- Final live session `2026-07-20T02:11:24.332Z-31672` connected to the real AC500 and exposed fresh telemetry through `/status`; UI/API/analytics/MQTT remained online.
