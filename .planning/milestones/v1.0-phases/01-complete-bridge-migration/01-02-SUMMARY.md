---
phase: 01-complete-bridge-migration
plan: 02
subsystem: docs
tags: [readme, electrobun, startup, dashboard]
requires:
  - phase: 01-01
    provides: "browser-first startup command and shared monitor runtime"
provides:
  - README guidance centered on `monitor:start`
  - optional-desktop-shell positioning
  - packaged desktop bootstrap using the `8540` dashboard URL
affects: [phase-01-verification, phase-02-runtime-boundaries]
tech-stack:
  added: []
  patterns: [browser-first-docs, split-dashboard-urls]
key-files:
  created: []
  modified: [README.md, src/bun/index.ts]
key-decisions:
  - "Treat the desktop shell as optional local tooling in docs and bootstrap copy."
  - "Use 5173 only for local Vite development and 8540 for packaged/containerized dashboard loading."
patterns-established:
  - "README startup sections now describe one supported browser-first path and a separate optional shell path."
  - "Desktop bootstrap computes its dashboard URL from local-dev versus packaged mode instead of reusing one constant."
requirements-completed: [MIGR-02]
duration: 1 min
completed: 2026-04-02
---

# Phase 1 Plan 02: Startup Story Alignment Summary

**README and desktop bootstrap now agree on `monitor:start` as the supported path and `8540` as the packaged dashboard URL**

## Performance

- **Duration:** 1 min
- **Started:** 2026-04-02T19:40:20-07:00
- **Completed:** 2026-04-02T19:40:37.5916019-07:00
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Rewrote the README startup flow around `npm run monitor:start` and removed the old manual host-poller command.
- Moved the desktop shell into an explicit optional local-development section.
- Fixed the non-local desktop bootstrap path to target the packaged dashboard on `http://127.0.0.1:8540`.

## Task Commits

Each task was committed atomically:

1. **Task 1: Rewrite README around the canonical browser-first flow** - `a583a9a` (docs)
2. **Task 2: Correct desktop bootstrap assumptions** - `7e75ba1` (fix)

**Plan metadata:** pending

## Files Created/Modified
- `README.md` - Canonical startup path, optional shell guidance, and browser-first runtime explanation.
- `src/bun/index.ts` - Local-versus-packaged dashboard URL split for the desktop shell.

## Decisions Made
- Kept the desktop shell documented and functional, but clearly secondary to the browser-first monitoring flow.
- Made the packaged desktop path load the same `8540` dashboard surface that browser/LAN users reach.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- `npx tsc --noEmit` resolved to the wrong Windows binary, so verification used `node_modules/.bin/tsc --noEmit` instead.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- The user-facing startup story and the optional desktop shell no longer conflict.
- Plan 03 can now focus purely on the scripted smoke verification flow and README verification instructions.

---
*Phase: 01-complete-bridge-migration*
*Completed: 2026-04-02*
