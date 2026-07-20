---
status: resolved
trigger: "After a forced bridge restart, Windows twice reported the AC500 notify characteristic as missing and the bridge exited instead of retrying in-process."
created: 2026-07-19
updated: 2026-07-19
---

# Missing GATT characteristic exits bridge

## Symptoms

- Expected: transient Windows GATT-cache incompleteness during AC500 initialization is treated as a recoverable connection condition and retried without terminating the bridge process.
- Actual: `command_failed: Characteristic 0000ff01-... was not found on device AC500...` is a plain `Error`, so startup recovery rethrows it and the CLI exits.
- The supervisor restarted with the cached real address, but the bridge still needed three process launches before Windows exposed the characteristic again.

## Evidence

- Fault injection stopped only the active bridge child at `01:54:03.083Z`.
- Cached-address launches at `01:54:08.083Z` and `01:54:14.234Z` each exited after the exact missing-characteristic helper error.
- The third cached-address launch at `01:54:20.317Z` connected and resumed telemetry without rediscovery.
- `helper-line-router.ts` maps disposed-object and unreachable text to `BadConnectionError`, but not missing-characteristic text.
- `session-utils.ts` recognizes retryable initialization by message text rather than the already-established `BadConnectionError` domain type.

## Current Focus

- Classify the exact missing-characteristic helper response as a recoverable Bluetooth connection error.
- Make initialization retry all `BadConnectionError` instances locally before escalating to the outer startup loop.

## Resolution

- Added exact missing-characteristic helper classification so `command_failed: Characteristic ... was not found on device ...` becomes `BadConnectionError`.
- Initialization retry now honors the `BadConnectionError` domain type in addition to legacy message matching.
- Regression tests cover both the exact Windows helper response and domain-type retry classification; both failed before the fix and passed afterward.
- Submodule commit: `0cf8b73 fix(bluetooth): retry incomplete GATT initialization`.
- Full `npm run validate` passed: TypeScript, Biome, all smoke tests, 86.84% statement coverage overall, and the .NET helper build with zero warnings/errors.
- Live validation reproduced the exact missing-characteristic response at `01:56:44.993Z`; the same bridge process logged `Bluetooth startup failed; retrying`, did not exit, and resumed real AC500 polling by `01:56:52.904Z`.
