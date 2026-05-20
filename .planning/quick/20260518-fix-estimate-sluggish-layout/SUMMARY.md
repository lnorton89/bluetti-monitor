---
status: complete
updated: 2026-05-18
---

# Summary

Diagnosed the dashboard regression as a combination of expensive historical battery-estimate scans during live renders and extra visible estimate metadata crowding the compact dashboard row.

## Changes

- Capped estimate history fetches and internal timeline rows at 80 points.
- Avoided duplicate historical calibration scans within each estimate build.
- Restored fresh device-reported battery range counters as the preferred high-confidence source.
- Moved source/confidence details out of visible layout text and into hover titles/tooltips.

## Verification

- `npm --prefix dashboard run build` passed.
- Synthetic estimator timing improved from about 50 ms per estimate at 180 points to about 6 ms per estimate.
