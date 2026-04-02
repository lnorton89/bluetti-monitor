# Codebase Stack

## Overview

- This repository is a multi-runtime monitoring stack with a desktop shell, a Python API, a React dashboard, and a local workspace BLE-to-MQTT library.
- The top-level package is defined in `package.json` and uses Bun plus Electrobun for the desktop entrypoint.
- The main tracked source areas are `api/`, `dashboard/`, and `src/`.
- A local workspace dependency lives at `lib/bluetti-mqtt-node`, but that directory is currently ignored by git via `.gitignore`.

## Root Runtime And Tooling

- `package.json`
  - Declares the root package `bluetti-monitor-desktop`.
  - Uses Bun-oriented scripts like `desktop:dev` and `desktop:start`.
  - Declares a workspace dependency on `bluetti-mqtt-node`.
- `tsconfig.json`
  - Uses `moduleResolution: "bundler"`, `strict: true`, and `noEmit: true`.
  - Only includes `src/**/*`, so the root TS config is focused on the Electrobun app.
- `electrobun.config.ts`
  - Defines the desktop app metadata and bundles `src/mainview/index.ts` as the native loading view.
- `docker-compose.yml`
  - Wires `mosquitto`, `api`, and `dashboard` services together for the containerized stack.

## Desktop Shell

- Language: TypeScript
- Runtime: Bun with Electrobun
- Key files:
  - `src/bun/index.ts`
  - `src/bun/bluetooth.ts`
  - `src/mainview/index.ts`
  - `src/mainview/index.html`
  - `src/mainview/index.css`
- Responsibilities:
  - Starts the local dev stack or Docker stack.
  - Opens a native browser window.
  - Launches the BLE-to-MQTT bridge for the AC500 device.

## API Service

- Language: Python 3.12
- Frameworks and libraries:
  - FastAPI from `api/requirements.txt`
  - Uvicorn from `api/requirements.txt`
  - aiomqtt from `api/requirements.txt`
- Key files:
  - `api/main.py`
  - `api/Dockerfile`
- Storage:
  - SQLite database file selected by `DB_PATH`
- Protocols:
  - MQTT subscription to `bluetti/state/#`
  - REST endpoints for status and history
  - WebSocket endpoint at `/ws`

## Dashboard

- Language: TypeScript
- Framework: React 19
- Bundler/dev server: Vite 8
- Router: `react-router-dom`
- Data layer:
  - `@tanstack/react-query` for HTTP-backed queries
  - Zustand for live WebSocket state in `dashboard/src/store/ws.ts`
- Visualization and UI libraries:
  - `recharts`
  - `lucide-react`
  - `axios`
  - `date-fns`
- Key files:
  - `dashboard/src/App.tsx`
  - `dashboard/src/pages/Overview.tsx`
  - `dashboard/src/pages/Charts.tsx`
  - `dashboard/src/pages/RawData.tsx`
  - `dashboard/src/lib/api.ts`
  - `dashboard/vite.config.ts`

## Workspace BLE Library

- Package: `lib/bluetti-mqtt-node/package.json`
- Language: TypeScript targeting Node.js `>=22`
- Purpose:
  - BLE polling for Bluetti devices
  - MQTT publishing and command handling
  - Windows helper integration for Bluetooth access
- Key tracked-by-reference files in the local workspace:
  - `lib/bluetti-mqtt-node/src/app/server.ts`
  - `lib/bluetti-mqtt-node/src/app/device-handler.ts`
  - `lib/bluetti-mqtt-node/src/bluetooth/helper-client.ts`
  - `lib/bluetti-mqtt-node/src/mqtt/client.ts`
  - `lib/bluetti-mqtt-node/src/cli/bluetti-mqtt.ts`
- Native helper:
  - .NET helper project at `lib/bluetti-mqtt-node/helper/BluettiMqtt.BluetoothHelper/BluettiMqtt.BluetoothHelper.csproj`

## Build And Packaging

- Docker builds:
  - `api/Dockerfile` builds the FastAPI service on `python:3.12-slim`
  - `dashboard/Dockerfile` builds the React app on `node:22-alpine` and serves it with nginx
- Desktop packaging:
  - Electrobun config in `electrobun.config.ts`
  - Bundled loading view assets copied from `src/mainview/`

## Notable Generated Or Local-Only Areas

- `build/` contains generated desktop output.
- `.dev-data/` stores local development state like the SQLite DB.
- `dashboard/dist/` is generated frontend build output.
- `api/.venv/` is a local Python virtual environment.
- `lib/bluetti-mqtt-node/dist/` and `lib/bluetti-mqtt-node/artifacts/` are generated outputs from the local library.
