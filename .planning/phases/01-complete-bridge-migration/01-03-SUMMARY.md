---
phase: 01-complete-bridge-migration
plan: 03
subsystem: testing
tags: [smoke-test, mqtt, docker, readme, windows]
requires:
  - phase: 01-01
    provides: "shared monitor runtime and startup command"
  - phase: 01-02
    provides: "aligned docs and packaged dashboard URL story"
provides:
  - scripted `monitor:verify` smoke command
  - README verification instructions
  - verified end-to-end bridge publish into the API
affects: [phase-01-completion, phase-02-runtime-boundaries]
tech-stack:
  added: []
  patterns: [scripted-smoke-verification]
key-files:
  created: [scripts/monitor/verify.mjs]
  modified: [scripts/monitor/shared.mjs, package.json, README.md]
key-decisions:
  - "Use a one-shot `bluetti-mqtt-node --once` publish as the migration smoke verifier."
  - "Use `http://localhost:8540` for dashboard verification on this Windows host because `127.0.0.1:8540` reset the connection."
patterns-established:
  - "Smoke verification should prove dashboard reachability, API reachability, and live data visibility through one repo command."
  - "Host-side Windows/Docker dashboard checks should prefer `localhost` over `127.0.0.1` when the mapped port resets on loopback."
requirements-completed: [MIGR-01, MIGR-02]
duration: 1 min
completed: 2026-04-02
---

# Phase 1 Plan 03: Migration Smoke Verification Summary

**Scripted `monitor:verify` now proves the browser-first path with a real one-shot bridge publish into the API**

## Performance

- **Duration:** 1 min
- **Started:** 2026-04-02T19:46:56-07:00
- **Completed:** 2026-04-02T19:47:16.4837091-07:00
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Added `scripts/monitor/verify.mjs` to run the Docker-backed dashboard/API checks plus a one-shot host bridge publish.
- Registered `monitor:verify` in the root package command surface and documented how to use it in the README.
- Verified the migrated path end to end on this machine with real device discovery and API-visible telemetry.

## Task Commits

Each task was committed atomically:

1. **Task 1: Implement the scripted smoke verifier** - `c0c6f22` (feat)
2. **Task 2: Register and document the verification command** - `38824a3` (docs)

**Plan metadata:** pending

## Files Created/Modified
- `scripts/monitor/verify.mjs` - One-shot migration smoke verifier for dashboard, API, and bridge publish visibility.
- `scripts/monitor/shared.mjs` - Dashboard URL adjusted for the working Windows host path during verification.
- `package.json` - Root script wiring for `monitor:verify`.
- `README.md` - Verification instructions and prerequisites.

## Decisions Made
- Used API state visibility after a `--once` bridge run as the definitive smoke-test success signal.
- Kept the verification command repo-local and dependency-light by reusing the shared monitor helpers.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Switched dashboard verification from `127.0.0.1` to `localhost`**
- **Found during:** Task 1 (Implement the scripted smoke verifier)
- **Issue:** `http://127.0.0.1:8540` consistently reset the HTTP connection on this Windows host even though the dashboard container was healthy and `localhost:8540` worked.
- **Fix:** Updated `scripts/monitor/shared.mjs` so the dashboard verification URL uses `http://localhost:8540`.
- **Files modified:** `scripts/monitor/shared.mjs`
- **Verification:** `npm run monitor:verify` passed after the change and reported the dashboard as reachable.
- **Committed in:** `c0c6f22` (part of Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** The deviation kept the smoke verifier aligned with the real host environment and allowed the plan to complete with a true end-to-end pass.

## Issues Encountered

- Initial smoke verification failed because the dashboard port mapping responded on `localhost:8540` but reset on `127.0.0.1:8540`. This was diagnosed against the running container and fixed in the shared runtime helpers.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 1 now has a real startup command, a consistent browser-first story, and a passing smoke verifier.
- Phase 2 can focus on deeper runtime boundaries and leftover migration residue instead of basic startup ambiguity.

---
*Phase: 01-complete-bridge-migration*
*Completed: 2026-04-02*
