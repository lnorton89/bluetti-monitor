# Requirements: v1.3 Estimation Accuracy

## Goal

Replace the dashboard Runtime and Time to Full sections with trustworthy estimates derived from real AC500 telemetry, recent trends, and historical calibration.

## Estimate Inputs And Ownership

- [x] **EST-01**: User can trust that Runtime and Time to Full use documented AC500 fields with a visible source path instead of hidden or invented inputs.
- [x] **EST-02**: User can see estimates computed from the same canonical model wherever the dashboard shows runtime or charge time.
- [x] **EST-03**: User gets a clear unavailable state when telemetry is insufficient, stale, contradictory, or below a useful power-change threshold.

## Multi-Tactic Estimation

- [x] **EST-04**: User gets a runtime estimate that can choose among direct device range, instantaneous net discharge, recent SOC decline, and historical similar-discharge behavior.
- [x] **EST-05**: User gets a time-to-full estimate that can choose among direct device range, instantaneous net charge, recent SOC climb, and historical similar-charge behavior.
- [x] **EST-06**: User benefits from calibration using historical readings, including observed Wh-per-percent/effective capacity and real charge/discharge rates.
- [x] **EST-07**: User sees estimate confidence and reason text that names the tactic used and explains major caveats.

## Validation And Backtesting

- [x] **VAL-01**: User can rely on estimates that have been backtested against stored SQLite telemetry from real charge and discharge windows.
- [x] **VAL-02**: User can inspect a generated estimate accuracy report showing sample windows, error ranges, rejected data, and recommended defaults.
- [x] **VAL-03**: Future estimate changes are protected by unit tests and fixture-based tests covering direct counters, power math, historical trends, and edge cases.

## Dashboard Presentation

- [x] **UI-01**: User sees Runtime and Time to Full in the dashboard with stable labels, confidence, and calculation details.
- [x] **UI-02**: User can tell whether an estimate is live-only, history-calibrated, device-reported, or unavailable without opening developer tools.

## Future Requirements

- Temperature-adjusted estimates once enough reliable temperature/history data exists.
- Long-term battery health modeling beyond estimate calibration.
- Cloud or fleet comparison against other Bluetti owners.

## Out Of Scope

- Replacing FastAPI, SQLite, React, Bun, or the BLE bridge.
- Guessing unavailable AC500 internals that are not present in telemetry.
- Native mobile app changes.

## Traceability

| Requirement | Phase |
|-------------|-------|
| EST-01 | 15 |
| EST-02 | 15 |
| EST-03 | 15 |
| EST-04 | 15 |
| EST-05 | 15 |
| EST-06 | 15 |
| EST-07 | 15 |
| VAL-01 | 15 |
| VAL-02 | 15 |
| VAL-03 | 15 |
| UI-01 | 15 |
| UI-02 | 15 |
