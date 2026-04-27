---
status: in_progress
created: 2026-04-27
---

# Fix Battery Estimate Counters

## Goal

Stabilize the dashboard Runtime and Time to Full counters so they use live AC500 telemetry consistently and do not disappear or drift because of brittle charging-state inference.

## Scope

- Update dashboard battery estimate math.
- Add focused unit coverage for runtime and charge estimate edge cases.
- Verify with Bun unit tests and a dashboard build if feasible.
