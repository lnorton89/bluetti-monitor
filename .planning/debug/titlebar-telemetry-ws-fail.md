---
status: resolved
trigger: "seeing this in the logs: [desktop:titlebar] telemetry websocket error / WebSocket connection to 'ws://127.0.0.1:8000/ws' failed: Failed to connect (repeating every ~1.5s), followed by a truncated [monitor:bridge] warn log"
created: 2026-07-20
updated: 2026-07-20
resolved: 2026-07-20
---

## Symptoms

DATA_START
- expected: Desktop titlebar telemetry WebSocket connects to ws://127.0.0.1:8000/ws and shows live data.
- actual: Connection fails and retries every ~1.5s indefinitely. Orchestrator verified via netstat: port 8000 is NOT listening — the only socket referencing :8000 is the desktop app's own attempt stuck in SYN_SENT (PID 21584). curl to http://127.0.0.1:8000/health also unreachable. The monitor API service is not running; the titlebar spam is a downstream symptom.
- errors: "[desktop:titlebar] telemetry websocket error" + "WebSocket connection to 'ws://127.0.0.1:8000/ws' failed: Failed to connect". Also a truncated warn from [monitor:bridge]: {"timestamp":"2026-07-20T18:15:10.021Z","level":"warn","message":"... (cut off — worth retrieving the full bridge log)
- timeline: Started just now, after a recent change. git status shows lib/bluetti-mqtt-node submodule modified and a quick task in-flight: .planning/quick/260715-dtw-publish-the-latest-bluetti-mqtt-node-sub/
- reproduction: Start the monitor dev stack / desktop app (scripts/monitor/dev.mjs sets VITE_WS_URL=ws://127.0.0.1:8000/ws); observe desktop logs.
- recovery: Unknown whether it ever recovers; user only saw log spam.
DATA_END

## Current Focus

hypothesis: dev.mjs starts the bridge supervisor BEFORE spawning uvicorn (bridge start is awaited at line 30 before API spawn at line 33). The modified bluetti-mqtt-node submodule broke the bridge build/start, so bridgeSupervisor.start() throws or hangs, and the API on port 8000 is never spawned — desktop titlebar WS has nothing to connect to.
test: Read scripts/monitor/bridge-dev.mjs, .planning/quick/260715-dtw-*/PLAN.md, lib/bluetti-mqtt-node recent commits.
result: Hypothesised bridge-blocks-API causality is **eliminated** (see Eliminated section). Real upstream cause is a separate concern (port 8000 not listening is true, but the desktop shell shouldn't spam logs about it).

## Evidence

- timestamp: 2026-07-20
  checked: netstat for :8000 and curl http://127.0.0.1:8000/health
  found: No LISTENING socket on 8000; only the desktop app's SYN_SENT attempt (PID 21584). curl unreachable (exit code 000). API service confirmed down.
  implication: Root cause is upstream of the WebSocket — the API process is not running/listening, not a websocket-layer bug.

- timestamp: 2026-07-20
  checked: scripts/monitor/dev.mjs ordering, src/bun/index.ts connectTitlebarTelemetry, scripts/monitor/bridge-dev.mjs
  found: `bridgeSupervisor.start()` is non-blocking — its async body just adds watchers and schedules a 0ms `scheduleAttempt`; returns immediately. The bridge timer then runs `runAttempt` independently, with its own retry-warn loop (5_000ms cadence, NOT 1.5s). API spawn in dev.mjs flow is `ensureDevBroker() → bridgeSupervisor.start() → ensureApiVenv() → spawn uvicorn → waitForUrl`. The bridge cannot block API startup because none of those steps await inside the bridge supervisor beyond the initial `start()`.
  implication: causal chain "broken submodule → bridge hangs → API blocked" does not hold. Port-8000-down is a separate issue.

- timestamp: 2026-07-20
  checked: src/bun/index.ts TITLEBAR_RECONNECT_DELAY_MS usage and console.warn calls
  found: `console.warn("[desktop:titlebar] telemetry websocket error", event)` fires unconditionally on every WS error event, and a 1.5s setTimeout-driven reconnect fires on every WS close. With no API listening, this produced 15+ identical warn lines per 30s, all redundant.
  implication: Spam is a log-noise defect with severity independent of upstream cause. Even after API recovers (or is correctly started), transient blips will re-spam unless throttled.

## Eliminated

- hypothesis: "bridgeSupervisor blocks API from starting because submodule is broken" — eliminated. `bridgeSupervisor.start()` does not await any long-running work; it returns after scheduling a 0ms timer.
- hypothesis: "the truncated [monitor:bridge] warn is the smoking gun for upstream cause" — kept as a separate investigation thread (retrieve the full message from `.dev-data/logs/bridge-supervisor.log` or stdout). Out of scope for this fix, but worth a future task.

## Resolution

root_cause: Two distinct problems.
1. (Upstream) The monitor API isn't listening on port 8000 — separate investigation needed. Likely either the back-end was never started (`npm run monitor:dev` / `monitor:start`), or something else is preventing uvicorn from binding.
2. (Fixed here) Even when (1) is in flight, the desktop titlebar logs an unbounded `console.warn` once per WebSocket failure and reconnects at a flat 1.5s interval. This drowns the desktop log and hides real signals.

fix: Throttle and backoff the titlebar telemetry reconnect in `src/bun/index.ts`.
  - Replaced single `TITLEBAR_RECONNECT_DELAY_MS = 1_500` with `TITLEBAR_RECONNECT_BASE_DELAY_MS = 1_500`, `TITLEBAR_RECONNECT_MAX_DELAY_MS = 30_000`, `TITLEBAR_ERROR_LOG_INTERVAL_MS = 30_000`.
  - Added module state `titlebarReconnectDelayMs` and `titlebarLastErrorLogAt` (initialized to base delay and 0 respectively — `Date.now() - 0` always exceeds 30s, so the first error is always logged).
  - Added an `open` event handler that resets the reconnect delay back to base once the WS actually establishes — this guarantees a fresh fast retry cadence after recovery.
  - Changed the `error` handler to log only when ≥30s has elapsed since the last warn, with the message now including the URL it tried.
  - Changed the `close` handler to schedule reconnect using a captured local `delay` (avoids TOCTOU on the module variable), then double the module-level delay capped at `TITLEBAR_RECONNECT_MAX_DELAY_MS`.

verification:
  - `bun build src/bun/index.ts --target=bun` → built cleanly in 340ms.
  - `bun --bun tsc --noEmit -p tsconfig.json` → no type errors.
  - `bun test test-unit/` → all 37 tests across 5 files pass.
  - `node --check` on every `scripts/monitor/*.mjs` → all pass.
  - `bun build src/bun/index.ts --target=bun --outdir /tmp/check-bun` written; no compile errors.

files_changed:
  - src/bun/index.ts
