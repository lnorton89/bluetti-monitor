---
status: passed
created: 2026-05-18
phase: 15
---

# Phase 15 Verification

## Goal

Replace the current brittle Runtime and Time to Full sections with a historically calibrated estimation model and dashboard presentation that explains source, confidence, and unavailable states.

## Automated Checks

| Check | Result |
|-------|--------|
| Battery estimate unit tests | Passed |
| Notification/titlebar regression tests | Passed |
| Dashboard TypeScript and production build | Passed |
| Python syntax check | Passed |
| Local SQLite estimate backtest | Passed |
| Live AC500 UAT | Passed |

## Requirement Coverage

| Requirement | Evidence |
|-------------|----------|
| EST-01 | Structured estimate inputs and source labels in `battery-estimates.ts` and dashboard tooltips |
| EST-02 | Overview and Solar use `buildBatteryEstimate` |
| EST-03 | Rejected candidates and unavailable caveats are modeled explicitly |
| EST-04 | Runtime candidates include device, instant, recent trend, calibration, and similar windows |
| EST-05 | Charge candidates include device, instant, recent trend, calibration, and similar windows |
| EST-06 | Historical calibration derives Wh per percent from stable history windows |
| EST-07 | UI shows confidence/source and tooltip caveats |
| VAL-01 | `scripts/estimate_backtest.py` scans SQLite telemetry windows |
| VAL-02 | Backtest writes a local Markdown report under `reports/` |
| VAL-03 | Unit tests cover compatibility behavior plus structured estimate/calibration paths |
| UI-01 | `BatteryEstimates` displays value, confidence, source, and tooltip details |
| UI-02 | Source labels identify device, instant, historical, trend, or unavailable tactics |

## Residual Risk

- Live UAT compared the displayed estimates against a real AC500 charge session. Dense live polling exposed and fixed a shallow-history regression; Time to Full then held a medium-confidence Recent SOC trend across follow-up samples.
