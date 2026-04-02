# Architecture

## System Shape

- The repository is organized as a pipeline:
  1. A local BLE polling layer talks to the Bluetti device.
  2. The polling layer publishes normalized state to MQTT.
  3. The FastAPI service subscribes to MQTT, stores readings in SQLite, and exposes REST plus WebSocket APIs.
  4. The React dashboard consumes the API and live WebSocket stream.
  5. The Electrobun shell orchestrates local processes and embeds the dashboard in a desktop window.

## Main Runtime Entry Points

- Desktop shell:
  - `src/bun/index.ts`
- Desktop loading view:
  - `src/mainview/index.ts`
  - `src/mainview/index.html`
- API service:
  - `api/main.py`
- Dashboard frontend:
  - `dashboard/src/main.tsx`
  - `dashboard/src/App.tsx`
- BLE/MQTT bridge package:
  - `lib/bluetti-mqtt-node/src/index.ts`
  - `lib/bluetti-mqtt-node/src/cli/bluetti-mqtt.ts`

## Desktop Orchestration Layer

- `src/bun/index.ts` is the control tower for the desktop app.
- It detects whether it is running against local source trees or a Docker-only setup.
- In local dev mode it:
  - Ensures the Mosquitto container is running
  - Creates or refreshes the API virtualenv
  - Starts Uvicorn locally
  - Starts the Vite dev server locally
  - Loads the dashboard URL into the Electrobun browser window
- It also starts the device-side BLE service asynchronously through `src/bun/bluetooth.ts`.

## Bluetooth And MQTT Bridge Architecture

- `src/bun/bluetooth.ts` is a thin adapter around the local workspace package.
- `lib/bluetti-mqtt-node/src/app/server.ts`
  - Composes the major library pieces:
    - `MultiDeviceManager`
    - `DeviceHandler`
    - `BluettiMqttBridge`
- `lib/bluetti-mqtt-node/src/app/device-handler.ts`
  - Owns the polling loop, backoff logic, command queueing, and telemetry summaries.
- `lib/bluetti-mqtt-node/src/mqtt/client.ts`
  - Converts parsed device output into MQTT topics and translates MQTT commands back into device setter commands.

## API Architecture

- `api/main.py` is a single-module service with three responsibilities mixed together:
  - SQLite access helpers
  - MQTT subscription loop
  - HTTP and WebSocket endpoints
- Data flow:
  - MQTT message arrives on `bluetti/state/#`
  - The API parses device and field from the topic
  - The reading is inserted into SQLite
  - The in-memory `latest` cache is updated
  - All connected WebSocket clients are broadcast the new reading

## Dashboard Architecture

- `dashboard/src/App.tsx`
  - Creates the React Query client
  - Owns route shell and top bar
  - Connects and disconnects the WebSocket store on mount
- `dashboard/src/store/ws.ts`
  - Manages live device state in Zustand
  - Accepts an initial snapshot and throttles incremental updates
- `dashboard/src/lib/api.ts`
  - Centralizes REST and WebSocket endpoints
  - Switches to mock data when mock mode is enabled
- Page-level architecture:
  - `dashboard/src/pages/Overview.tsx` renders the AC500-specific live summary
  - `dashboard/src/pages/Charts.tsx` uses React Query plus Recharts for history views
  - `dashboard/src/pages/RawData.tsx` renders the full field table with search

## State Boundaries

- Live state:
  - In-memory `latest` cache in `api/main.py`
  - Zustand store in `dashboard/src/store/ws.ts`
- Historical state:
  - SQLite `readings` table in `api/main.py`
- Mock state:
  - `dashboard/src/lib/mock.ts`

## Routing And Surface Boundaries

- Browser routes:
  - `/` for Overview
  - `/charts` for Charts
  - `/raw` for Raw Data
- Backend routes:
  - REST routes under the API root
  - WebSocket at `/ws`
- Container routing:
  - nginx proxies frontend-adjacent API and WS traffic in `dashboard/nginx.conf`

## Architectural Strengths

- Clear top-level separation between desktop shell, API, dashboard, and BLE library.
- Good adapter pattern at the desktop edge through `src/bun/bluetooth.ts`.
- Dashboard mock mode makes frontend work less dependent on hardware.
- BLE polling logic in `lib/bluetti-mqtt-node/src/app/device-handler.ts` has explicit backoff and telemetry tracking.

## Architectural Tradeoffs

- The Python API is compact but highly coupled because persistence, transport, caching, and HTTP surface all live in `api/main.py`.
- The dashboard has reusable helpers, but much of the UI composition remains page-local rather than feature-module based.
- The desktop bootstrap path in `src/bun/index.ts` owns many responsibilities and runtime decisions in one file.
