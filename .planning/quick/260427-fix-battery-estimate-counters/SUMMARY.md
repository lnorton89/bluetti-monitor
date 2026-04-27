---
status: complete
created: 2026-04-27
completed: 2026-04-27
---

# Summary

Stabilized the dashboard Runtime and Time to Full counters.

## Changes

- Runtime fallback estimates now use net discharge power: total output minus total input.
- Time to Full fallback estimates now use net charge power and respect the configured `battery_range_end` charge ceiling.
- Direct device-reported `battery_range_to_full` remains visible even if the inferred charging state is uncertain.
- Added Bun unit tests for the battery estimate math.

## Verification

- `bun test dashboard/test-unit/battery-estimates.test.ts dashboard/test-unit/notifications.test.ts test-unit/titlebar.test.ts`
- `npm --prefix dashboard run build`
