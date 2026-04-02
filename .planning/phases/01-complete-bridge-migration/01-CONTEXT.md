# Phase 1: Complete Bridge Migration - Context

**Gathered:** 2026-04-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Make `bluetti-mqtt-node` the only documented and supported bridge path for normal setup and startup. This phase standardizes the browser-first daily-use flow, removes old Python poller references from user-facing setup and startup guidance, and defines a repeatable verification story for the migration. Rewriting the FastAPI service out of Python is explicitly out of scope for this phase.

</domain>

<decisions>
## Implementation Decisions

### Startup path
- **D-01:** The canonical daily-use flow is browser-first, not desktop-wrapper-first.
- **D-02:** Phase 1 should introduce one repo-level npm command that launches the supported monitoring flow end to end.
- **D-03:** That command should auto-discover the AC500 and fall back to the known MAC address if discovery fails.
- **D-04:** The command should not force-open a browser window; it should start the stack and print the relevant local and LAN URLs.

### Bridge ownership
- **D-05:** The repo-level npm command is the primary supported startup path for this app.
- **D-06:** The standalone `bluetti-mqtt-node` CLI should remain available as an advanced/manual fallback for debugging and package-level use, but not as an equal first-class app workflow.
- **D-07:** The app's normal startup path should exercise the package through its CLI-style entrypoint rather than the current in-process bridge helper integration.

### Migration completion
- **D-08:** Phase 1 is complete when docs and commands tell one consistent startup story with `bluetti-mqtt-node` as the only supported bridge path.
- **D-09:** Phase 1 must include one repeatable smoke test that proves startup and live telemetry flow.
- **D-10:** Phase 1 must also include a scripted local verification command so the migration can be re-checked without ad hoc manual steps.

### Legacy boundary
- **D-11:** Keep the FastAPI service in Python for now; only the old Python poller path and its references should be removed in this phase.
- **D-12:** If migration-blocking legacy residue is easy to remove while aligning the new startup path, it can be removed as part of this phase as long as it does not expand into a Python API rewrite.

### the agent's Discretion
- Exact naming and shape of the new repo-level startup and verification scripts.
- How startup output presents local versus LAN URLs.
- Whether the CLI wrapper uses config files, generated arguments, or another thin orchestration layer, as long as it follows the decisions above.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project intent
- `.planning/PROJECT.md` - Active goals, constraints, and milestone direction for the `bluetti-mqtt-node` migration.
- `.planning/REQUIREMENTS.md` - Phase-linked requirements, especially `MIGR-01` and `MIGR-02`.
- `.planning/ROADMAP.md` - Phase 1 goal, success criteria, and plan slots.
- `.planning/STATE.md` - Current project position and known migration concerns.

### Current user-facing startup story
- `README.md` - Existing setup and startup instructions that must be aligned to the new single-command browser-first flow.

### No external specs
- No external ADRs or design specs exist for this phase; requirements are fully captured in the decisions above and the project planning files listed here.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/bun/index.ts`: Current startup orchestration for Docker, FastAPI, dashboard dev server, and background bridge startup. Useful as a reference for service readiness checks, process lifecycle, and status messaging even if the canonical path shifts away from the desktop wrapper.
- `src/bun/bluetooth.ts`: Existing discovery logic, fallback MAC behavior, helper resolution, and bridge startup assumptions. Reusable as migration reference material, but Phase 1 should avoid leaving the main app path coupled to this in-process bridge API.
- `lib/bluetti-mqtt-node/src/cli/bluetti-mqtt.ts`: The package CLI entrypoint that should represent the normal bridge execution path after migration.
- `lib/bluetti-mqtt-node/package.json`: Existing bin names and validation/build scripts that can inform how the repo-level wrapper invokes the package.

### Established Patterns
- Root-level npm scripts in `package.json` already act as the main developer command surface for desktop, tests, and stack control.
- The current desktop path separates Docker broker startup from local API and Vite startup, which suggests the repo command may also need explicit orchestration across multiple runtimes.
- The dashboard currently has two access modes: local Vite dev at `127.0.0.1:5173` and containerized nginx at host port `8540`. This split is central to fixing the migration story.

### Integration Points
- `package.json`: Add or revise the repo-level scripts that define the canonical app workflow.
- `README.md`: Update setup, startup, and verification docs to remove the old Python poller story.
- `src/bun/index.ts`: Ensure the desktop wrapper becomes an optional convenience path instead of the primary runtime story.
- `docker-compose.yml`: Reference for the supported containerized services and dashboard port expectations.
- `api/main.py`: Remains part of the supported runtime, but should no longer imply ownership of any BLE polling path.

</code_context>

<specifics>
## Specific Ideas

- The official app experience should be reachable in a browser on the LAN without requiring the desktop shell.
- The repo-level startup should feel like one command that launches everything needed, while still surfacing URLs instead of taking over the user's browser.
- The main app path should exercise `bluetti-mqtt-node` the way an external consumer would, using the package CLI entrypoint rather than a special in-process integration path.

</specifics>

<deferred>
## Deferred Ideas

- Full removal of Python from the project - deferred as a later architecture phase because the FastAPI API remains intentionally in Python for now.

</deferred>

---

*Phase: 01-complete-bridge-migration*
*Context gathered: 2026-04-02*
