---
status: complete
created: 2026-05-18
completed: 2026-05-18
phase: 15
---

# Phase 15 Summary: Estimation Accuracy Overhaul

## What Changed

- Replaced the old runtime/time-to-full minute-only helpers with a canonical structured estimate model in `dashboard/src/lib/battery-estimates.ts`.
- Added candidate tactics for device counters, instantaneous net power, recent SOC trend, historical calibration, and historical similar-window matching.
- Added confidence, source labels, inputs, caveats, and rejected-candidate detail so the dashboard can explain the estimate instead of only displaying a number.
- Added `/history/{device}?fields=...` to the FastAPI service plus a dashboard `fetchHistoryBundle` helper so estimate consumers can load a coherent multi-field telemetry window.
- Updated Overview `BatteryEstimates` and Solar charge estimate logic to use the same canonical model.
- Added confidence/source UI styling for Runtime and Time to Full.
- Added `scripts/estimate_backtest.py` plus `npm run estimate:backtest` for local SQLite telemetry backtesting.
- Backtested against `.dev-data/bluetti-dev.db`; the generated report is ignored under `reports/` by design.

## Verification

- `bun test dashboard\test-unit\battery-estimates.test.ts dashboard\test-unit\notifications.test.ts test-unit\titlebar.test.ts`
- `npm --prefix dashboard run build`
- `python -m py_compile api\main.py scripts\estimate_backtest.py`
- `python .\scripts\estimate_backtest.py --limit 5000`

## Notes

- The backtest found usable historical charge and discharge windows and produced effective-capacity calibration summaries.
- The generated report is local-only because `reports/` is ignored.
- Live human validation is still useful because estimate quality depends on the current AC500 telemetry mix and real load/charge behavior.
