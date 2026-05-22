---
status: complete
---

# Quick Task 260522-ghv: Add Graph Hover Values

## Completed

- Added an imperative hover tooltip to `DenseTimeSeries` using uPlot cursor hooks.
- Tooltip now shows timestamp and each series value at the nearest cursor index.
- Added optional `unit` and `digits` metadata to chart series.
- Passed watt, percent, and field metadata units from analytics chart callers.

## Verification

- `bun run build` in `analytics/` passed.
- Browser check against `http://127.0.0.1:5120/?mock=1` hovered the Power Balance chart and confirmed tooltip text like `Total input 789 W`, `Total output 213 W`, and `Net power 576 W`.

