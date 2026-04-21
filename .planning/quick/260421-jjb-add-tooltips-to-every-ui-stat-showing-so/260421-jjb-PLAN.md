# Quick Task 260421-jjb: Add tooltips to every UI stat showing source datapoints and calculation details

**Date:** 2026-04-21
**Status:** In progress

## Goal

Add consistent, accessible stat help popovers across the dashboard so each stat explains:
- which telemetry field(s) or timeline series it uses
- whether it is raw or derived
- how the displayed value is calculated

## Tasks

1. Create a reusable stat-help popover primitive for metric surfaces.
   Files: `dashboard/src/components/StatHelpTooltip.tsx`, `dashboard/src/components/MetricTile.tsx`, `dashboard/src/components/ui.tsx`, `dashboard/src/index.css`
   Verify: Metric tiles can render a keyboard-focusable help trigger with a styled popup.

2. Thread tooltip metadata through overview and battery estimate stats.
   Files: `dashboard/src/pages/Overview.tsx`, `dashboard/src/components/BatteryEstimates.tsx`
   Verify: Raw and derived overview stats describe their source fields and formulas.

3. Thread tooltip metadata through solar and charts analytics stats.
   Files: `dashboard/src/pages/Solar.tsx`, `dashboard/src/pages/Charts.tsx`
   Verify: Side stats and summary tiles explain aliases, bucketed series, and derived calculations.
