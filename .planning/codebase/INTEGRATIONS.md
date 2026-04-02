# External Integrations

## Overview

- The codebase integrates Bluetooth device discovery, MQTT transport, a local SQLite database, HTTP/WS APIs, and Docker-managed infrastructure.
- Most integration glue lives in `src/bun/index.ts`, `src/bun/bluetooth.ts`, `api/main.py`, and `lib/bluetti-mqtt-node/src/mqtt/client.ts`.

## Bluetti Device Integration

- The desktop shell discovers a physical Bluetti device in `src/bun/bluetooth.ts`.
- Discovery uses the local workspace package `bluetti-mqtt-node` through imports from `src/bun/bluetooth.ts`.
- Device discovery heuristics:
  - Looks for names containing `ac500` or `bluetti`
  - Falls back to a hard-coded MAC in `src/bun/bluetooth.ts` if discovery fails
- Windows Bluetooth access depends on:
  - `lib/bluetti-mqtt-node/helper/BluettiMqtt.BluetoothHelper/BluettiMqtt.BluetoothHelper.csproj`
  - A published helper binary under `lib/bluetti-mqtt-node/artifacts/helper/win-x64/`

## MQTT Broker

- MQTT is the main transport between the BLE polling layer and the API.
- Broker:
  - Eclipse Mosquitto in `docker-compose.yml`
  - Configuration in `mosquitto/mosquitto.conf`
- Publish path:
  - `lib/bluetti-mqtt-node/src/mqtt/client.ts` publishes device state to `bluetti/state/{device}/{field}`
- Subscribe path:
  - `api/main.py` subscribes to `bluetti/state/#`
- Command path:
  - `lib/bluetti-mqtt-node/src/mqtt/client.ts` listens on `bluetti/command/#`

## API And WebSocket Surface

- HTTP API:
  - Implemented in `api/main.py`
  - Served by Uvicorn in both Docker and local dev mode
- Endpoints:
  - `/status`
  - `/status/{device}`
  - `/devices`
  - `/fields/{device}`
  - `/history/{device}/{field}`
- WebSocket:
  - `/ws` in `api/main.py`
  - Consumed by `dashboard/src/store/ws.ts`

## Dashboard To API Integration

- `dashboard/src/lib/api.ts`
  - Builds REST URLs from `VITE_API_URL` or `/api`
  - Builds WebSocket URL from `VITE_WS_URL` or `/ws`
- `dashboard/vite.config.ts`
  - Proxies `/api` to `http://localhost:8000`
  - Proxies `/ws` to `ws://localhost:8000`
- `dashboard/nginx.conf`
  - Proxies `/api/` to the `api` container
  - Proxies `/ws` to the `api` container
  - Falls back to `index.html` for React Router routes

## Data Storage

- SQLite is the only persistent application database in the tracked code.
- `api/main.py`
  - Creates the `readings` table on startup
  - Stores all MQTT updates with `device`, `field`, `value`, and `ts`
- Database path sources:
  - `/data/bluetti.db` in Docker via `docker-compose.yml`
  - `.dev-data/bluetti-dev.db` in local desktop dev mode via `src/bun/index.ts`

## Container And Process Management

- `docker-compose.yml`
  - Starts `mosquitto`, `api`, and `dashboard`
- `src/bun/index.ts`
  - In local dev mode:
    - Starts Docker only for Mosquitto
    - Starts FastAPI locally
    - Starts Vite locally
  - In non-local mode:
    - Starts the full Docker stack

## Test-Time Integration

- Playwright config in `dashboard/playwright.config.ts` starts the dashboard dev server at `127.0.0.1:4173`.
- Mock mode is enabled through `?mock=1` or `VITE_MOCK_DATA=1` in `dashboard/src/lib/api.ts`.
- Mock state and history are supplied by `dashboard/src/lib/mock.ts`, so dashboard tests can run without MQTT, the API, Docker, or hardware.

## Credentials And Secret Handling

- No tracked `.env` files are present.
- MQTT auth support exists in `lib/bluetti-mqtt-node/src/cli/bluetti-mqtt.ts` and `lib/bluetti-mqtt-node/src/mqtt/client.ts` through optional username/password fields.
- The current Docker setup in `docker-compose.yml` does not provide auth credentials for Mosquitto or the API.
