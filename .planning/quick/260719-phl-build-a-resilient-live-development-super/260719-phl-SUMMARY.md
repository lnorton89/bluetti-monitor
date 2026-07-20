---
quick_id: 260719-phl
status: complete
completed: 2026-07-20
---

# Resilient Live Development Supervisor - Summary

Implemented a persistent, labeled development supervisor and a real-AC500 bridge lifecycle that stays observable and recoverable during Bluetooth outages.

## Delivered

- `dev:all` now writes every supervisor and child-process event as timestamped JSON lines to `.dev-data/logs/dev-all.log` while retaining readable labeled terminal output.
- The unified log rotates on complete record boundaries and cannot terminate the development workflow if logging fails.
- `monitor:dev` now owns a dedicated bridge supervisor that always targets the physical AC500.
- Missing/disconnected hardware no longer terminates FastAPI, Vite, analytics, or Electrobun; discovery and bridge launch retry in the background.
- The bridge preflight compares the checked-out submodule revision with the parent gitlink, reports dirty source, and rebuilds stale TypeScript CLI or Windows helper artifacts.
- Submodule source/helper inputs are watched independently; successful rebuilds restart only the bridge.
- The compiled CLI is executed directly from the checked-out submodule instead of relying on a potentially stale workspace shim.
- README guidance covers the full live workflow, log following, retry semantics, and submodule rebuild boundaries.

## Verification

- `npm run dev:supervisor:test`: 7 passing tests.
- `node --check`: all changed JavaScript modules passed.
- `git diff --check`: passed.
- Parent repository and submodule `git fsck --no-dangling`: passed.
- Live `npm run dev:all` smoke test:
  - Electrobun, dashboard, analytics, FastAPI, and MQTT started successfully.
  - Preflight reported checked-out submodule `01280a4` versus parent gitlink `3aecb40` without blocking startup.
  - Real AC500 discovery succeeded and telemetry reached `/status`.
  - A controlled bridge-process termination left every UI/API service available, retried discovery, launched a new bridge process, and resumed telemetry.
  - Unified log records were all valid JSON lines.
  - The verified development process tree was removed after the smoke test with no orphaned listeners.

## Commits

- `ef72f07` - `feat(dev): add unified supervisor logging`
- `3a82826` - `feat(dev): supervise real AC500 bridge`
- `c30a6bc` - `docs(dev): explain resilient live workflow`

## Scope Protection

No files inside `lib/bluetti-mqtt-node` were edited or committed. The pre-existing submodule pointer advance and the separate v1.0.1 publish quick task were preserved.
