---
slug: analytics-charts-live-update
status: resolved
trigger: "analytics folder: the dashboard doesnt seem to be updating when live telemetry is coming in"
created: 2026-06-02T00:00:00.000Z
updated: 2026-06-02T00:00:00.000Z
resolved: 2026-06-02T00:00:00.000Z
---

# Debug Session: analytics-charts-live-update

## Symptoms

- **Expected**: Dashboard charts should auto-update as live telemetry arrives via WebSocket
- **Actual**: Only updates on manual refresh (clicking refresh button)
- **Errors**: No errors in browser console or API logs
- **Timeline**: Always been this way (not a regression)
- **Reproduction**: Open the analytics app tab while telemetry is flowing

## Current Focus

**Hypothesis**: The analytics app's charts (Power Balance, Solar Input, Battery Posture) are driven entirely by the `historyQuery` React Query fetch, which fetches historical REST data on mount and is only refetched on manual refresh. The live WebSocket stream (`useLiveTelemetry`) updates `liveState` but this state is only used for the SnapshotPanel and KPI summary — it is never appended to the chart timeline.

**Test**: Check if `timeline` (from `historyQuery.data`) is the sole data source for all chart series, and confirm that `liveState` is used only for `SnapshotPanel`, `latestTimestamp`, and the `mergedState` fallback logic.

**Expecting**: The `timeline` variable feeds every chart series (`powerBalanceSeries`, `solarInputSeries`, `batteryPostureSeries`). The live WebSocket updates never merge into the timeline. A periodic refetch or live-appending mechanism is missing entirely.

**Next action**: Verify the data flow — trace from WebSocket receive through `liveState` to charts to confirm the gap.

## Evidence

- **Data flow trace**: `App.tsx` line 178-182 — `historyQuery` uses `useQuery` with no `refetchInterval`. Charts at lines 216-235 derive all series (`powerBalanceSeries`, `solarInputSeries`, `batteryPostureSeries`) from `timeline` (`historyQuery.data`).
- **Live state usage**: `useLiveTelemetry()` returns `state`, `connected`, `lastUpdate` at line 112. `live.state` feeds only `SnapshotPanel` (line 464) and `latestTimestamp` (line 269-271). Never merged into chart data.
- **Refresh path**: `historyQueryRefetch` (line 301) is the sole trigger for chart updates, wired to the manual refresh button only.

## Eliminated Hypotheses

- *None — hypothesis confirmed directly*

## Resolution

**Root Cause**: The analytics charts (Power Balance, Solar Input, Battery Posture) are fed solely by `historyQuery` (React Query fetching REST history), which had no automatic refetch mechanism. Live WebSocket telemetry flowed into `live.state` but never reached the chart `timeline`.

**Fix**: Added `refetchInterval: live.connected && !IS_STATIC_ANALYTICS ? 10_000 : false` to `historyQuery` in `App.tsx`. This polls the REST API every 10 seconds when the WebSocket is connected, keeping chart data current without manual refresh. The interval is disabled in static export mode and when the live connection is down.

## Files Changed

- `analytics/src/App.tsx` — Added `refetchInterval` to `historyQuery` options (line 183)
