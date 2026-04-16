---
phase: 06-unify-shell-and-navigation
plan: 02
subsystem: ui
tags: [react, css, shell, navigation, responsive]
requires:
  - phase: 06-01
    provides: route registry and shell selectors
provides:
  - Thin top bar without a competing shell hero
  - Mobile drawer behavior aligned with the desktop sidebar model
  - Responsive shell rules that hide the desktop chip cluster on mobile
affects: [phase-06-route-signals, phase-06-playwright]
tech-stack:
  added: []
  patterns: [thin persistent shell, mobile-first shell simplification]
key-files:
  created: []
  modified:
    - dashboard/src/App.tsx
    - dashboard/src/index.css
key-decisions:
  - "The shell now shows one route identity surface instead of a global route hero plus top-bar title."
  - "Mobile hides the desktop operational chip cluster and keeps the route signal visible."
patterns-established:
  - "Shell-level visual framing stays in the sticky top bar; page storytelling stays inside route pages."
  - "Responsive shell behavior should simplify content on mobile instead of stacking all desktop status chips."
requirements-completed: [UI-01, UI-02, UI-03]
duration: "16min"
completed: 2026-04-16
---

# Phase 6: unify-shell-and-navigation Summary

**Removed the competing shell hero and converted the shared dashboard frame into a thinner top bar with mobile-first drawer behavior.**

## Performance

- **Duration:** 16 min
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Removed the persistent `route-hero` from the shell so page-level framing is no longer duplicated above route content.
- Reduced the top bar to route identity, the route signal chip, and operational shell status.
- Updated responsive shell rules so mobile shows the thin shell and drawer instead of the full desktop status cluster.

## Task Commits

1. **Task 1: Remove the shell route hero and keep only operational shell status** - `4ab8bd1`
2. **Task 2: Align sidebar and drawer behavior with the thin-shell contract** - `2beb834`

## Files Created/Modified

- `dashboard/src/App.tsx` - Removes the route hero and exposes only the thin operational shell surfaces
- `dashboard/src/index.css` - Removes route-hero styling and simplifies mobile shell behavior

## Decisions & Deviations

None - followed plan as specified.

## Next Phase Readiness

- Wave 3 can now wire dynamic per-route signal values into the already-visible shell route signal chip.
- Wave 4 test updates can assert the absence of `.route-hero` directly.
