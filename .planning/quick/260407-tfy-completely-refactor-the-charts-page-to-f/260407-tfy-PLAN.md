# Quick Task 260407-tfy: Completely refactor the charts page to feel like a telemetry analytics workspace with GA-style summaries, grouped insights, and comparisons built from the actual Bluetti data model

**Date:** 2026-04-08
**Mode:** quick
**Status:** Complete

## Intent

Replace the current "stack of ad-hoc single-line charts" page with a purpose-built analysis workspace that feels closer to Google Analytics: summary-first, report-oriented, and opinionated about the most useful telemetry stories instead of making the user assemble everything manually.

## Direction

- Visual thesis: a calm analytics console with dense but readable surfaces, strong hierarchy, and report sections that reward scanning.
- Content plan: executive summary first, curated trend reports second, flexible custom comparison third, metric explorer last.
- Interaction thesis: fast range switching, focus-mode report toggles, and lightweight chart composition instead of modal-heavy controls.

## Tasks

### 1. Rebuild the data model for analytics use
- Files: `dashboard/src/lib/api.ts`, `dashboard/src/lib/mock.ts`, `dashboard/src/pages/Charts.tsx`
- Action: support history window queries, resolve the best available telemetry aliases, bucket asynchronous field streams into comparable timeline points, and derive analytics-friendly summary metrics.
- Verify: the page can render stable KPI and chart data for the selected device and time window in both live and mock modes.

### 2. Redesign the charts page around curated reports plus custom comparison
- Files: `dashboard/src/pages/Charts.tsx`, `dashboard/src/index.css`
- Action: add analytics-style scorecards, report sections for power balance, input sources, battery behavior, and system health, plus a searchable custom comparison workspace and richer empty states.
- Verify: the charts route reads as an analysis product, works on desktop and mobile, and still lets the user compare arbitrary collected numeric fields.

### 3. Validate the refactor
- Files: `dashboard/package.json`
- Action: run the dashboard build after the refactor.
- Verify: `npm --prefix dashboard run build` passes.
