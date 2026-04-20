---
phase: "07"
plan: "01"
subsystem: dashboard
tags:
  - telemetry
  - state-management
  - loading-states
  - offline-detection
dependency_graph:
  requires: []
  provides:
    - dashboard/src/hooks/useTelemetryState.ts
    - dashboard/src/components/SkeletonCard.tsx
  affects:
    - dashboard/src/pages/Overview.tsx
    - dashboard/src/pages/Charts.tsx
    - dashboard/src/pages/Solar.tsx
    - dashboard/src/pages/RawData.tsx
    - dashboard/src/App.tsx
tech_stack:
  added:
    - useTelemetryState hook
    - SkeletonCard component
    - shimmer animation
    - stale/offline CSS styles
  patterns:
    - Centralized state classification hook
    - Skeleton loading pattern
    - Stale data indicators
    - Offline banner pattern
key_files:
  created:
    - dashboard/src/hooks/useTelemetryState.ts
    - dashboard/src/components/SkeletonCard.tsx
  modified:
    - dashboard/src/components/ui.tsx
    - dashboard/src/index.css
metrics:
  duration: "~5 minutes"
  completed: "2026-04-17"
requirements-completed: [UI-04, UI-05, UI-06]
---

# Phase 07 Plan 01: Build Shared State Infrastructure

**One-liner:** Centralized `useTelemetryState()` hook and `SkeletonCard` component for consistent loading/offline/stale state handling

## Commits

| Task | Commit | Files |
|------|--------|-------|
| Task 1: useTelemetryState hook | 8baf266 | dashboard/src/hooks/useTelemetryState.ts |
| Task 2: SkeletonCard component | 755da72 | dashboard/src/components/SkeletonCard.tsx, ui.tsx |
| Task 3: CSS variables/styles | 2a2a8c3 | dashboard/src/index.css |

## What Was Built

### useTelemetryState Hook
- **Classification flags:** `isLoading`, `isConnected`, `isStale`, `isOffline`, `isPartial`
- **State labels:** Human-readable `stateLabel` ("Loading...", "Live", "Stale", "Offline", "Reconnecting...")
- **Stale severity:** `fresh` (<10s), `aging` (10-30s), `stale` (>30s)
- **Actions:** `reconnect()` function for manual reconnect

### SkeletonCard Component
- Matches Card dimensions for layout stability
- Shimmer animation with 1.5s infinite loop
- Configurable `lines` prop (default: 3)
- Clean, subtle placeholder styling

### CSS Infrastructure
- Skeleton CSS variables (`--skeleton-bg`, `--skeleton-highlight`)
- Stale state colors (`--stale-fresh`, `--stale-aging`, `--stale-stale`)
- `.stale-indicator` styles with severity color coding
- `.offline-banner` styles with retry button
- `.estimate-confidence` badge styles

## Deviations from Plan

**None** — Plan executed exactly as written.

## Self-Check

- [x] useTelemetryState hook exports all required state fields
- [x] SkeletonCard component renders with shimmer animation
- [x] CSS variables and animations present in index.css
- [x] All files pass TypeScript type checking
- [x] Exported from ui.tsx barrel

## Self-Check: PASSED
