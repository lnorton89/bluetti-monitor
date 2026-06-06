---
status: complete
phase: 15-estimation-accuracy-overhaul
source: 15-SUMMARY.md, 15-VERIFICATION.md
started: "2026-06-05T17:37:43.0536051-07:00"
updated: "2026-06-05T17:54:00.0000000-07:00"
---

## Current Test

[testing complete]

## Tests

### 1. Live Estimate Visibility
expected: With the monitor stack running against the AC500, the Overview page shows Runtime and Time to Full/Status cards. Each card shows a readable value or a specific unavailable state, plus confidence/source text that does not crowd the card.
result: pass
verified: Playwright against `http://127.0.0.1:5173` saw Runtime with `Unavailable - unavailable` and Time to Full with `Recent SOC trend - medium` visible in the estimate cards after a small UI fix.

### 2. Estimate Explanation Clarity
expected: Opening the Runtime and Time to Full/Status help tooltips explains the selected source, confidence, key inputs, and caveats in plain language.
result: pass
verified: Playwright click-opened both Runtime and Time to Full help popovers. Both included selected source, confidence, live inputs, calculation notes, caveats, and detail text. The click interaction initially closed immediately because focus opened before click toggled; fixed `StatHelpTooltip` so click reliably opens.

### 3. Short-Window Estimate Stability
expected: After several minutes of live telemetry, estimates should remain plausible for the current charge/discharge direction and should not flap between contradictory sources unless the AC500 load/charge pattern actually changes.
result: pass
verified: Initial live sampling exposed a dense-history regression where Time to Full became unavailable while the AC500 was steadily net charging around 1.5 kW. Fixed by preserving SOC plateau starts in trend compression and increasing dashboard estimate history fetch depth to 500 rows per field. Follow-up live sampling held `Recent SOC trend` with medium confidence across five samples, moving smoothly from about 58.9m to 58.2m.

## Summary

total: 3
passed: 3
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps
