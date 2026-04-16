---
phase: 06-unify-shell-and-navigation
plan: 01
subsystem: ui
tags: [react, zustand, routing, shell, navigation]
requires: []
provides:
  - Route registry for shell title, icon, and mobile signal metadata
  - Shell signal store for per-route dynamic mobile values
  - Stable shell and sidebar test selectors for later Playwright rewrites
affects: [phase-06-shell-refactor, phase-06-route-signals, phase-06-playwright]
tech-stack:
  added: []
  patterns: [central route metadata registry, shell signal store]
key-files:
  created:
    - dashboard/src/lib/routes.ts
    - dashboard/src/store/shell.ts
  modified:
    - dashboard/src/App.tsx
    - dashboard/src/components/Sidebar.tsx
key-decisions:
  - "Route labels, shell titles, and mobile signal labels now live in one registry."
  - "The shell store carries route id plus dynamic value so App owns the visible signal label."
patterns-established:
  - "Route metadata should be read from dashboard/src/lib/routes.ts instead of local NAV arrays or pathname ternaries."
  - "Shell-level tests should prefer stable data-testid selectors over text matching."
requirements-completed: [UI-01, UI-02, UI-03]
duration: "18min"
completed: 2026-04-16
---

# Phase 6: unify-shell-and-navigation Summary

**Centralized shell route metadata and added a dedicated shell signal store so the Phase 6 top bar, sidebar, and test layer can share one navigation contract.**

## Performance

- **Duration:** 18 min
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Added `dashboard/src/lib/routes.ts` as the single source of truth for route ids, labels, icons, shell titles, and mobile signal labels.
- Added `dashboard/src/store/shell.ts` so route pages can publish dynamic mobile signal values without owning the signal label contract.
- Added stable shell and sidebar selectors that the later Playwright rewrite can target directly.

## Task Commits

1. **Task 1: Create the route registry and central mobile-signal contract** - `4711082`
2. **Task 2: Add the shell signal store and stable selectors for later Playwright coverage** - `c0f12bb`

## Files Created/Modified

- `dashboard/src/lib/routes.ts` - Central route metadata registry for shell identity and per-route mobile signal labels
- `dashboard/src/store/shell.ts` - Zustand store for active route signal value and reset behavior
- `dashboard/src/App.tsx` - Uses the route registry for shell identity and exposes stable shell selectors
- `dashboard/src/components/Sidebar.tsx` - Uses the route registry and exposes stable sidebar selectors

## Decisions & Deviations

None - followed plan as specified.

## Next Phase Readiness

- Wave 2 can now remove the persistent shell hero without reintroducing route metadata drift.
- Wave 4 test work has stable selectors available before the Playwright rewrite begins.
