# Directory Structure

## Top-Level Layout

- `api/`
  - FastAPI service and Docker image definition.
- `dashboard/`
  - React/Vite web dashboard, nginx config, and Playwright tests.
- `src/`
  - Electrobun desktop shell and native loading view.
- `mosquitto/`
  - Broker configuration for the Dockerized MQTT service.
- `lib/bluetti-mqtt-node/`
  - Local workspace BLE-to-MQTT bridge package and helper project.
- `build/`
  - Generated desktop build output.
- `.dev-data/`
  - Local development runtime data such as SQLite files.

## API Structure

- `api/main.py`
  - Entire tracked API implementation in a single file.
- `api/requirements.txt`
  - Python dependency manifest.
- `api/Dockerfile`
  - Container build for the API service.
- `api/.venv/`
  - Local dev virtual environment, ignored by git.

## Dashboard Structure

- `dashboard/package.json`
  - Dashboard-specific scripts and dependencies.
- `dashboard/vite.config.ts`
  - Dev proxy config.
- `dashboard/playwright.config.ts`
  - Browser test runner config.
- `dashboard/nginx.conf`
  - Production container routing rules.
- `dashboard/src/`
  - Main application source.

## Dashboard Source Breakdown

- `dashboard/src/main.tsx`
  - React root bootstrap.
- `dashboard/src/App.tsx`
  - Router shell, query client, WebSocket lifecycle, top bar.
- `dashboard/src/components/`
  - Shared UI pieces such as `Sidebar.tsx` and `ui.tsx`.
- `dashboard/src/lib/`
  - API wrappers, field metadata, time helpers, and mock data.
- `dashboard/src/pages/`
  - Page-level route components:
    - `Overview.tsx`
    - `Charts.tsx`
    - `RawData.tsx`
- `dashboard/src/store/`
  - Zustand stores, currently `theme.ts` and `ws.ts`.
- `dashboard/tests/`
  - Playwright end-to-end coverage.

## Desktop Source Breakdown

- `src/bun/index.ts`
  - Desktop app startup and process orchestration.
- `src/bun/bluetooth.ts`
  - Adapter for Bluetti discovery and MQTT service startup.
- `src/mainview/index.ts`
  - Loading-screen script.
- `src/mainview/index.html`
  - Loading-screen HTML.
- `src/mainview/index.css`
  - Loading-screen styles.

## Local Workspace Library Structure

- `lib/bluetti-mqtt-node/src/index.ts`
  - Library export barrel.
- `lib/bluetti-mqtt-node/src/app/`
  - Runtime orchestration classes.
- `lib/bluetti-mqtt-node/src/bluetooth/`
  - Bluetooth sessions, transports, helper client, and manager.
- `lib/bluetti-mqtt-node/src/cli/`
  - Node CLI entrypoints.
- `lib/bluetti-mqtt-node/src/core/`
  - Core command, logger, event bus, and type definitions.
- `lib/bluetti-mqtt-node/src/devices/`
  - Device models and registry logic.
- `lib/bluetti-mqtt-node/src/mqtt/`
  - MQTT bridge implementation.
- `lib/bluetti-mqtt-node/test/`
  - Node-driven test suite.
- `lib/bluetti-mqtt-node/helper/`
  - .NET helper source used for Windows Bluetooth support.

## Naming And Organization Patterns

- Frontend page files use PascalCase names such as `Overview.tsx`.
- Store and helper files use lower-case names such as `ws.ts` and `api.ts`.
- Desktop files are grouped by platform concern under `src/bun/` and `src/mainview/`.
- The workspace library groups code by runtime concern rather than by device feature.

## Source Versus Generated Boundaries

- Tracked source:
  - `api/`
  - `dashboard/src/`
  - `dashboard/tests/`
  - `src/`
  - `mosquitto/`
- Ignored or generated:
  - `dashboard/dist/`
  - `build/`
  - `.dev-data/`
  - `api/.venv/`
  - `dashboard/test-results/`
  - `lib/bluetti-mqtt-node/dist/`
  - `lib/bluetti-mqtt-node/artifacts/`

## Important Structure Notes

- `lib/bluetti-mqtt-node/` is now tracked as a git submodule, so the app repo pins a specific commit from the library repo instead of relying on a copied local snapshot.
- The API has no internal package hierarchy yet because all tracked service logic lives in `api/main.py`.
- The repo behaves like a multi-part application, but it is not using a formal monorepo manager beyond the root workspace declaration.
