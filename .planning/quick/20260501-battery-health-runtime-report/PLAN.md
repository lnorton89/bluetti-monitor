---
status: complete
created: 2026-05-01
---

# Battery Health Runtime Report

Generate a report in `reports/` comparing the local Bluetti telemetry database history against the expected runtime for an AC500 with two B300S batteries.

Scope:
- Inspect `.dev-data/bluetti-dev.db`.
- Use observed state-of-charge, input power, and output power readings to estimate delivered runtime/capacity.
- Compare against official AC500/B300S specifications.
- Include caveats where telemetry cannot prove true battery state of health.

