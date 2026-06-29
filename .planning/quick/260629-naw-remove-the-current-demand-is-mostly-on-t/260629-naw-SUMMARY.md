---
status: complete
quick_id: 260629-naw
slug: remove-the-current-demand-is-mostly-on-t
commit: 2125525
---

# Quick Task 260629-naw Summary

Removed the overview output hero's AC-side demand sentence and replaced the output foot text with a single-line "Highest today AC ... / DC ..." summary.

## Changes

- Added `fetchOutputMax()` in the dashboard API helper to compute today's AC and DC output peaks from the history bundle, including mock mode.
- Wired the overview page to query today's AC/DC output history and merge the result with the current live readings.
- Removed the now-unused output demand summary helper that contained the AC-side sentence.

## Verification

- `npm --prefix dashboard run build` passed.
- The build reported the existing Vite large-chunk warning after successful bundling.
