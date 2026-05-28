---
status: completed
---

# Analytics load render warning summary

Changed the dense analytics chart component so uPlot instances are preserved across normal parent renders. Chart data now updates with `setData`, while the plot is rebuilt only when the series structure, data presence, or theme changes.

## Verification

- `npm run build` in `analytics/`
