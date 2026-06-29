---
status: resolved
trigger: "the dashboard quit responding and i saw this in the error log Error: command_failed: Cannot access a disposed object. at handleLine (C:\\Users\\Lawrence\\Documents\\Dev\\bluetti\\bluetti-monitor\\build\\dev-win-x64\\BluettiMonitor-dev\\Resources\\app\\bun\\index.js:253383:31) at <anonymous> (C:\\Users\\Lawrence\\Documents\\Dev\\bluetti\\bluetti-monitor\\build\\dev-win-x64\\BluettiMonitor-dev\\Resources\\app\\bun\\index.js:253240:24) at emit (node:events:95:22) at [_onLine] (node:readline:584:16) at [_normalWrite] (node:readline:674:22) at onData (node:readline:462:38) at emit (node:events:95:22) at addChunk (internal:streams/readable:264:47) at readableAddChunkPushByteMode (internal:streams/readable:242:18) at handleNumberResult (internal:streams/native-readable:79:18) [desktop:api:stdout] INFO: 127.0.0.1:52607 - \"GET /history/AC500-223700000"
created: 2026-05-08
updated: 2026-06-29
---

# Symptoms

- Expected behavior: The desktop dashboard should continue responding while API stdout/stderr lines are processed.
- Actual behavior: The dashboard quit responding after a desktop-side `command_failed: Cannot access a disposed object` error.
- Error messages: `Error: command_failed: Cannot access a disposed object.` thrown from packaged `app/bun/index.js` inside `handleLine`, while processing an API stdout line for `GET /history/AC500-223700000...`.
- Timeline: Reported on 2026-05-08. Prior working state not yet established.
- Reproduction: Run the packaged/dev desktop app until the dashboard requests history and API output is streamed through the desktop log handler.

# Current Focus

- hypothesis: Desktop log-line handling writes to an Electrobun or process object after that object has been disposed, and the exception is not isolated from the readline stream.
- test: Map packaged `index.js` line numbers back to `src/bun/index.ts`, inspect `handleLine`, and identify which disposed object can be touched during API stdout handling.
- expecting: A logging or UI-message call in the child process stdout handler will need a disposal guard and/or try/catch so backend output cannot freeze the dashboard.
- next_action: resolved; monitor the bridge for any future disposed-object errors during active polling rather than cleanup

# Evidence

- 2026-05-08T19:32Z: Packaged stack line `index.js:253383` maps to bundled `WindowsHelperClient.handleLine`, not `src/bun/index.ts` API stdout handling.
- 2026-05-08T19:33Z: The failing line rejects a pending BLE helper request with plain `Error("command_failed: Cannot access a disposed object.")`.
- 2026-05-08T19:34Z: `DeviceHandler.executeReadCommand` already treats `BadConnectionError` as an expected connection-level failure, but the helper client was not mapping this Windows BLE disposal response to that type.
- 2026-05-08T19:35Z: Added a regression test that asserts helper `command_failed: Cannot access a disposed object.` responses become `BadConnectionError`.
- 2026-05-08T19:35Z: `npm --prefix lib/bluetti-mqtt-node test` passed.
- 2026-06-17T16:29Z: The disposed-object helper response was already mapped to `BadConnectionError` in source and dist, but `DeviceHandler.run()` still let startup `connectAll()` failures escape before entering the polling loop.
- 2026-06-17T16:29Z: Added continuous-mode startup recovery so `BadConnectionError` during initial BLE connect is logged as a warning and retried; `runOnce` still propagates the error.
- 2026-06-17T16:29Z: `npm --prefix lib/bluetti-mqtt-node test` passed.
- 2026-06-29T00:00Z: Recurrence stack points at `lib/bluetti-mqtt-node/dist/bluetooth/helper-client.js`, and current source/dist already map disposed-object helper responses to `BadConnectionError`.
- 2026-06-29T00:00Z: `BluettiMqttServer.run()` awaits `manager.disconnectAll()` in `finally`; `MultiDeviceManager.disconnectAll()` currently lets disconnect errors escape, so a Windows disposed-object response during cleanup can make `bluetti-mqtt-node` exit non-zero.
- 2026-06-29T17:25Z: Added server cleanup handling so disconnect failures are logged as warnings after polling stops, while MQTT cleanup still runs.
- 2026-06-29T17:25Z: Added regression coverage for shutdown-time `BadConnectionError("command_failed: Cannot access a disposed object.")`.
- 2026-06-29T17:25Z: `npm --prefix lib/bluetti-mqtt-node test` passed.

# Findings

- Root cause: Windows BLE can return `command_failed: Cannot access a disposed object.` for a helper request when the underlying GATT object has been disposed. The Node helper client flattened that into a generic `Error`, so the polling layer treated it as an unexpected service failure instead of an expected bad-connection condition.
- Fix: Map that specific helper error to `BadConnectionError` in `lib/bluetti-mqtt-node/src/bluetooth/helper-client.ts`.
- Verification: `bluetti-mqtt-node` build and smoke test suite pass, including the new helper-client regression.
- Recurrence root cause: the recovered error mapping covered polling commands but not initial `connectAll()` in continuous bridge mode, so the bridge could still terminate if Windows returned the disposed-object failure during startup.
- Recurrence fix: retry startup `BadConnectionError` in continuous `DeviceHandler.run()` with a warning and stop-aware delay, while preserving `--once` failure semantics.
- 2026-06-29 recurrence root cause: a disposed-object helper response can also happen during shutdown/cleanup when `BluettiMqttServer.run()` calls `manager.disconnectAll()` in `finally`; that cleanup failure was allowed to reject `server.run()`, so the CLI printed the helper stack and exited non-zero.
- 2026-06-29 recurrence fix: `MultiDeviceManager.disconnectAll()` now attempts every session cleanup and clears sessions in `finally`, and `BluettiMqttServer.run()` logs cleanup failures as warnings instead of letting them terminate the bridge after polling has stopped.
- 2026-06-29 verification: package test suite passes, including a new server smoke test for shutdown-time disposed-object cleanup.

# Next Plan

- Rebuild/restart the desktop app so the packaged `Resources/app/bun/index.js` picks up the updated submodule code.
- If the dashboard still stops responding after this fix, inspect whether repeated `BadConnectionError` events leave the device session in `Disconnecting` without reconnecting.
