---
phase: "07"
plan: "02"
subsystem: dashboard
tags:
  - telemetry
  - loading-states
  - offline-detection
  - stale-data
  - trust-states
dependency_graph:
  requires:
    - dashboard/src/hooks/useTelemetryState.ts
    - dashboard/src/components/SkeletonCard.tsx
  provides: []
  affects:
    - dashboard/src/pages/Overview.tsx
    - dashboard/src/pages/Charts.tsx
    - dashboard/src/pages/Solar.tsx
    - dashboard/src/pages/RawData.tsx
    - dashboard/src/components/BatteryEstimates.tsx
    - dashboard/src/App.tsx
tech_stack:
  added:
    - useTelemetryState integration in all pages
    - SkeletonCard loading states
    - offline-banner components
    - stale-indicator components
    - EstimateConfidence badge
    - Stale severity in shell
  patterns:
    - Page-level state handling
    - Loading skeleton pattern
    - Offline banner pattern
    - Stale indicator pattern
    - Confidence indicator pattern
key_files:
  modified:
    - dashboard/src/pages/Overview.tsx
    - dashboard/src/pages/Charts.tsx
    - dashboard/src/pages/Solar.tsx
    - dashboard/src/pages/RawData.tsx
    - dashboard/src/components/BatteryEstimates.tsx
    - dashboard/src/App.tsx
metrics:
  duration: "~10 minutes"
  completed: "2026-04-17"
---

# Phase 07 Plan 02: Implement Telemetry Trust States

**One-liner:** All dashboard pages now show loading skeletons, offline banners, and stale indicators with consistent trust state handling

## Commits

| Task | Commit | Files |
|------|--------|-------|
| Task 1: Page trust states | 438de63 | Overview.tsx, Charts.tsx, Solar.tsx, RawData.tsx |
| Task 2 & 4: BatteryEstimates + App.tsx | 09ad46a | BatteryEstimates.tsx, App.tsx |

## What Was Built

### Overview Page
- **Loading skeleton:** Shows 2 SkeletonCards on initial load
- **Offline banner:** Shows when WebSocket disconnects with retry button
- **Stale indicator:** Shows when data is aging/stale

### Charts Page
- **Loading skeleton:** Shows SkeletonCards for chart placeholders
- **Offline banner:** With retry button
- **Stale indicator:** Color-coded severity badge

### Solar Page
- **Loading skeleton:** Consistent with other pages
- **Offline banner:** With retry button
- **Stale indicator:** Color-coded severity badge

### RawData Page
- **Loading skeleton:** Shows on initial load
- **Offline banner:** With retry button
- **Stale indicator:** Color-coded severity badge

### BatteryEstimates Component
- **Confidence indicator:** Shows "estimated" badge when values are derived from fallback calculations
- Tooltip explains: "Based on typical values — actual rate may vary"

### App.tsx Shell
- **Stale severity in freshness:** Changes color based on stale severity
  - Red for "stale" (>30 seconds)
  - Amber for "aging" (10-30 seconds)
  - Normal for "fresh"

## Deviations from Plan

**None** — Plan executed exactly as written.

## Self-Check

- [x] All 4 main pages show loading skeletons on initial load
- [x] All 4 pages show offline banner when WebSocket disconnects
- [x] All 4 pages show stale indicator when data is older than 30 seconds
- [x] BatteryEstimates shows "estimated" badge for derived values
- [x] App.tsx shell shows stale state in the freshness indicator
- [x] All TypeScript files pass type checking

## Self-Check: PASSED
