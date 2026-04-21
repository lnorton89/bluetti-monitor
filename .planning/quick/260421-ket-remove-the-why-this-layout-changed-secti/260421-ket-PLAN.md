# Quick Task 260421-ket: Remove the overview explainer and fix switchboard truthiness

**Date:** 2026-04-21
**Status:** In progress

## Goal

Remove the "Why This Layout Changed" section from the overview page and fix the switchboard badges so they reflect real boolean-like telemetry values consistently.

## Tasks

1. Remove the obsolete overview explainer section.
   Files: `dashboard/src/pages/Overview.tsx`
   Verify: The overview page no longer renders the "Why This Layout Changed" panel.

2. Normalize switchboard truthiness at the shared badge layer.
   Files: `dashboard/src/components/ui.tsx`
   Verify: `ON`, `on`, `True`, `true`, and `1` all render as ON, while false-like values render as OFF.
