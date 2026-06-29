---
status: complete
quick_id: 260629-naw
slug: remove-the-current-demand-is-mostly-on-t
---

# Quick Task 260629-naw: Update overview output summary

Remove the AC-side demand sentence from the overview page and show today's highest AC and DC output on one line.

## Plan

1. Replace the output hero foot text with a compact highest-today AC/DC output summary.
2. Add a dashboard API helper that computes AC and DC output maxima from today's history bundle and works in mock mode.
3. Include the current live AC/DC output readings when resolving the displayed maxima so the overview does not wait for history persistence.
4. Run the dashboard build to verify TypeScript and Vite output.
