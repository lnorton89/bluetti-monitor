---
status: resolved
trigger: "Live AC500 pack-poll busy responses increase the fast telemetry interval from 2500 ms toward the 8000 ms cap."
created: 2026-07-19
updated: 2026-07-19
---

# Pack busy responses slow fast telemetry

## Symptoms

- Expected: battery-pack-specific busy responses should reduce pressure on slow/full polling while keeping the live power/state window responsive.
- Actual: repeated pack-poll busy responses increased `fastIntervalMs` from 2500 ms to 7700 ms during an otherwise healthy real-AC500 session.
- The bridge remained connected and published telemetry; no connection or parser errors accompanied the busy responses.

## Evidence

- Live session `2026-07-20T01:42:50.758Z-18580` reported nine busy responses, all attributed to `pack polling`.
- Over the same interval, `fastIntervalMs` rose from 2500 to 7700, `fullIntervalMs` rose from 15000 to 25400, and `expectedErrorCount` remained zero.
- `DeviceHandler` calls the general `applyBusyBackoff()` for both main command-set busy results and pack-only busy results.
- `applyBusyBackoff()` increases fast and full intervals together, so a pack-only limitation degrades unrelated live telemetry.

## Current Focus

- Add a pack-scoped backoff that increases the full interval and command delay without changing the fast interval.
- Preserve the existing whole-cycle backoff for busy responses from main fast/slow command sets.

## Resolution

- Added `applyPackBusyBackoff()` to adjust only the full polling interval and inter-command delay after a pack-specific busy response.
- Retained `applyBusyBackoff()` for busy responses from the main command set, where slowing both fast and full polling remains appropriate.
- Reused the named full-interval busy/recovery multipliers in the polling-state helpers instead of repeating numeric multipliers.
- Added polling-state regression coverage proving pack backoff preserves the 2500 ms fast cadence while general backoff still raises it to 3250 ms.

## Validation

- The regression test failed against the previous implementation because `applyPackBusyBackoff` did not exist, then passed with the fix.
- Submodule commit: `b2e2050 fix(polling): isolate pack busy backoff`.
- Full submodule `npm run validate` passed: TypeScript typecheck, Biome lint, all 13 smoke-test modules, c8 coverage (86.7% statements overall), and the .NET helper build with zero warnings/errors.
- The live supervisor detected the source edit, rebuilt the submodule, and restarted only the bridge while API, dashboard, analytics, and Electrobun stayed online.
- On the real AC500, the first pack-busy response reported `fastIntervalMs: 2500` and `fullIntervalMs: 16500`.
- After four full cycles and four pack-busy responses, telemetry reported `fastIntervalMs: 2500`, `fullIntervalMs: 18900`, `expectedErrorCount: 0`, and continued fresh MQTT/API updates.
- The parent repository's pre-existing gitlink remains intentionally untouched; its separate pin/publish decision is still outstanding.
