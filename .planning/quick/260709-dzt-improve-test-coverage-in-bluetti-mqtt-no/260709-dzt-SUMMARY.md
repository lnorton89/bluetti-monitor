---
quick_id: 260709-dzt
status: complete
---

# Summary

Improved `bluetti-mqtt-node` test coverage with focused unit coverage for command execution and helper-client request behavior.

## Changes

- Added `test/device-executor.test.mjs` covering:
  - external command writes through the queue
  - parser publish telemetry on successful read commands
  - expected error, busy, and connection-error classifications
  - pack selection writes, pack polling reads, and expected pack-switch error handling
- Extended `test/helper-client.test.mjs` covering:
  - public request method payloads
  - malformed connect/read payload rejection
  - scan filtering of malformed devices
  - scan timeout selection
- Registered the new executor test in `test/run-all.mjs`.

## Verification

- `npm --workspaces=false run coverage` passed.
- All-file coverage improved from 83.25% statements / 81.64% branches / 86.74% functions / 83.25% lines to 85.05% statements / 81.92% branches / 89.06% functions / 85.05% lines.
- `src/app/device-executor.ts` coverage improved to 88.88% statements and 100% functions.
- `src/bluetooth/helper-client.ts` coverage improved to 44.19% statements and 87.5% functions.

