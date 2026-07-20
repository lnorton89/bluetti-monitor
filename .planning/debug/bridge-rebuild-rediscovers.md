---
status: resolved
trigger: "A submodule rebuild discarded the session's known AC500 address, missed BLE rediscovery once, and took about 18 seconds to reconnect."
created: 2026-07-19
updated: 2026-07-19
---

# Bridge rebuild rediscovers known AC500

## Symptoms

- Expected: after the current session has successfully discovered and connected the real AC500, a bridge-only rebuild should reconnect directly to that known address.
- Actual: the supervisor reruns BLE discovery after every rebuild or bridge exit, even though the address was already validated in the same session.
- During live validation, discovery missed once immediately after bridge shutdown and reconnection took about 18 seconds.

## Evidence

- The bridge stopped for a submodule rebuild at `01:48:12.805Z`.
- Rediscovery reported no supported device at `01:48:20.486Z`.
- The next discovery succeeded and connection began at `01:48:30.876Z` for the same AC500 at `24:4C:AB:2C:24:8E`.
- `createBridgeDevSupervisor()` stores only the child process; every `runAttempt()` unconditionally calls `resolveAddress()`.

## Current Focus

- Cache only a successfully resolved address for the lifetime of the supervisor.
- Reuse it after a rebuild or child exit, while preserving real discovery and retry behavior for initial startup.

## Resolution

- The supervisor now caches only a successfully resolved device for its own lifetime and reports the cached MAC through `getState()`.
- Initial startup still performs real BLE discovery; rebuilds and child-exit retries reuse the validated address with a `session cache` log source.
- A regression test proved the prior implementation called discovery twice after a child exit, then passed with exactly one discovery call and two bridge launches.
- In live session `2026-07-20T01:53:26.770Z-10836`, initial startup discovered the real AC500 normally at `01:53:33.043Z`.
- A later source rebuild stopped the bridge at `01:56:37.726Z` and launched against `24:4C:AB:2C:24:8E` from the session cache at `01:56:40.401Z`, with no discovery pass.
- API, dashboard, analytics, and Electrobun remained online throughout the bridge-only rebuild.
