---
phase: 06-unify-shell-and-navigation
plan: 04
subsystem: testing
tags: [playwright, e2e, shell, navigation, mock-mode]
requires:
  - phase: 06-01
    provides: stable shell and sidebar selectors
  - phase: 06-02
    provides: thin shell without route hero
  - phase: 06-03
    provides: live route-specific shell signal values
provides:
  - Updated Playwright coverage for mobile drawer navigation and route signals
  - Updated desktop shell layout assertions after route-hero removal
  - Green repo-local Phase 6 Playwright suite
affects: [phase-verification, regression-gate]
tech-stack:
  added: []
  patterns: [selector-based shell assertions, route-signal contract testing]
key-files:
  created: []
  modified:
    - dashboard/tests/dashboard.spec.ts
    - dashboard/tests/initial-layout.spec.ts
key-decisions:
  - "Shell tests now target stable selectors and exact route-signal contracts instead of page copy that was removed in Phase 6."
  - "Playwright config stayed unchanged because the existing local dev server contract already matched the updated shell tests."
patterns-established:
  - "Shell/navigation E2E tests should assert both route label and dynamic value format."
  - "Desktop navigation checks should verify both sidebar active state and shell title updates."
requirements-completed: [UI-01, UI-02, UI-03]
duration: "14min"
completed: 2026-04-16
---

# Phase 6: unify-shell-and-navigation Summary

**Replaced the stale shell Playwright checks with selector-based tests that validate the new mobile drawer flow, desktop sidebar behavior, and per-route shell signals.**

## Performance

- **Duration:** 14 min
- **Tasks:** 3
- **Files modified:** 2

## Accomplishments

- Rewrote the mobile E2E flow to assert the new shell title, route-signal chip, drawer behavior, and active-route styling.
- Rewrote the desktop initial-layout check to assert the missing `.route-hero` and the presence of the thin shell.
- Confirmed the unchanged Playwright config still supports the updated suite and ended with `npm --prefix dashboard run test:e2e` passing.

## Task Commits

1. **Task 1: Rewrite the mobile drawer and route-signal Playwright flow** - `f65d30e`
2. **Task 2: Rewrite the desktop shell-layout assertions** - `7572e60`
3. **Task 3: Keep Playwright config aligned and finish with a green full suite** - `no code change` (verified with `npm --prefix dashboard run test:e2e`)

## Files Created/Modified

- `dashboard/tests/dashboard.spec.ts` - Validates mobile drawer flow, route signal contract, and desktop sidebar navigation
- `dashboard/tests/initial-layout.spec.ts` - Validates thin-shell desktop layout after route-hero removal

## Decisions & Deviations

None - followed plan as specified.

## Next Phase Readiness

- Phase verification can rely on a green repo-local Playwright suite instead of the stale pre-phase shell assertions.
- Future shell work now has stable E2E coverage on both mobile and desktop layouts.
