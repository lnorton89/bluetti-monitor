# Summary: Analytics Time-Period Comparison (260529-p8q)

**Status:** complete
**Date:** 2026-05-30

## Completed

- **constants.ts** — Added `COMPARISON_OPTIONS`, `ComparisonOption` type, `ANALYTICS_COMPARE_KEY`, `getStoredComparisonOption` helper
- **analytics.ts** — Added `computeComparisonRange` function that computes an offset `since`, `label`, and `offsetMs` for each comparison option (yesterday, same day last week, same range last week)
- **DenseTimeSeries.tsx** — Added `ComparisonSeriesGroup` interface and optional `comparisonSeries` prop; merges primary and comparison timestamps into a unified uPlot data matrix; renders comparison series with dashed lines (`dash: [5, 5]`, `width: 1.5`); tooltip reads from uPlot chart data directly and shows all series (primary + comparison) with proper unit formatting
- **ControlsBand.tsx** — Added `comparisonOption`/`onComparisonChange` props; renders a "Compare with" dropdown with an eye icon and an active "Comparing" badge when a comparison is selected
- **App.tsx** — Wired `comparisonOption` state (persisted to localStorage); parallel `useQuery` for comparison timeline; built `ComparisonSeriesGroup[]` for Power Balance, Solar Input, and Battery Posture panels with shifted timestamps; passed comparison props to ControlsBand and series to each DenseTimeSeries
- **base.css** — Added styles for `.compare-select`, `.compare-icon`, `.compare-badge`; responsive and compact density variants
- **index.ts** — Exported `ComparisonSeriesGroup` type

## Key Design Decisions

- Comparison timestamps are shifted forward by the offset delta (e.g., +24h for "Yesterday") so they share the same x-axis as the primary data — this is the standard time-of-day alignment used by Google Analytics, Grafana, etc.
- Parallel `useQuery` with separate cache key (`core-timeline-comparison`) — comparison data doesn't block primary render
- Comparison uses the same `fetchCoreTimelineInWorker` function as the primary, so it respects the same bucketMs, limit, and resolved fields
- No API changes required

## Files Changed
- `analytics/src/lib/constants.ts` — +23 lines
- `analytics/src/lib/analytics.ts` — +26 lines
- `analytics/src/components/DenseTimeSeries.tsx` — major rewrite (merged data matrix, dashed comparison lines, chart-based tooltip)
- `analytics/src/components/ControlsBand.tsx` — +compare dropdown and wiring
- `analytics/src/App.tsx` — +comparison state, queries, series groups, props
- `analytics/src/styles/base.css` — +comparison element styles
- `analytics/src/components/index.ts` — +export
