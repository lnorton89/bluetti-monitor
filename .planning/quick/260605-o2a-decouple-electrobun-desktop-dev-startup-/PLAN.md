---
status: in_progress
created: "2026-06-06T00:19:33.393Z"
quick_id: 260605-o2a
slug: decouple-electrobun-desktop-dev-startup-
---

# Decouple Electrobun Desktop Dev Startup

## Goal

Make the Electrobun desktop shell completely separate from monitor stack orchestration. The desktop process should only host a native window around an already-running dashboard, while monitor scripts own Docker, API, dashboard dev server, and BLE bridge startup.

## Current Coupling

- `src/bun/index.ts` starts/stops Docker services, the Python API, Vite, and the BLE/MQTT service.
- `scripts/dev-desktop.mjs` builds/watches the BLE library and starts Electrobun as one workflow.
- `src/mainview/index.html` describes the desktop as the bootstrap owner.

## Planned Changes

1. Update `scripts/monitor/shared.mjs` with reusable local-dev helpers:
   - command resolution
   - process spawning with environment
   - Python venv setup
   - URL readiness helpers already present
2. Add `scripts/monitor/dev.mjs`:
   - start Mosquitto only through Docker
   - stop Docker-owned `api`/`dashboard` containers to avoid port conflicts
   - ensure Python venv
   - start `uvicorn --reload`
   - start Vite on `127.0.0.1:5173`
   - resolve and start the host BLE bridge
   - keep child processes attached until Ctrl+C
3. Refactor `src/bun/index.ts`:
   - remove stack and BLE orchestration
   - load `BLUETTI_DASHBOARD_URL` or default `http://localhost:8540`
   - use `BLUETTI_API_URL` or default `http://127.0.0.1:8000` for titlebar websocket
   - show a passive unavailable page when the dashboard is not running
4. Update `scripts/dev-desktop.mjs`:
   - keep Electrobun-only startup/restart behavior
   - remove BLE library build/watch ownership
5. Update package scripts:
   - keep `desktop:dev` for Electrobun window only
   - add `monitor:dev`
   - add `dev:all` convenience command that runs monitor and desktop as siblings
6. Update the desktop loading page and README so user-facing docs match the new ownership split.

## Verification

- Type-check the desktop TypeScript with `bunx tsc --noEmit`.
- Run lightweight syntax checks on changed Node scripts.
- Confirm package script wiring is present.
- Avoid live `monitor:dev` smoke unless explicitly requested because it may touch Docker, BLE, and local ports.
