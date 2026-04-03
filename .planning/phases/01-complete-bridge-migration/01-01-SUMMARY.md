---
phase: 01-complete-bridge-migration
plan: 01
subsystem: infra
tags: [node, docker, mqtt, windows, cli]
requires: []
provides:
  - browser-first monitor startup helpers under `scripts/monitor/`
  - root `monitor:start` npm command
  - host bridge launch through the linked `bluetti-mqtt-node` CLI
affects: [phase-01-docs, phase-01-verification]
tech-stack:
  added: [node-runtime-scripts]
  patterns: [shared-monitor-runtime, browser-first-startup]
key-files:
  created: [scripts/monitor/shared.mjs, scripts/monitor/start.mjs]
  modified: [package.json]
key-decisions:
  - "Use repo-local Node scripts under scripts/monitor as the canonical startup orchestration layer."
  - "Launch the host bridge through the linked bluetti-mqtt-node binary instead of direct TypeScript imports."
patterns-established:
  - "Shared monitor runtime: keep broker URLs, fallback MAC logic, and readiness polling in scripts/monitor/shared.mjs."
  - "Browser-first startup: Docker-backed dashboard/API plus host bridge is the supported runtime path."
requirements-completed: [MIGR-01]
duration: 1 min
completed: 2026-04-02
---

# Phase 1 Plan 01: Browser-First Startup Summary

**Root `monitor:start` orchestration using Docker-backed services and the linked `bluetti-mqtt-node` CLI** 

## Performance

- **Duration:** 1 min
- **Started:** 2026-04-02T19:37:23-07:00
- **Completed:** 2026-04-02T19:37:53.4165923-07:00
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments
- Added a shared `scripts/monitor/shared.mjs` runtime layer for Docker startup, readiness polling, fallback-MAC resolution, and LAN URL output.
- Added `scripts/monitor/start.mjs` as the browser-first startup entrypoint that launches Docker services and the host bridge through the package CLI.
- Registered `monitor:start` in the root `package.json` command surface.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add shared browser-first runtime helpers** - `488936c` (feat)
2. **Task 2: Implement the canonical monitor:start entrypoint** - `9b70588` (feat)
3. **Task 3: Register the root startup command** - `4b7a540` (chore)

**Plan metadata:** pending

## Files Created/Modified
- `scripts/monitor/shared.mjs` - Shared constants, process helpers, LAN URL discovery, and device resolution for monitor scripts.
- `scripts/monitor/start.mjs` - Canonical startup command for the browser-first monitor flow.
- `package.json` - Root script wiring for `monitor:start`.

## Decisions Made
- Added a dedicated `scripts/monitor/` layer instead of hiding the new startup story inside the desktop shell.
- Resolved the host bridge via the linked workspace binary in `node_modules/.bin` so the app path exercises the package contract directly.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- The canonical startup command now exists and is ready for the README and desktop-shell alignment work in Plan 02.
- The shared runtime helpers are in place for the upcoming `monitor:verify` smoke command in Plan 03.

---
*Phase: 01-complete-bridge-migration*
*Completed: 2026-04-02*
