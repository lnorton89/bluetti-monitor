# Summary: Analytics Feature Planning (260529-m8c)

**Status:** complete
**Date:** 2026-05-29

## Completed

- Researched analytics codebase (`App.tsx`, `DenseTimeSeries`, `lib/analytics.ts`, `lib/constants.ts`, `lib/api.ts`)
- Identified three user-selected features: time-period comparison, chart annotations, export/save reports
- Wrote detailed specification document (`ANALYTICS-FEATURES.md`) covering:
  - **Feature A (Time-period comparison):** Compare with dropdown, parallel history queries, dashed comparison lines in DenseTimeSeries. ~3-4h effort.
  - **Feature B (Chart annotations):** localStorage-backed notes with uPlot plugin markers, inline popover editing, notes panel. ~3-4h effort.
  - **Feature C (Export):** CSV blob download, per-chart PNG via `html-to-image`, print stylesheet via `@media print`. ~3-4h effort.
- Documented implementation priority: A → C1 (CSV) → C2 (PNG) → B → C3 (PDF)
- Confirmed no API changes required for any feature

## Key Decisions

- Comparison uses parallel React Query calls with same bucketing — no API changes needed
- Annotations stored in localStorage only (API sync deferred)
- CSV export derives from in-memory timeline (no re-fetch)
- PNG via `html-to-image` (lightest library, ~5KB gzip)
- Print via `@media print` + `window.print()` (zero dependencies)

## Next Steps

- Begin implementing Feature A (Time-period comparison) as a new quick task
- Add `html-to-image` to `analytics/package.json` before Feature C implementation
