---
status: complete
---

# Quick Task 260522-bpl: Clarify Battery Posture Labels

## Completed

- Changed the Battery Posture subtitle to describe the plotted line as the SOC trend.
- Changed the legend from `SOC`/`Voltage` to a single `SOC trend` entry.
- Renamed the voltage stat to `Battery voltage avg` so voltage remains available without implying a second plotted trace.

## Verification

- `bun run build` in `analytics/` passed.
- Browser check against `http://127.0.0.1:5120/?mock=1` confirmed the Battery Posture panel shows one legend item, `SOC trend`, plus stat labels `SOC range` and `Battery voltage avg`.

