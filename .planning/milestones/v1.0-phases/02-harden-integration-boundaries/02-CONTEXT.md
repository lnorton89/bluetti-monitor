# Phase 2: Harden Integration Boundaries - Context

**Gathered:** 2026-04-15
**Status:** Ready for planning

<domain>
## Phase Boundary

Remove leftover legacy coupling, fix the remaining `bluetti-mqtt-node` migration bugs, and clarify ownership between components. This phase completes MIGR-03 (verify no legacy poller code), fixes bridge startup/polling/runtime bugs needed for daily use, confirms clear runtime boundaries between desktop shell, Node bridge, and Python API, and validates regression coverage.

</domain>

<decisions>
## Implementation Decisions

### Legacy removal (MIGR-03)
- **D-01:** Verify no legacy Python poller code remains in the codebase beyond documentation references
- **D-02:** The old poller references in docs are historical context but are not blocking the migration

### Runtime boundaries (INTG-02)
- **D-03:** Desktop shell owns: stack orchestration, service startup, optional desktop window
- **D-04:** Node bridge (`bluetti-mqtt-node`) owns: BLE device connection, polling, MQTT publishing
- **D-05:** Python API owns: MQTT subscription, database persistence, REST/WebSocket serving

### Bridge reliability (INTG-01)
- **D-06:** Primary work is fixing bridge startup/polling/runtime bugs for daily use
- **D-07:** The runtime ownership described above should guide bug assignment

### Regression coverage (INTG-03)
- **D-08:** Use `npm run monitor:verify` as the primary regression check
- **D-09:** If additional checks are needed, add them as part of plan execution

### Claude's Discretion
- Specific bridge bugs to fix (identified during execution)
- Exact shape of additional regression checks (if needed)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project intent
- `.planning/PROJECT.md` - Core value and milestone direction
- `.planning/REQUIREMENTS.md` - Phase-linked requirements [MIGR-03, INTG-01, INTG-02, INTG-03]
- `.planning/ROADMAP.md` - Phase 2 goal, success criteria, and 3 plan slots
- `.planning/STATE.md` - Current project position and pending concerns

### Prior phase context
- `.planning/phases/01-complete-bridge-migration/01-CONTEXT.md` - Phase 1 decisions (browser-first path, keep FastAPI)

### Runtime ownership reference
- `src/bun/index.ts` - Desktop shell orchestration (service startup, bluetooth launch)
- `api/main.py` - FastAPI service (MQTT subscribe, REST, WebSocket)
- `lib/bluetti-mqtt-node/src/cli/bluetti-mqtt.ts` - Bridge CLI entrypoint
- `package.json` - `monitor:start` and `monitor:verify` commands

### No external specs
- No external ADRs or design specs exist for this phase; requirements fully captured in decisions above

</canonical_refs>

 <code_context>
## Existing Code Insights

### Reusable Assets
- `src/bun/index.ts`: Desktop shell orchestration — service startup, bluetooth adapter, WebSocket titlebar updates. Already separates concerns well.
- `src/bun/bluetooth.ts`: BLE discovery and bridge launcher adapter.
- `api/main.py`: Clean FastAPI service with MQTT subscribe, SQLite persistence, REST/WebSocket. No legacy poller code.
- `package.json`: `monitor:start` and `monitor:verify` commands already exist.

### Established Patterns
- Desktop shell uses `isLocalDev` to choose between Docker stack and local dev stack.
- The three-way ownership (desktop → bridge → API) is already architecturally clear.
- API uses `bluetti/state/<device>/<field>` MQTT topic format.

### Integration Points
- `package.json` scripts for `monitor:start` and `monitor:verify`.
- Desktop shell WebSocket for titlebar updates connects to `http://127.0.0.1:8000/ws`.
- Bridge publishes to `localhost` MQTT broker.

</code_context>

<specifics>
## Specific Ideas

- State.md notes "Runtime ownership between the desktop shell, Node bridge, and Python API still needs to be simplified for daily-use reliability" — focus on bugs/verification, not structural changes.
- Bridge startup already happens asynchronously in `src/bun/index.ts` — bugs may relate to error handling or reconnection.

</specifics>

<deferred>
## Deferred Ideas

**None** — discussion stayed within phase scope

---

*Phase: 02-harden-integration-boundaries*
*Context gathered: 2026-04-15*