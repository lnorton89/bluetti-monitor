# Quick Task 260407-hqx: Improve the dashboard UI polish and hierarchy for the Bluetti monitor overview and shell

**Date:** 2026-04-07
**Mode:** quick
**Status:** Complete

## Intent

Make the dashboard feel like a coherent monitoring surface instead of three loosely related pages. Focus on information hierarchy, shell polish, and mobile-friendly presentation without changing the core telemetry model.

## Direction

- Visual thesis: industrial signal desk with calm surfaces, strong telemetry hierarchy, and restrained accents.
- Content plan: shell orientation first, working surface second, deep data third.
- Interaction thesis: subtle page-load fade, elevated surface hover, and clearer active navigation/state cues.

## Tasks

### 1. Refine the shell
- Files: `dashboard/src/App.tsx`, `dashboard/src/components/Sidebar.tsx`, `dashboard/src/index.css`
- Action: strengthen the top bar, add route-level context, and improve the navigation/status treatment.
- Verify: each route has clearer orientation and the sidebar/status areas feel part of the same system.

### 2. Align the page surfaces
- Files: `dashboard/src/pages/Charts.tsx`, `dashboard/src/pages/RawData.tsx`, `dashboard/src/index.css`
- Action: replace ad-hoc control layouts with a shared visual language for controls, empty states, and data panels.
- Verify: charts and raw data match the overview page tone and read cleanly on desktop and mobile.

### 3. Validate the pass
- Files: `dashboard/package.json`
- Action: run the dashboard build after the UI changes.
- Verify: `npm --prefix dashboard run build` passes.

## Result

- Shell hierarchy improved with a route-level context band and stronger navigation and status treatment.
- Charts and raw-data pages now share a consistent workspace and control surface language.
- Verification passed with `npm --prefix dashboard run build`.
