---
status: investigating
trigger: "lets work on the logs and try to figure out how to not have as many errors. you'll need to make it so theres a log file that gets truncated automatically so it doesnt get huge and then look at that and move forward with a plan"
created: 2026-04-22
updated: 2026-04-22
---

# Symptoms

- Expected behavior: The desktop stack should produce a durable log file, keep it bounded automatically, and make recurring errors easy to identify.
- Actual behavior: Logging is mostly console-only today, which makes it harder to inspect recurring issues over time and easier for noisy errors to go unnoticed.
- Error messages: Not yet enumerated from a bounded log capture.
- Timeline: Active investigation started on 2026-04-22.
- Reproduction: Start the desktop/dev stack and inspect the new bounded log output.

# Current Focus

- hypothesis: Capturing desktop, BLE bridge, API, and dashboard output into one bounded log file will expose the highest-value recurring errors quickly.
- test: Add automatic log truncation in the desktop shell, then run the stack and inspect the resulting log.
- expecting: A small set of repeated warnings or startup/runtime failures will stand out once all output lands in one file.
- next_action: Implement bounded log capture and collect a fresh run.

# Evidence

- 2026-04-22T20:12Z: Added `.dev-data/logs/desktop.log` capture in `src/bun/index.ts` so desktop, API, dashboard, and in-process BLE bridge output land in one file.
- 2026-04-22T20:15Z: First fresh run showed repeated `Device reported busy during pack polling; backing off` warnings plus an `Unhandled rejection in worker: Error: MODBUS exception for function 3: code 5`.
- 2026-04-22T20:17Z: Adjusted desktop file severity parsing so structured JSON `warn` lines stay `WARN` even when emitted on `stderr`.
- 2026-04-22T20:17Z: Rate-limited repeated busy warnings in `lib/bluetti-mqtt-node/src/app/device-handler.ts` to once per minute with a `suppressedBusyWarnings` counter.
- 2026-04-22T20:17Z: Attached an immediate catch handler in `lib/bluetti-mqtt-node/src/bluetooth/device-session.ts` so expected busy-response rejections do not appear as top-level unhandled worker errors.
- 2026-04-22T20:18Z: Forced `desktop.log` to ~2.1 MB, relaunched the app, and confirmed it auto-truncated to ~265 KB with a truncation marker.

# Findings

- The most alarming log line was not a hard failure in the polling pipeline; it was an expected `DeviceBusyError` escaping briefly as an unhandled rejection before the caller awaited the response promise.
- The AC500 still legitimately reports occasional busy responses during pack polling, so some warning-level noise remains appropriate.
- The remaining log noise is now substantially smaller and more trustworthy because severity labels reflect the payload’s actual level and repeated busy events are throttled.

# Next Plan

- Observe a longer runtime window from `desktop.log` to confirm busy warnings stay infrequent and include useful suppression counts.
- If pack-poll busy events are still too common, tune pack selection cadence or skip pack polling for a backoff window after a busy response instead of retrying on the next full cycle.
- Separate startup lifecycle lines from telemetry lines, either with per-component log files or a `component` field in the structured log payload, so future investigations can filter faster.
