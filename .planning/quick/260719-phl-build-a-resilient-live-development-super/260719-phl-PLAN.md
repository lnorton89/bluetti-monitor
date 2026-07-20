---
quick_id: 260719-phl
status: complete
description: Build a resilient live development supervisor with unified logs, mandatory real AC500 reconnect behavior, and submodule preflight and rebuild watching
---

# Resilient Live Development Supervisor

## Task 1: Add unified development-session logging

**Files:** `scripts/dev-all.mjs`, `scripts/dev-session.mjs`, `scripts/tests/dev-session.test.mjs`, `package.json`

**Action:** Replace inherited child output in `dev:all` with line-aware labeled pipes that continue to render in the terminal and append structured, timestamped records to `.dev-data/logs/dev-all.log`. Record child spawn/exit/error events and retain bounded log rotation. Keep coordinated Windows process-tree shutdown.

**Verify:** Run the focused Node test suite and launch `npm run dev:all`; confirm all component output is labeled and the session log receives parseable records.

**Done:** A single persisted log shows monitor, analytics, and Electrobun lifecycle/output without hiding child failures.

## Task 2: Make the real AC500 bridge resilient during development

**Files:** `scripts/monitor/dev.mjs`, `scripts/monitor/bridge-dev.mjs`, `scripts/monitor/shared.mjs`, `scripts/tests/bridge-dev.test.mjs`

**Action:** Add a bridge development supervisor that inspects the submodule checkout and generated CLI/helper artifacts, warns when the checkout differs from the parent gitlink, rebuilds stale artifacts, watches source/helper inputs, and restarts only the bridge after successful rebuilds. Discovery and bridge failures must remain non-fatal: the API, dashboard, analytics, and Electrobun stay running while real-device discovery/reconnection retries with bounded delay. Do not add mock-device behavior or edit the submodule.

**Verify:** Exercise preflight/change-classification tests, simulate unavailable discovery through injected dependencies, and confirm retries do not terminate the monitor process.

**Done:** `dev:all` always targets the physical AC500, survives startup/runtime BLE outages, and incorporates local submodule changes without restarting Electrobun.

## Task 3: Document and live-verify the workflow

**Files:** `README.md`

**Action:** Document the unified log location, real-device retry behavior, submodule preflight warnings, and automatic rebuild boundaries. Run syntax/tests, then start the complete stack against the AC500 and verify live API telemetry plus clean shutdown.

**Verify:** `npm run dev:supervisor:test`, `node --check` for changed scripts, and a bounded live `npm run dev:all` smoke run against the connected AC500.

**Done:** The supported command and its failure/recovery behavior are clear, tested, and confirmed with live hardware.
