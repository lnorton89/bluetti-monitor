---
status: complete
created: 2026-05-18
completed: 2026-05-18
phase: 15
---

# Phase 15 Plan: Estimation Accuracy Overhaul

## Goal

Make Runtime and Time to Full accurate enough for daily monitoring by replacing the current single-pass counter logic with a canonical, testable estimation model that uses multiple tactics and validates itself against historical telemetry.

## Current Problem

The existing dashboard estimate code can use `battery_range_to_empty` / `battery_range_to_full` directly, then falls back to instantaneous net power and a simple trailing SOC trend. That is useful as a first approximation, but it fails when power is noisy, SOC moves in coarse steps, the device-reported range is missing or dubious, or recent history does not represent the current charge/discharge pattern.

## Strategy

Use a ranked estimate pipeline. Each tactic returns minutes, source, confidence, inputs, and caveats. The final displayed estimate is the best valid tactic, with secondary tactics retained for explanation and diagnostics.

## Tactics

1. **Device-reported range**
   - Use `battery_range_to_empty` and `battery_range_to_full` when present and sane.
   - Reject negative, stale, frozen, or directionally impossible values.
   - Treat device values as one candidate, not absolute truth.

2. **Instantaneous net power**
   - Runtime: remaining Wh divided by net discharge watts.
   - Time to full: deficit Wh to `battery_range_end` divided by net charge watts.
   - Use input/output deadbands and freshness checks to avoid unstable small-power estimates.

3. **Recent SOC trend**
   - Estimate from battery percent movement over a trailing window.
   - Use multiple windows, such as 15, 30, 60, and 180 minutes, and choose the most stable valid segment.
   - Segment by monotonic charge/discharge direction and reject flat/noisy windows.

4. **Historical calibration**
   - Derive effective Wh per SOC percent from historical windows where SOC changed and net power was reasonably stable.
   - Store or compute observed charge/discharge rates by mode: grid charge, solar charge, mixed charge, AC load, DC load, and mixed load.
   - Use calibrated effective capacity when reported capacity or remaining capacity is absent or inconsistent.

5. **Historical similar-window matching**
   - Find past windows with similar SOC, net watts, input source, output load, and charge/discharge direction.
   - Prefer actual observed time-to-target from those windows when enough comparable samples exist.
   - Return low confidence when the current situation has no historical analog.

6. **Blended/confidence decision**
   - Rank candidates by data freshness, historical support, stability, and agreement between tactics.
   - Use one displayed estimate plus a confidence level: high, medium, low, or unavailable.
   - Show a concise reason when candidates disagree sharply.

## Implementation Plan

### 15-01: Audit Estimate Inputs And Consumers

- Inventory live fields used by runtime and charge estimates: SOC, remaining capacity, battery capacity, input power, output power, charge ceiling, direct device range fields, and timestamps.
- Inventory dashboard consumers in Overview and Solar so one canonical model can replace page-local logic.
- Identify API history access gaps, especially multi-field history loading and stale/frozen direct-counter detection.
- Produce a short field contract documenting units, freshness, fallback order, and rejection rules.

### 15-02: Build Canonical Estimate Model

- Replace the current pair of `estimateRuntimeMinutes` / `estimateChargeTimeMinutes` outputs with structured results.
- Model shape should include `minutes`, `kind`, `source`, `confidence`, `inputs`, `caveats`, and all candidate tactics.
- Keep pure functions in dashboard/lib or a shared domain module first, because current estimate consumers are frontend-side.
- Preserve existing direct-counter and net-power behavior as candidates, but add sanity checks and confidence.

### 15-03: Add Historical Calibration And Backtesting

- Add history-loading helpers or an API endpoint that can fetch the needed fields for the selected device/window without many fragile one-off calls.
- Build a script or report that scans SQLite history for charge/discharge windows and computes:
  - observed SOC delta over time
  - average/median net power
  - effective Wh per percent
  - predicted vs observed time-to-target error
  - rejected windows and rejection reason
- Save the report under `reports/` so future estimate changes can be compared against real data.

### 15-04: Wire UI, Copy, And Tests

- Update Runtime and Time to Full cards to show value, confidence, and source.
- Update tooltips/popovers with the winning tactic, core inputs, and caveats.
- Ensure unavailable states are specific: no SOC history, flat SOC, stale power, contradictory flow, target already reached, or no matching history.
- Add unit tests for all tactics and fixture tests for known historical windows.
- Run dashboard build and relevant unit tests.

## Validation Plan

- Backtest against local SQLite history before and after the model change.
- Include fixtures for discharge, grid charge, solar charge, mixed input/output, idle, stale telemetry, frozen device counters, and configured charge ceiling below 100%.
- Validate that Overview and Solar agree for the same state/history.
- Verify the UI on desktop and mobile widths so confidence/source text does not crowd the cards.

## Open Questions

- Should calibrated history be computed on demand in the dashboard, exposed by FastAPI, or cached as a small API-side summary?
- Should confidence thresholds be fixed in code first, or promoted to settings after they prove useful?
- How much historical data is enough before the history-matched tactic is allowed to outrank instantaneous power math?
