---
status: resolved
trigger: "Live AC500 development stack startup is inconsistent and can take roughly 10-44 seconds before Electrobun reaches the dashboard."
created: 2026-07-19
updated: 2026-07-19
---

# Slow Electrobun startup

## Symptoms

- Expected: `npm run dev:all` opens the native shell quickly, then moves from the loading view to the local dashboard as soon as Vite is accepting requests.
- Actual: observed end-to-end dashboard readiness varied from about 10 seconds to about 44 seconds across live runs.
- Electrobun's host server and native loading view are ready within a few seconds, so the visible delay occurs later in the monitor/dashboard startup path.
- No fatal Electrobun error accompanies the delay. The real AC500 bridge still starts and publishes telemetry once the dashboard is ready.

## Reproduction

1. Run `npm run dev:all`.
2. Keep the real AC500 available.
3. Compare timestamps in `.dev-data/logs/dev-all.log` for session start, Electrobun host readiness, dashboard readiness, and dashboard navigation.

## Current Focus

- Remove the historical database scan from the API readiness gate and make device/field metadata lookups use index seeks.
- Start the resilient real-AC500 bridge supervisor as soon as the broker is ready rather than after the UI.
- Keep production PWA behavior while preventing a development service worker from introducing stale desktop assets.

## Evidence

- One live run reached the dashboard in about 10 seconds.
- A later run started at `01:31:40.826Z`, brought up the Electrobun host at `01:31:44.219Z`, but did not report dashboard readiness until about `01:32:24.461Z`.
- The desktop called `loadURL` immediately after dashboard readiness, around `01:32:24.525Z`.
- Vite PWA generation output appeared after readiness in the slower run.
- `dashboard/vite.config.ts` explicitly enables PWA service-worker support during development.
- `scripts/monitor/dev.mjs` starts the API, waits for it, then starts and waits for Vite before starting the AC500 bridge supervisor.
- The slow run's `/devices` readiness request completed about 39.6 seconds after FastAPI reported application startup complete; only then was Vite spawned.
- The 2.68 GB development database makes `SELECT DISTINCT device FROM readings` scan the entire covering index. A direct warm-cache measurement took 2.121 seconds, while an equivalent recursive `MIN(...)` index-seek query completed below the timer's millisecond precision.
- `/fields/{device}` uses the same full-distinct-scan pattern against the same composite index.
- A successful desktop launch spawned four PowerShell window-icon helpers; every invocation found and updated the same single window. The native icon setter already has its own scheduled retries, so only one Win32 helper pass is necessary.

## Eliminated

- Electrobun host initialization: it completes within a few seconds even in the slow run.
- Real AC500 discovery as the cause of UI delay: bridge discovery begins only after dashboard readiness in the current orchestration.
- CEF startup: Windows is configured to use the native WebView2 renderer (`bundleCEF: false`, `defaultRenderer: "native"`).
- Vite startup time: once spawned in the slow run, Vite was ready in 404 ms. PWA work happened later, so it was not the 40-second root cause.

## Root Cause

- `scripts/monitor/dev.mjs` uses the database-backed `/devices` route as an API health check and does not spawn Vite until that request completes.
- `/devices` performs `SELECT DISTINCT` across a multi-gigabyte telemetry index, turning a health check into an unbounded historical scan. Cold-cache behavior accounts for the observed long stall.
- The same sequential orchestration also postpones starting the real AC500 bridge until after both API and dashboard readiness.
- `setWindowIcon()` coupled every native retry to a new PowerShell helper process, creating redundant work and repeated log lines during Electrobun startup.

## Resolution

- Changed the monitor readiness probe from `/devices` to the in-memory `/status` route, so starting Vite no longer waits on historical telemetry.
- Replaced full-index `DISTINCT` device/field queries with recursive `MIN(...)` index seeks and added API coverage for uniqueness, ordering, device scoping, and empty results.
- Started the resilient bridge supervisor immediately after the MQTT broker becomes available. Real AC500 discovery now overlaps API/dashboard startup and still retries without taking down the stack.
- Disabled PWA service-worker generation in Vite development while retaining production PWA output; development startup also unregisters any prior service-worker registrations for the dashboard origin.
- Decoupled native window-icon retries from the PowerShell fallback, reducing four successful helper launches to one while retaining the native timing retries.

## Validation

- Live session `2026-07-20T01:42:50.758Z-18580` navigated Electrobun to the dashboard in 3.639 seconds, down from 43.699 seconds in the slow baseline.
- Vite was ready in 437 ms; there was no development PWA generation output.
- The real AC500 `24:4C:AB:2C:24:8E` was discovered and its bridge began polling 6.966 seconds after session start.
- Live `/devices` completed in 147 ms and `/fields/AC500-2237000003358` in 15 ms against the 2.68 GB database.
- Telemetry remained fresh through the desktop hot rebuild, and no bridge exit, AC500-unavailable event, or database-lock warning occurred in the validation window.
- The hot-rebuilt Electrobun process emitted one successful icon-helper result rather than four.
- Python API tests: 8 passed.
- Development supervisor tests: 7 passed.
- Dashboard production build passed and generated the expected production service worker.
- Dashboard lint remains unavailable because the repository has ESLint 9 but no `eslint.config.*`; this is a pre-existing tooling gap, not a regression from these changes.
- Parent repository and submodule `git fsck --no-dangling` checks passed. The existing clean submodule checkout at `01280a4` still intentionally differs from the parent gitlink `3aecb40` and was not modified.
